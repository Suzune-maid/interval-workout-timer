#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyAudioLibrary } from './verify-audio-library.mjs';
import { verifyAudioTranscripts } from './verify-audio-transcripts.mjs';

function attachStage(problem, stage) {
  return { ...problem, stage };
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

async function listManifestDates(rootDir) {
  const libraryDir = path.join(rootDir, 'audio/library');
  const entries = await readdir(libraryDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function defaultTranscriptCachePath(rootDir, date) {
  if (!date) return undefined;
  return path.join(rootDir, 'audio/library', date, 'tts-reports/asr-transcripts.json');
}

function mergeStageProblems(stages, field) {
  return stages.flatMap((stage) => (stage.result[field] ?? []).map((problem) => attachStage(problem, stage.name)));
}

export async function verifyVoiceLibrary({
  rootDir = process.cwd(),
  date,
  manifestPath,
  skipAsr = false,
  strict = false,
  verifyDeterministic = verifyAudioLibrary,
  verifyTranscripts = verifyAudioTranscripts,
  transcriptCachePath,
  writeTranscriptCache = true,
  asrLimit,
  provider = 'groq',
  groqModel,
  requestDelayMs,
  groqRetries,
  groqRetryDelayMs,
  matchOptions,
} = {}) {
  if (!date && !manifestPath) throw new Error('verifyVoiceLibrary requires either date or manifestPath');

  const resolvedRootDir = path.resolve(rootDir);
  const deterministicResult = await verifyDeterministic({ rootDir: resolvedRootDir, date, manifestPath });
  const resolvedDate = date ?? deterministicResult.date;
  const stages = [{ name: 'deterministic-audio', result: deterministicResult }];

  if (!deterministicResult.errors?.length && !skipAsr) {
    await loadLocalEnv(resolvedRootDir);
    const resolvedCachePath = transcriptCachePath
      ? path.resolve(resolvedRootDir, transcriptCachePath)
      : defaultTranscriptCachePath(resolvedRootDir, resolvedDate);

    const transcriptResult = await verifyTranscripts({
      rootDir: resolvedRootDir,
      date: resolvedDate,
      manifestPath,
      provider,
      groqModel,
      transcriptCachePath: resolvedCachePath,
      writeTranscriptCache,
      limit: asrLimit,
      requestDelayMs,
      groqRetries,
      groqRetryDelayMs,
      matchOptions,
    });
    stages.push({ name: 'asr-transcript', result: transcriptResult });
  }

  const errors = mergeStageProblems(stages, 'errors');
  const warnings = mergeStageProblems(stages, 'warnings');
  const status = errors.length || (strict && warnings.length) ? 'fail' : 'pass';

  return {
    status,
    rootDir: resolvedRootDir,
    date: resolvedDate,
    manifestPath: manifestPath ? path.resolve(manifestPath) : deterministicResult.manifestPath,
    strict,
    skippedAsr: skipAsr || Boolean(deterministicResult.errors?.length),
    errors,
    warnings,
    stages,
  };
}

function parseArgs(argv) {
  const args = { rootDir: process.cwd(), all: false, skipAsr: false, writeTranscriptCache: true };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--date') args.date = argv[++index];
    else if (arg === '--root') args.rootDir = argv[++index];
    else if (arg === '--manifest') args.manifestPath = argv[++index];
    else if (arg === '--all') args.all = true;
    else if (arg === '--skip-asr') args.skipAsr = true;
    else if (arg === '--strict') args.strict = true;
    else if (arg === '--provider') args.provider = argv[++index];
    else if (arg === '--groq-model') args.groqModel = argv[++index];
    else if (arg === '--cache') args.transcriptCachePath = argv[++index];
    else if (arg === '--no-write-cache') args.writeTranscriptCache = false;
    else if (arg === '--limit') args.asrLimit = Number.parseInt(argv[++index], 10);
    else if (arg === '--request-delay-ms') args.requestDelayMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--groq-retries') args.groqRetries = Number.parseInt(argv[++index], 10);
    else if (arg === '--groq-retry-delay-ms') args.groqRetryDelayMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log(`Usage:\n  node scripts/verify-voice-library.mjs --date YYYY-MM-DD [--root .] [--limit N]\n  node scripts/verify-voice-library.mjs --manifest path/to/manifest.json [--root .]\n  node scripts/verify-voice-library.mjs --all [--root .] [--skip-asr]\n\nRuns the full voice verification pipeline:\n  1. deterministic audio QA: manifest refs, WAV header, sha256, duration, silence, clipping\n  2. ASR transcript QA: Groq Whisper + fuzzy matching against expected text\n\nASR is skipped automatically if deterministic QA has errors. By default ASR writes a local cache to audio/library/<date>/tts-reports/asr-transcripts.json.`);
}

function printStage(stage) {
  const result = stage.result;
  const checked = result.totalFiles == null ? result.checkedFiles : `${result.checkedFiles}/${result.totalFiles}`;
  console.log(`  ${stage.name}: ${result.status.toUpperCase()} checked=${checked ?? 0} errors=${result.errors?.length ?? 0} warnings=${result.warnings?.length ?? 0}`);
}

function printResult(result) {
  console.log(`${result.status.toUpperCase()} ${result.date}: stages=${result.stages.length} errors=${result.errors.length} warnings=${result.warnings.length}${result.skippedAsr ? ' asr=skipped' : ''}`);
  for (const stage of result.stages) printStage(stage);
  for (const problem of [...result.errors, ...result.warnings]) {
    const score = problem.actual?.similarity == null ? '' : ` similarity=${problem.actual.similarity.toFixed(3)} coverage=${problem.actual.coverage.toFixed(3)}`;
    console.log(`- [${problem.severity}] ${problem.stage}/${problem.code}: ${problem.message}${score}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const rootDir = path.resolve(args.rootDir);
  if (!args.all && !args.date && !args.manifestPath) throw new Error('Pass --date, --manifest, or --all');

  const results = [];
  if (args.manifestPath) {
    results.push(await verifyVoiceLibrary({ ...args, rootDir, manifestPath: args.manifestPath }));
  } else {
    const dates = args.all ? await listManifestDates(rootDir) : [args.date];
    for (const currentDate of dates) {
      results.push(await verifyVoiceLibrary({ ...args, rootDir, date: currentDate }));
    }
  }

  for (const result of results) printResult(result);
  if (results.some((result) => result.status === 'fail')) process.exitCode = 1;
}

const executedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const modulePath = fileURLToPath(import.meta.url);
if (executedPath === modulePath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
