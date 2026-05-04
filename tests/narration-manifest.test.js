import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeNarrationManifest } from '../narration-manifest.js';

const LIBRARY_INDEX_PATH = new URL('../audio/library/index.json', import.meta.url);
const GUIDED_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-04-27/manifest.json', import.meta.url);
const FORMAL_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-05-01/manifest.json', import.meta.url);
const W2D1_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-05-04/manifest.json', import.meta.url);

async function readJson(url) {
  const raw = await readFile(url, 'utf8');
  return JSON.parse(raw);
}

function findEntry(document, id) {
  return document.entries.find((item) => item.id === id);
}

test('2026-05-04 library manifest 會以新日期 metadata 指向 2026-04-27 的凱格爾普通日資產', async () => {
  const [raw, libraryIndex] = await Promise.all([
    readJson(W2D1_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);
  const phase01 = findEntry(raw, 'phase-01');
  const phase02 = findEntry(raw, 'phase-02');
  const phase03 = findEntry(raw, 'phase-03');
  const phase04 = findEntry(raw, 'phase-04');
  const phase05 = findEntry(raw, 'phase-05');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-05-04');

  assert.equal(raw.sourceDate, '2026-05-04');
  assert.equal(raw.assetSourceDay, '2026-04-27');
  assert.equal(raw.weekNumber, 2);
  assert.equal(raw.dayNumber, 1);
  assert.equal(raw.weekdayLabel, '一');
  assert.equal(raw.sessionTitle, '凱格爾普通日');
  assert.equal(raw.entries.length, 5);

  assert.deepEqual(
    raw.entries.map((item) => item.phaseLabel),
    ['準備放鬆', '慢速凱格爾（10 次）', '快速凱格爾（10 次）', '反向凱格爾', '收尾掃描'],
  );
  assert.deepEqual(
    raw.entries.map((item) => item.durationSeconds),
    [60, 90, 20, 120, 60],
  );

  assert.equal(phase01.audioFile, 'audio/library/2026-04-27/generated/phase-01.wav');
  assert.equal(phase02.audioFile, 'audio/library/2026-04-27/generated/phase-02.wav');
  assert.equal(phase03.audioFile, 'audio/library/2026-04-27/generated/phase-03.wav');
  assert.equal(phase04.audioFile, 'audio/library/2026-04-27/generated/phase-04.wav');
  assert.equal(phase05.audioFile, 'audio/library/2026-04-27/generated/phase-05.wav');

  assert.equal(phase01.textFile, 'audio/library/2026-04-27/texts/phase-01.txt');
  assert.equal(phase02.timelineClips.contract?.audioFile, 'audio/library/2026-04-27/guidance/phase-02-contract.wav');
  assert.equal(phase03.timelineClips.release?.audioFile, 'audio/library/2026-04-27/guidance/phase-03-release.wav');
  assert.equal(phase04.timelineClips.inhaleDrop?.audioFile, 'audio/library/2026-04-27/guidance/phase-04-inhale-drop.wav');
  assert.equal(phase05.timelineClips.pelvicFloorSoft?.audioFile, 'audio/library/2026-04-27/guidance/phase-05-pelvic-floor-soft.wav');

  assert.deepEqual(phase01.timelineEvents.map((item) => item.startAtSecond), [0, 4, 10, 14, 20, 24, 30, 34, 40, 44, 50, 54]);
  assert.deepEqual(phase02.timelineEvents.map((item) => item.startAtSecond).slice(0, 6), [0, 3, 9, 12, 18, 21]);
  assert.deepEqual(phase03.timelineEvents.map((item) => item.startAtSecond).slice(0, 6), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(phase04.timelineEvents.map((item) => item.startAtSecond).slice(0, 6), [0, 4, 12, 16, 24, 28]);
  assert.deepEqual(phase05.timelineEvents.map((item) => item.startAtSecond), [0, 12, 24, 36, 48]);

  assert.equal(phase01.countdownGuidance?.summary, '4 秒吸氣、6 秒吐氣，共 6 輪');
  assert.equal(phase02.countdownGuidance?.summary, '3 秒收、6 秒放，共 10 次');
  assert.equal(phase03.countdownGuidance?.summary, '1 秒點收、1 秒全放，共 10 次');
  assert.equal(phase04.countdownGuidance?.summary, '4 秒吸氣下沉、8 秒吐氣保持鬆，共 10 輪');
  assert.equal(phase05.countdownGuidance?.summary, '每 12 秒帶一次放鬆檢查，共 5 個提示');

  assert.ok(libraryItem, 'library index 應包含 2026-05-04 條目');
  assert.equal(libraryItem.sourceDate, '2026-05-04');
  assert.equal(libraryItem.weekNumber, 2);
  assert.equal(libraryItem.dayNumber, 1);
  assert.equal(libraryItem.sessionTitle, '凱格爾普通日');
  assert.equal(libraryItem.manifestFile, 'audio/library/2026-05-04/manifest.json');
  assert.equal(libraryItem.entryCount, 5);
});

test('2026-05-01 library manifest 會保留每段 countdown 開場的分數判斷 guidance', async () => {
  const raw = await readJson(FORMAL_LIBRARY_MANIFEST_PATH);
  const phase01 = findEntry(raw, 'phase-01');
  const phase02 = findEntry(raw, 'phase-02');
  const phase03 = findEntry(raw, 'phase-03');
  const phase04 = findEntry(raw, 'phase-04');
  const phase05 = findEntry(raw, 'phase-05');

  assert.equal(raw.schemaVersion, 'timeline-events-v1');
  assert.equal(raw.sourceDate, '2026-05-01');
  assert.equal(raw.sessionTitle, '正式訓練日');
  assert.equal(raw.entries.length, 5);

  assert.deepEqual(
    raw.entries.map((item) => item.phaseLabel),
    ['準備期', '第 1 回：到 5 分停', '第 2 回：到 6 分停', '第 3 回：接近 7 分立刻停', '收尾放鬆'],
  );

  assert.equal(phase01.audioFile, 'audio/library/2026-04-28/generated/phase-01.wav');
  assert.equal(phase02.audioFile, 'audio/library/2026-04-28/generated/phase-02.wav');
  assert.equal(phase03.audioFile, 'audio/library/2026-04-28/generated/phase-03.wav');
  assert.equal(phase04.audioFile, 'audio/library/2026-04-28/generated/phase-04.wav');
  assert.equal(phase05.audioFile, 'audio/library/2026-04-28/generated/phase-05.wav');

  assert.deepEqual(phase01.timelineEvents.map((item) => item.startAtSecond), [4, 25, 55, 85]);
  assert.deepEqual(phase02.timelineEvents.map((item) => item.startAtSecond), [4, 45, 75, 105, 135, 160]);
  assert.deepEqual(phase03.timelineEvents.map((item) => item.startAtSecond), [4, 55, 90, 130, 170, 210]);
  assert.deepEqual(phase04.timelineEvents.map((item) => item.startAtSecond), [4, 75, 130, 190]);
  assert.deepEqual(phase05.timelineEvents.map((item) => item.startAtSecond), [4]);

  assert.equal(phase01.timelineEvents[0].clipId, 'score-4-check');
  assert.equal(phase02.timelineEvents[0].clipId, 'score-5-check');
  assert.equal(phase03.timelineEvents[0].clipId, 'score-6-check');
  assert.equal(phase04.timelineEvents[0].clipId, 'score-7-edge');
  assert.equal(phase05.timelineEvents[0].clipId, 'settle-below-four');

  assert.equal(phase01.timelineClips['score-4-check']?.text, '先找 4 分附近：有感覺，但停一下就會退回，不會自己一路往上衝。');
  assert.equal(phase02.timelineClips['score-5-check']?.text, '這一回先找 5 分：興奮已經很清楚，但你一停下來，還不會自己往上衝到失控。');
  assert.equal(phase03.timelineClips['score-6-check']?.text, '這一回要找 6 分：快感已經穩定而明顯，但你還能說慢就慢、說停就停。');
  assert.equal(phase04.timelineClips['score-7-edge']?.text, '這一回接近 7 分就停：如果開始出現「再一下就好」的急迫感，就已經到邊界了。');
  assert.equal(phase05.timelineClips['settle-below-four']?.text, '現在不是往上走，是往下退；讓分數慢慢回到 4 分以下，呼吸重新放穩。');

  assert.equal(phase01.timelineClips['score-4-check']?.audioFile, 'audio/library/2026-05-01/guidance/phase-01-guidance-01.wav');
  assert.equal(phase02.timelineClips['score-5-check']?.audioFile, 'audio/library/2026-05-01/guidance/phase-02-guidance-01.wav');
  assert.equal(phase03.timelineClips['score-6-check']?.audioFile, 'audio/library/2026-05-01/guidance/phase-03-guidance-01.wav');
  assert.equal(phase04.timelineClips['score-7-edge']?.audioFile, 'audio/library/2026-05-01/guidance/phase-04-guidance-01.wav');
  assert.equal(phase05.timelineClips['settle-below-four']?.audioFile, 'audio/library/2026-05-01/guidance/phase-05-guidance-01.wav');

  assert.equal(phase01.countdownGuidance?.summary, '1 句 4 分暖機判斷＋3 句曖昧耳語');
  assert.equal(phase02.countdownGuidance?.summary, '1 句 5 分判斷＋3 句加強挑逗＋2 句曖昧耳語');
  assert.equal(phase03.countdownGuidance?.summary, '1 句 6 分判斷＋3 句加強挑逗＋2 句曖昧耳語');
  assert.equal(phase04.countdownGuidance?.summary, '1 句 7 分邊界判斷＋1 句加強挑逗＋2 句曖昧耳語');
  assert.equal(phase05.countdownGuidance?.summary, '收尾分數回降提醒，共 1 句');
});

test('normalizeNarrationManifest 仍會從 guided library 的 timeline/event schema 還原相容 countdownGuidance 檢視資料', async () => {
  const raw = await readJson(GUIDED_LIBRARY_MANIFEST_PATH);
  const manifest = normalizeNarrationManifest(raw);
  const entry = findEntry(manifest, 'phase-04');

  assert.ok(entry, 'phase-04 應存在於 normalization 後的 manifest');
  assert.ok(entry.countdownGuidance, 'phase-04 應保留 countdownGuidance summary');
  assert.equal(entry.countdownGuidance.summary, '4 秒吸氣下沉、8 秒吐氣保持鬆，共 10 輪');
  assert.deepEqual(Object.keys(entry.countdownGuidance.clips).sort(), ['exhaleSoft', 'inhaleDrop']);
  assert.deepEqual(
    entry.countdownGuidance.events.map((item) => item.elapsedSecond),
    [0, 4, 12, 16, 24, 28, 36, 40, 48, 52, 60, 64, 72, 76, 84, 88, 96, 100, 108, 112],
  );
  assert.deepEqual(
    entry.countdownGuidance.events.map((item) => item.clipId),
    [
      'inhaleDrop', 'exhaleSoft',
      'inhaleDrop', 'exhaleSoft',
      'inhaleDrop', 'exhaleSoft',
      'inhaleDrop', 'exhaleSoft',
      'inhaleDrop', 'exhaleSoft',
      'inhaleDrop', 'exhaleSoft',
      'inhaleDrop', 'exhaleSoft',
      'inhaleDrop', 'exhaleSoft',
      'inhaleDrop', 'exhaleSoft',
      'inhaleDrop', 'exhaleSoft',
    ],
  );
});

test('2026-05-01 library manifest 與 library index 會同步記錄同一批開場分數判斷素材', async () => {
  const [formalLibraryManifest, libraryIndex] = await Promise.all([
    readJson(FORMAL_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);

  const libraryPhase02 = findEntry(formalLibraryManifest, 'phase-02');
  const libraryPhase03 = findEntry(formalLibraryManifest, 'phase-03');
  const libraryPhase05 = findEntry(formalLibraryManifest, 'phase-05');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-05-01');

  assert.equal(formalLibraryManifest.schemaVersion, 'timeline-events-v1');
  assert.equal(formalLibraryManifest.sourceDate, '2026-05-01');
  assert.equal(formalLibraryManifest.entries.length, 5);

  assert.equal(libraryPhase02.timelineClips['score-5-check']?.audioFile, 'audio/library/2026-05-01/guidance/phase-02-guidance-01.wav');
  assert.equal(libraryPhase02.timelineClips['tease-not-more']?.audioFile, 'audio/library/2026-04-28/guidance/phase-02-guidance-02.wav');
  assert.equal(libraryPhase03.countdownGuidance?.summary, '1 句 6 分判斷＋3 句加強挑逗＋2 句曖昧耳語');
  assert.deepEqual(libraryPhase03.timelineEvents.map((item) => item.startAtSecond), [4, 55, 90, 130, 170, 210]);
  assert.equal(libraryPhase03.timelineClips['score-6-check']?.textFile, 'audio/library/2026-05-01/texts/phase-03-guidance-01.txt');
  assert.equal(libraryPhase03.timelineClips['tease-hold-self']?.audioFile, 'audio/library/2026-04-28/guidance/phase-03-guidance-02.wav');
  assert.equal(libraryPhase05.timelineClips['settle-below-four']?.text, '現在不是往上走，是往下退；讓分數慢慢回到 4 分以下，呼吸重新放穩。');
  assert.equal(libraryPhase05.timelineClips['settle-below-four']?.audioFile, 'audio/library/2026-05-01/guidance/phase-05-guidance-01.wav');

  assert.ok(libraryItem, 'library index 應包含 2026-05-01 正式訓練日條目');
  assert.equal(libraryItem.entryCount, 5);
  assert.equal(libraryItem.manifestFile, 'audio/library/2026-05-01/manifest.json');
  assert.equal(libraryItem.schemaVersion, 'timeline-events-v1');
  assert.equal(libraryItem.timelineSchemaFile, 'audio/schema/timeline-event.schema.json');
});
