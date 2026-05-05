import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { readWavInfo } from '../scripts/lib/wav-info.mjs';
import { verifyAudioLibrary } from '../scripts/verify-audio-library.mjs';

function createPcm16Wav({ sampleRate = 16000, durationSeconds = 0.25, amplitude = 0.4 } = {}) {
  const frameCount = Math.round(sampleRate * durationSeconds);
  const dataSize = frameCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < frameCount; index += 1) {
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * index) / sampleRate) * amplitude * 32767);
    buffer.writeInt16LE(sample, 44 + index * 2);
  }

  return buffer;
}

function createHeaderOnlyWav({ sampleRate = 16000 } = {}) {
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(0, 40);
  return buffer;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function createLibraryFixture() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'audio-library-validation-'));
  const date = '2099-01-02';
  const dayDir = path.join(rootDir, 'audio/library', date);
  await mkdir(path.join(dayDir, 'generated'), { recursive: true });
  await mkdir(path.join(dayDir, 'guidance'), { recursive: true });
  await mkdir(path.join(dayDir, 'texts'), { recursive: true });

  const narrationBuffer = createPcm16Wav({ durationSeconds: 0.25, amplitude: 0.5 });
  const guidanceBuffer = createPcm16Wav({ durationSeconds: 0.4, amplitude: 0.35 });
  await writeFile(path.join(dayDir, 'generated/phase-01.wav'), narrationBuffer);
  await writeFile(path.join(dayDir, 'guidance/phase-01-guidance-01.wav'), guidanceBuffer);
  await writeFile(path.join(dayDir, 'texts/phase-01.txt'), '現在開始測試。');
  await writeFile(path.join(dayDir, 'texts/phase-01-guidance-01.txt'), '請確認音檔內容。');

  const manifest = {
    schemaVersion: 'timeline-events-v1',
    sourceDate: date,
    entries: [
      {
        id: 'phase-01',
        text: '現在開始測試。',
        textFile: `audio/library/${date}/texts/phase-01.txt`,
        audioFile: `audio/library/${date}/generated/phase-01.wav`,
        audioDurationSeconds: 0.25,
        audioSha256: sha256(narrationBuffer),
        timelineClips: {
          check: {
            id: 'check',
            text: '請確認音檔內容。',
            textFile: `audio/library/${date}/texts/phase-01-guidance-01.txt`,
            audioFile: `audio/library/${date}/guidance/phase-01-guidance-01.wav`,
            audioDurationSeconds: 0.4,
            audioSha256: sha256(guidanceBuffer),
          },
        },
      },
    ],
  };
  await writeFile(path.join(dayDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  return { rootDir, date, dayDir };
}

test('readWavInfo 會讀出 PCM16 WAV duration 與 signal stats', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'wav-info-'));
  const wavPath = path.join(rootDir, 'tone.wav');
  await writeFile(wavPath, createPcm16Wav({ sampleRate: 16000, durationSeconds: 0.5, amplitude: 0.5 }));

  const info = await readWavInfo(wavPath);

  assert.equal(info.sampleRate, 16000);
  assert.equal(info.channels, 1);
  assert.equal(info.bitsPerSample, 16);
  assert.equal(info.frameCount, 8000);
  assert.ok(Math.abs(info.durationSeconds - 0.5) < 0.001);
  assert.ok(info.peakAmplitude > 0.45);
  assert.ok(info.rmsAmplitude > 0.25);
  assert.equal(info.mostlySilent, false);
});

test('readWavInfo 會拒絕 header-only WAV，避免空音訊被當成成功', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'wav-info-empty-'));
  const wavPath = path.join(rootDir, 'empty.wav');
  await writeFile(wavPath, createHeaderOnlyWav());

  await assert.rejects(() => readWavInfo(wavPath), /zero audio frames/i);
});

test('verifyAudioLibrary 會驗證 manifest 內所有 narration 與 guidance 音檔', async () => {
  const { rootDir, date } = await createLibraryFixture();

  const result = await verifyAudioLibrary({ rootDir, date });

  assert.equal(result.status, 'pass');
  assert.equal(result.date, date);
  assert.equal(result.checkedFiles, 2);
  assert.equal(result.errors.length, 0);
  assert.equal(result.items[0].kind, 'narration');
  assert.equal(result.items[1].kind, 'timelineClip');
});

test('verifyAudioLibrary 會把 sha256 mismatch 與 duration mismatch 報成錯誤', async () => {
  const { rootDir, date, dayDir } = await createLibraryFixture();
  const manifestPath = path.join(dayDir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.entries[0].audioSha256 = '0'.repeat(64);
  manifest.entries[0].timelineClips.check.audioDurationSeconds = 9;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  const result = await verifyAudioLibrary({ rootDir, date });

  assert.equal(result.status, 'fail');
  assert.ok(result.errors.some((error) => error.code === 'sha256-mismatch'));
  assert.ok(result.errors.some((error) => error.code === 'duration-mismatch'));
});
