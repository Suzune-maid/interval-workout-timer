#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readWavInfo } from './lib/wav-info.mjs';

const DEFAULT_DURATION_WARN_TOLERANCE_SECONDS = 0.15;
const DEFAULT_DURATION_FAIL_TOLERANCE_SECONDS = 0.5;

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function resolveRepoPath(rootDir, relativePath) {
  return path.resolve(rootDir, relativePath);
}

async function sha256File(filePath) {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
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

function pushClip(items, { kind, phaseId, clipId, source }) {
  if (!source?.audioFile) return;
  items.push({
    kind,
    phaseId,
    clipId: clipId ?? source.id ?? phaseId,
    audioFile: source.audioFile,
    textFile: source.textFile,
    expectedText: source.text,
    expectedDurationSeconds: source.audioDurationSeconds,
    expectedSha256: source.audioSha256,
    fallback: Boolean(source.fallback),
  });
}

export function collectManifestAudioItems(manifest) {
  const items = [];

  for (const entry of manifest.entries ?? []) {
    pushClip(items, {
      kind: 'narration',
      phaseId: entry.id,
      clipId: entry.id,
      source: entry,
    });

    if (isObject(entry.timelineClips)) {
      for (const [clipId, clip] of Object.entries(entry.timelineClips)) {
        pushClip(items, {
          kind: 'timelineClip',
          phaseId: entry.id,
          clipId,
          source: clip,
        });
      }
    }

    if (isObject(entry.countdownGuidance?.clips)) {
      for (const [clipId, clip] of Object.entries(entry.countdownGuidance.clips)) {
        pushClip(items, {
          kind: 'countdownGuidance',
          phaseId: entry.id,
          clipId,
          source: clip,
        });
      }
    }
  }

  return items;
}

function addProblem(collection, problem) {
  collection.push(problem);
}

async function verifyTextFile({ rootDir, item, errors }) {
  if (!item.textFile) return;
  const textPath = resolveRepoPath(rootDir, item.textFile);
  if (!(await pathExists(textPath))) {
    addProblem(errors, {
      code: 'missing-text-file',
      severity: 'error',
      item,
      message: `Missing transcript file: ${item.textFile}`,
    });
  }
}

function addSignalWarnings({ item, info, warnings, errors }) {
  if (info.mostlySilent) {
    addProblem(errors, {
      code: 'mostly-silent',
      severity: 'error',
      item,
      message: `Audio is mostly silent: ${item.audioFile}`,
      actual: { signalRatio: info.signalRatio, rmsAmplitude: info.rmsAmplitude },
    });
  }

  if (info.leadingSilenceSeconds > 0.5) {
    addProblem(warnings, {
      code: 'leading-silence',
      severity: 'warning',
      item,
      message: `Audio has long leading silence: ${item.audioFile}`,
      actual: info.leadingSilenceSeconds,
    });
  }

  if (info.trailingSilenceSeconds > 0.7) {
    addProblem(warnings, {
      code: 'trailing-silence',
      severity: 'warning',
      item,
      message: `Audio has long trailing silence: ${item.audioFile}`,
      actual: info.trailingSilenceSeconds,
    });
  }

  if (info.clippedSampleRatio > 0.001) {
    addProblem(warnings, {
      code: 'clipping',
      severity: 'warning',
      item,
      message: `Audio may be clipped: ${item.audioFile}`,
      actual: info.clippedSampleRatio,
    });
  }
}

async function verifyItem({ rootDir, item, options }) {
  const errors = [];
  const warnings = [];
  const audioPath = resolveRepoPath(rootDir, item.audioFile);

  await verifyTextFile({ rootDir, item, errors });

  if (!(await pathExists(audioPath))) {
    addProblem(errors, {
      code: 'missing-audio-file',
      severity: 'error',
      item,
      message: `Missing audio file: ${item.audioFile}`,
    });
    return { ...item, status: 'fail', errors, warnings };
  }

  let info;
  try {
    info = await readWavInfo(audioPath);
  } catch (error) {
    addProblem(errors, {
      code: 'invalid-wav',
      severity: 'error',
      item,
      message: error.message,
    });
    return { ...item, status: 'fail', errors, warnings };
  }

  if (item.expectedSha256) {
    const actualSha256 = await sha256File(audioPath);
    if (actualSha256 !== item.expectedSha256) {
      addProblem(errors, {
        code: 'sha256-mismatch',
        severity: 'error',
        item,
        message: `SHA256 mismatch: ${item.audioFile}`,
        expected: item.expectedSha256,
        actual: actualSha256,
      });
    }
  }

  if (Number.isFinite(item.expectedDurationSeconds)) {
    const diff = Math.abs(info.durationSeconds - item.expectedDurationSeconds);
    const durationProblem = {
      item,
      expected: item.expectedDurationSeconds,
      actual: info.durationSeconds,
      diff,
    };

    if (diff > options.durationFailToleranceSeconds) {
      addProblem(errors, {
        code: 'duration-mismatch',
        severity: 'error',
        message: `Duration mismatch: ${item.audioFile}`,
        ...durationProblem,
      });
    } else if (diff > options.durationWarnToleranceSeconds) {
      addProblem(warnings, {
        code: 'duration-warning',
        severity: 'warning',
        message: `Duration differs from manifest: ${item.audioFile}`,
        ...durationProblem,
      });
    }
  }

  addSignalWarnings({ item, info, warnings, errors });

  return {
    ...item,
    status: errors.length ? 'fail' : 'pass',
    actualDurationSeconds: info.durationSeconds,
    wav: info,
    errors,
    warnings,
  };
}

export async function verifyAudioLibrary({
  rootDir = process.cwd(),
  date,
  manifestPath,
  durationWarnToleranceSeconds = DEFAULT_DURATION_WARN_TOLERANCE_SECONDS,
  durationFailToleranceSeconds = DEFAULT_DURATION_FAIL_TOLERANCE_SECONDS,
} = {}) {
  if (!date && !manifestPath) {
    throw new Error('verifyAudioLibrary requires either date or manifestPath');
  }

  const resolvedRootDir = path.resolve(rootDir);
  const resolvedManifestPath = manifestPath
    ? path.resolve(manifestPath)
    : path.join(resolvedRootDir, 'audio/library', date, 'manifest.json');
  const manifest = JSON.parse(await readFile(resolvedManifestPath, 'utf8'));
  const resolvedDate = date ?? manifest.sourceDate ?? path.basename(path.dirname(resolvedManifestPath));
  const sourceItems = collectManifestAudioItems(manifest);
  const options = { durationWarnToleranceSeconds, durationFailToleranceSeconds };
  const items = [];

  for (const item of sourceItems) {
    items.push(await verifyItem({ rootDir: resolvedRootDir, item, options }));
  }

  const errors = items.flatMap((item) => item.errors ?? []);
  const warnings = items.flatMap((item) => item.warnings ?? []);

  return {
    status: errors.length ? 'fail' : 'pass',
    rootDir: resolvedRootDir,
    date: resolvedDate,
    manifestPath: resolvedManifestPath,
    checkedFiles: items.length,
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
    all: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--date') args.date = argv[++index];
    else if (arg === '--root') args.rootDir = argv[++index];
    else if (arg === '--manifest') args.manifestPath = argv[++index];
    else if (arg === '--all') args.all = true;
    else if (arg === '--strict') args.strict = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage:\n  node scripts/verify-audio-library.mjs --date YYYY-MM-DD [--root .]\n  node scripts/verify-audio-library.mjs --manifest path/to/manifest.json [--root .]\n  node scripts/verify-audio-library.mjs --all [--root .]\n\nChecks manifest references, WAV headers, sha256, duration metadata, silence, and clipping.`);
}

function printResult(result) {
  console.log(`${result.status.toUpperCase()} ${result.date}: checked=${result.checkedFiles} errors=${result.errors.length} warnings=${result.warnings.length}`);
  for (const problem of [...result.errors, ...result.warnings]) {
    console.log(`- [${problem.severity}] ${problem.code}: ${problem.message}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const rootDir = path.resolve(args.rootDir);
  const dates = args.all ? await listManifestDates(rootDir) : [args.date];
  if (!args.all && !args.date && !args.manifestPath) {
    throw new Error('Pass --date, --manifest, or --all');
  }

  const results = [];
  if (args.manifestPath) {
    results.push(await verifyAudioLibrary({ rootDir, manifestPath: args.manifestPath }));
  } else {
    for (const date of dates) {
      results.push(await verifyAudioLibrary({ rootDir, date }));
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
