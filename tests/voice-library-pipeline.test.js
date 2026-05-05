import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyVoiceLibrary } from '../scripts/verify-voice-library.mjs';

test('verifyVoiceLibrary 會先跑 deterministic QA，通過後才跑 ASR fuzzy transcript QA', async () => {
  const calls = [];
  const result = await verifyVoiceLibrary({
    rootDir: '/repo',
    date: '2099-03-04',
    verifyDeterministic: async (options) => {
      calls.push(['deterministic', options.date, options.rootDir]);
      return {
        status: 'pass',
        date: options.date,
        checkedFiles: 2,
        errors: [],
        warnings: [{ severity: 'warning', code: 'leading-silence', message: 'leading silence' }],
      };
    },
    verifyTranscripts: async (options) => {
      calls.push(['asr', options.date, options.rootDir, options.transcriptCachePath, options.writeTranscriptCache]);
      return {
        status: 'pass',
        date: options.date,
        checkedFiles: 2,
        totalFiles: 2,
        errors: [],
        warnings: [],
      };
    },
  });

  assert.equal(result.status, 'pass');
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 1);
  assert.deepEqual(calls, [
    ['deterministic', '2099-03-04', '/repo'],
    [
      'asr',
      '2099-03-04',
      '/repo',
      '/repo/audio/library/2099-03-04/tts-reports/asr-transcripts.json',
      true,
    ],
  ]);
  assert.deepEqual(result.stages.map((stage) => stage.name), ['deterministic-audio', 'asr-transcript']);
});

test('verifyVoiceLibrary 在 deterministic QA 有 error 時會短路，不浪費 ASR request', async () => {
  let asrCalled = false;
  const result = await verifyVoiceLibrary({
    rootDir: '/repo',
    date: '2099-03-04',
    verifyDeterministic: async () => ({
      status: 'fail',
      date: '2099-03-04',
      checkedFiles: 1,
      errors: [{ severity: 'error', code: 'sha256-mismatch', message: 'sha mismatch' }],
      warnings: [],
    }),
    verifyTranscripts: async () => {
      asrCalled = true;
      return { status: 'pass', errors: [], warnings: [] };
    },
  });

  assert.equal(result.status, 'fail');
  assert.equal(asrCalled, false);
  assert.deepEqual(result.stages.map((stage) => stage.name), ['deterministic-audio']);
  assert.equal(result.errors[0].code, 'sha256-mismatch');
});

test('verifyVoiceLibrary 會把 ASR mismatch 併入整體結果', async () => {
  const result = await verifyVoiceLibrary({
    rootDir: '/repo',
    date: '2099-03-04',
    verifyDeterministic: async () => ({
      status: 'pass',
      date: '2099-03-04',
      checkedFiles: 2,
      errors: [],
      warnings: [],
    }),
    verifyTranscripts: async () => ({
      status: 'fail',
      date: '2099-03-04',
      checkedFiles: 2,
      totalFiles: 2,
      errors: [{ severity: 'error', code: 'transcript-content-mismatch', message: 'content mismatch' }],
      warnings: [{ severity: 'warning', code: 'transcript-low-confidence', message: 'low confidence' }],
    }),
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].stage, 'asr-transcript');
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].stage, 'asr-transcript');
});
