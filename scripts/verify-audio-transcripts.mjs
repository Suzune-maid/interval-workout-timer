#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectManifestAudioItems } from './verify-audio-library.mjs';
import { compareTranscriptToExpected } from './lib/transcript-match.mjs';

const DEFAULT_GROQ_MODEL = 'whisper-large-v3-turbo';
const DEFAULT_GROQ_REQUEST_DELAY_MS = 3200;
const DEFAULT_GROQ_RETRIES = 3;
const DEFAULT_GROQ_RETRY_DELAY_MS = 65000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function resolveRepoPath(rootDir, relativePath) {
  return path.resolve(rootDir, relativePath);
}

function parseDotEnv(content) {
  const values = {};
  for (const rawLine of String(content).replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [rawKey, ...rest] = line.split('=');
    const key = rawKey.trim().replace(/^\uFEFF/, '');
    let value = rest.join('=').trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function loadLocalEnv(rootDir) {
  const candidates = [path.join(rootDir, '.env'), path.join(process.env.HOME ?? '', '.hermes/.env')];
  for (const candidate of candidates) {
    if (!candidate || !(await pathExists(candidate))) continue;
    const parsed = parseDotEnv(await readFile(candidate, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (value && !process.env[key]) process.env[key] = value;
    }
  }
}

async function readJsonIfExists(filePath) {
  if (!filePath || !(await pathExists(filePath))) return {};
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function transcribeWithGroq(
  audioPath,
  {
    model = DEFAULT_GROQ_MODEL,
    apiKey = process.env.GROQ_API_KEY,
    retries = DEFAULT_GROQ_RETRIES,
    retryDelayMs = DEFAULT_GROQ_RETRY_DELAY_MS,
    sleepFn = sleep,
  } = {},
) {
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const buffer = await readFile(audioPath);

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const formData = new FormData();
    formData.set('model', model);
    formData.set('response_format', 'text');
    formData.set('file', new Blob([buffer]), path.basename(audioPath));

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const text = await response.text();
    if (response.ok) return text.trim();

    lastError = new Error(`Groq ASR failed: HTTP ${response.status} ${text.slice(0, 200)}`);
    if (response.status !== 429 || attempt >= retries) break;

    const retryAfterSeconds = Number.parseFloat(response.headers.get('retry-after') ?? '');
    const waitMs = Number.isFinite(retryAfterSeconds) ? Math.ceil(retryAfterSeconds * 1000) : retryDelayMs;
    await sleepFn(waitMs);
  }

  throw lastError;
}

async function waitForGroqSlot({ rateLimiter, sleepFn = sleep } = {}) {
  if (!rateLimiter?.requestDelayMs) return;
  const now = Date.now();
  const elapsedMs = now - (rateLimiter.lastRequestAt ?? 0);
  const waitMs = Math.max(0, rateLimiter.requestDelayMs - elapsedMs);
  if (waitMs > 0) await sleepFn(waitMs);
  rateLimiter.lastRequestAt = Date.now();
}

function itemCacheKey(item) {
  return item.audioFile;
}

async function defaultTranscribeAudio(
  item,
  {
    rootDir,
    provider,
    groqModel,
    cache,
    groqRetries,
    groqRetryDelayMs,
    rateLimiter,
    sleepFn,
  } = {},
) {
  const cacheKey = itemCacheKey(item);
  if (cache && typeof cache[cacheKey] === 'string') return cache[cacheKey];

  const audioPath = resolveRepoPath(rootDir, item.audioFile);
  if (provider !== 'groq') throw new Error(`Unsupported ASR provider: ${provider}`);
  await waitForGroqSlot({ rateLimiter, sleepFn });
  return transcribeWithGroq(audioPath, {
    model: groqModel,
    retries: groqRetries,
    retryDelayMs: groqRetryDelayMs,
    sleepFn,
  });
}

async function verifyItem({
  rootDir,
  item,
  transcribeAudio,
  matchOptions,
  provider,
  groqModel,
  groqRetries,
  groqRetryDelayMs,
  rateLimiter,
  sleepFn,
  cache,
  updateCache,
}) {
  const errors = [];
  const warnings = [];
  const audioPath = resolveRepoPath(rootDir, item.audioFile);

  if (!(await pathExists(audioPath))) {
    errors.push({
      code: 'missing-audio-file',
      severity: 'error',
      item,
      message: `Missing audio file: ${item.audioFile}`,
    });
    return { ...item, status: 'fail', errors, warnings };
  }

  const expectedText = item.expectedText ?? (item.textFile ? await readFile(resolveRepoPath(rootDir, item.textFile), 'utf8') : '');
  if (!expectedText.trim()) {
    warnings.push({
      code: 'missing-expected-text',
      severity: 'warning',
      item,
      message: `No expected text for ${item.audioFile}`,
    });
    return { ...item, status: 'pass', expectedText, transcript: '', errors, warnings };
  }

  let transcript;
  try {
    transcript = await transcribeAudio(item, {
      rootDir,
      provider,
      groqModel,
      groqRetries,
      groqRetryDelayMs,
      rateLimiter,
      sleepFn,
      cache,
    });
    if (cache && updateCache) cache[itemCacheKey(item)] = transcript;
  } catch (error) {
    errors.push({
      code: 'asr-transcription-failed',
      severity: 'error',
      item,
      message: `ASR failed for ${item.audioFile}: ${error.message}`,
    });
    return { ...item, status: 'fail', expectedText, transcript: '', errors, warnings };
  }

  const match = compareTranscriptToExpected({ expected: expectedText, actual: transcript, ...matchOptions });
  if (match.status === 'fail') {
    errors.push({
      code: match.code,
      severity: 'error',
      item,
      message: `Transcript content mismatch: ${item.audioFile}`,
      actual: {
        similarity: match.similarity,
        coverage: match.coverage,
        transcriptPreview: transcript.slice(0, 120),
      },
    });
  } else if (match.status === 'warn') {
    warnings.push({
      code: match.code,
      severity: 'warning',
      item,
      message: `Transcript content is low-confidence but acceptable: ${item.audioFile}`,
      actual: {
        similarity: match.similarity,
        coverage: match.coverage,
        transcriptPreview: transcript.slice(0, 120),
      },
    });
  }

  return {
    ...item,
    status: errors.length ? 'fail' : 'pass',
    expectedText,
    transcript,
    match,
    errors,
    warnings,
  };
}

export async function verifyAudioTranscripts({
  rootDir = process.cwd(),
  date,
  manifestPath,
  provider = 'groq',
  groqModel = process.env.STT_GROQ_MODEL || DEFAULT_GROQ_MODEL,
  transcribeAudio,
  transcriptCachePath,
  writeTranscriptCache = false,
  limit,
  matchOptions = {},
  groqRetries = DEFAULT_GROQ_RETRIES,
  groqRetryDelayMs = DEFAULT_GROQ_RETRY_DELAY_MS,
  requestDelayMs = 0,
  sleepFn = sleep,
} = {}) {
  if (!date && !manifestPath) throw new Error('verifyAudioTranscripts requires either date or manifestPath');

  const resolvedRootDir = path.resolve(rootDir);
  const resolvedManifestPath = manifestPath
    ? path.resolve(manifestPath)
    : path.join(resolvedRootDir, 'audio/library', date, 'manifest.json');
  const manifest = JSON.parse(await readFile(resolvedManifestPath, 'utf8'));
  const resolvedDate = date ?? manifest.sourceDate ?? path.basename(path.dirname(resolvedManifestPath));
  const allItems = collectManifestAudioItems(manifest);
  const sourceItems = Number.isFinite(limit) ? allItems.slice(0, limit) : allItems;
  const cache = await readJsonIfExists(transcriptCachePath);
  const asr = transcribeAudio ?? defaultTranscribeAudio;
  const rateLimiter = { requestDelayMs, lastRequestAt: 0 };

  const items = [];
  for (const item of sourceItems) {
    items.push(await verifyItem({
      rootDir: resolvedRootDir,
      item,
      transcribeAudio: asr,
      matchOptions,
      provider,
      groqModel,
      groqRetries,
      groqRetryDelayMs,
      rateLimiter,
      sleepFn,
      cache,
      updateCache: Boolean(transcriptCachePath),
    }));
  }

  if (transcriptCachePath && writeTranscriptCache) await writeJson(transcriptCachePath, cache);

  const errors = items.flatMap((item) => item.errors ?? []);
  const warnings = items.flatMap((item) => item.warnings ?? []);

  return {
    status: errors.length ? 'fail' : 'pass',
    rootDir: resolvedRootDir,
    date: resolvedDate,
    manifestPath: resolvedManifestPath,
    provider,
    groqModel,
    checkedFiles: items.length,
    totalFiles: allItems.length,
    errors,
    warnings,
    items,
  };
}

async function listManifestDates(rootDir) {
  const libraryDir = path.join(rootDir, 'audio/library');
  const entries = await readdir(libraryDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function parseArgs(argv) {
  const args = {
    rootDir: process.cwd(),
    provider: 'groq',
    all: false,
    requestDelayMs: DEFAULT_GROQ_REQUEST_DELAY_MS,
    groqRetries: DEFAULT_GROQ_RETRIES,
    groqRetryDelayMs: DEFAULT_GROQ_RETRY_DELAY_MS,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--date') args.date = argv[++index];
    else if (arg === '--root') args.rootDir = argv[++index];
    else if (arg === '--manifest') args.manifestPath = argv[++index];
    else if (arg === '--provider') args.provider = argv[++index];
    else if (arg === '--groq-model') args.groqModel = argv[++index];
    else if (arg === '--cache') args.transcriptCachePath = argv[++index];
    else if (arg === '--write-cache') args.writeTranscriptCache = true;
    else if (arg === '--limit') args.limit = Number.parseInt(argv[++index], 10);
    else if (arg === '--request-delay-ms') args.requestDelayMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--groq-retries') args.groqRetries = Number.parseInt(argv[++index], 10);
    else if (arg === '--groq-retry-delay-ms') args.groqRetryDelayMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--all') args.all = true;
    else if (arg === '--strict') args.strict = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log(`Usage:\n  node scripts/verify-audio-transcripts.mjs --date YYYY-MM-DD [--root .] [--limit N]\n  node scripts/verify-audio-transcripts.mjs --manifest path/to/manifest.json [--root .]\n  node scripts/verify-audio-transcripts.mjs --all [--root .]\n\nUses fuzzy transcript matching; punctuation, whitespace, common simplified/traditional differences, number spellings, and minor ASR/TTS drift are tolerated. Set GROQ_API_KEY in .env for --provider groq. The CLI paces uncached Groq requests with --request-delay-ms 3200 by default to avoid the 20 RPM limit.`);
}

function printResult(result) {
  console.log(`${result.status.toUpperCase()} ${result.date}: checked=${result.checkedFiles}/${result.totalFiles} errors=${result.errors.length} warnings=${result.warnings.length} provider=${result.provider}`);
  for (const problem of [...result.errors, ...result.warnings]) {
    const score = problem.actual?.similarity == null ? '' : ` similarity=${problem.actual.similarity.toFixed(3)} coverage=${problem.actual.coverage.toFixed(3)}`;
    console.log(`- [${problem.severity}] ${problem.code}: ${problem.message}${score}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const rootDir = path.resolve(args.rootDir);
  await loadLocalEnv(rootDir);

  const dates = args.all ? await listManifestDates(rootDir) : [args.date];
  if (!args.all && !args.date && !args.manifestPath) throw new Error('Pass --date, --manifest, or --all');

  const results = [];
  if (args.manifestPath) {
    results.push(await verifyAudioTranscripts({ ...args, rootDir, manifestPath: args.manifestPath }));
  } else {
    for (const currentDate of dates) {
      results.push(await verifyAudioTranscripts({ ...args, rootDir, date: currentDate }));
    }
  }

  for (const result of results) printResult(result);
  const hasErrors = results.some((result) => result.errors.length > 0);
  const hasStrictWarnings = args.strict && results.some((result) => result.warnings.length > 0);
  if (hasErrors || hasStrictWarnings) process.exitCode = 1;
}

const executedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const modulePath = fileURLToPath(import.meta.url);
if (executedPath === modulePath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
