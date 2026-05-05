import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  compareTranscriptToExpected,
  normalizeTranscriptText,
} from '../scripts/lib/transcript-match.mjs';
import { verifyAudioTranscripts } from '../scripts/verify-audio-transcripts.mjs';

async function createTranscriptFixture() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'audio-transcript-validation-'));
  const date = '2099-02-03';
  const dayDir = path.join(rootDir, 'audio/library', date);
  await mkdir(path.join(dayDir, 'generated'), { recursive: true });
  await mkdir(path.join(dayDir, 'guidance'), { recursive: true });
  await mkdir(path.join(dayDir, 'texts'), { recursive: true });

  await writeFile(path.join(dayDir, 'generated/phase-01.wav'), Buffer.from('fake wav for injected asr'));
  await writeFile(path.join(dayDir, 'guidance/phase-01-guidance-01.wav'), Buffer.from('fake wav for injected asr'));
  await writeFile(path.join(dayDir, 'texts/phase-01.txt'), '現在開始：準備期。這一段約 2 分鐘。');
  await writeFile(path.join(dayDir, 'texts/phase-01-guidance-01.txt'), '吸氣時掃描骨盆底，吐氣時把多餘的緊繃放掉。');

  const manifest = {
    schemaVersion: 'timeline-events-v1',
    sourceDate: date,
    entries: [
      {
        id: 'phase-01',
        text: '現在開始：準備期。這一段約 2 分鐘。',
        textFile: `audio/library/${date}/texts/phase-01.txt`,
        audioFile: `audio/library/${date}/generated/phase-01.wav`,
        timelineClips: {
          breath: {
            id: 'breath',
            text: '吸氣時掃描骨盆底，吐氣時把多餘的緊繃放掉。',
            textFile: `audio/library/${date}/texts/phase-01-guidance-01.txt`,
            audioFile: `audio/library/${date}/guidance/phase-01-guidance-01.wav`,
          },
        },
      },
    ],
  };
  await writeFile(path.join(dayDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { rootDir, date };
}

test('normalizeTranscriptText 會移除標點空白並把常見簡體 ASR 輸出轉成可比對形式', () => {
  assert.equal(
    normalizeTranscriptText('吸气时，扫描骨盆底；吐气时把多余的紧绷放掉。'),
    '吸氣時掃描骨盆底吐氣時把多餘的緊繃放掉',
  );
  assert.equal(normalizeTranscriptText('这一段约2分钟'), '這一段約二分鐘');
  assert.equal(
    normalizeTranscriptText('一摇往七分冲的感觉，就先放慢呼吸、放软骨喷底。'),
    '一有往七分衝的感覺就先放慢呼吸放軟骨盆底',
  );
  assert.equal(
    normalizeTranscriptText('感受可控高兴奋，不急着充现。'),
    '感受可控高興奮不急著衝線',
  );
  assert.equal(normalizeTranscriptText('额头和下巴放松'), '額頭和下巴放鬆');
});

test('compareTranscriptToExpected 接受標點與簡繁差異，不要求文字完全相等', () => {
  const result = compareTranscriptToExpected({
    expected: '吸氣時掃描骨盆底，吐氣時把多餘的緊繃放掉。',
    actual: '吸气时扫描骨盆底吐气时把多余的紧绷放掉',
  });

  assert.equal(result.status, 'pass');
  assert.equal(result.exact, false);
  assert.ok(result.similarity >= 0.98);
  assert.ok(result.coverage >= 0.98);
});

test('compareTranscriptToExpected 會把截斷或漏半句判定為 error', () => {
  const result = compareTranscriptToExpected({
    expected: '吸氣時掃描骨盆底，吐氣時把多餘的緊繃放掉。',
    actual: '吸氣時掃描骨盆底',
  });

  assert.equal(result.status, 'fail');
  assert.ok(result.coverage < 0.75);
  assert.equal(result.code, 'transcript-content-mismatch');
});

test('verifyAudioTranscripts 會用注入的 ASR 結果比對 manifest 音檔內容', async () => {
  const { rootDir, date } = await createTranscriptFixture();
  const result = await verifyAudioTranscripts({
    rootDir,
    date,
    transcribeAudio: async (item) => {
      if (item.clipId === 'breath') {
        return '吸气时扫描骨盆底吐气时把多余的紧绷放掉';
      }
      return '現在開始準備期這一段約二分鐘';
    },
  });

  assert.equal(result.status, 'pass');
  assert.equal(result.checkedFiles, 2);
  assert.equal(result.errors.length, 0);
  assert.equal(result.items.find((item) => item.clipId === 'breath').match.status, 'pass');
});

test('verifyAudioTranscripts 會回報 ASR 截斷造成的內容 mismatch，但不是完全字串比對', async () => {
  const { rootDir, date } = await createTranscriptFixture();
  const result = await verifyAudioTranscripts({
    rootDir,
    date,
    transcribeAudio: async (item) => {
      if (item.clipId === 'breath') return '吸氣時掃描骨盆底';
      return item.expectedText;
    },
  });

  assert.equal(result.status, 'fail');
  assert.ok(result.errors.some((error) => error.code === 'transcript-content-mismatch'));
});
