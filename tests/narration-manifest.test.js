import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeNarrationManifest } from '../narration-manifest.js';

const LIBRARY_INDEX_PATH = new URL('../audio/library/index.json', import.meta.url);
const GUIDED_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-04-27/manifest.json', import.meta.url);
const FORMAL_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-05-01/manifest.json', import.meta.url);
const W2D1_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-05-04/manifest.json', import.meta.url);
const W2D2_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-05-05/manifest.json', import.meta.url);
const W2D3_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-05-06/manifest.json', import.meta.url);

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

test('2026-05-05 library manifest 會完整保存 W2D2 高原維持專用語音與語氣設定', async () => {
  const [raw, libraryIndex] = await Promise.all([
    readJson(W2D2_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);
  const phase01 = findEntry(raw, 'phase-01');
  const phase02 = findEntry(raw, 'phase-02');
  const phase03 = findEntry(raw, 'phase-03');
  const phase04 = findEntry(raw, 'phase-04');
  const phase05 = findEntry(raw, 'phase-05');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-05-05');

  assert.equal(raw.schemaVersion, 'timeline-events-v1');
  assert.equal(raw.sourceDate, '2026-05-05');
  assert.equal(raw.programStartDate, '2026-04-27');
  assert.equal(raw.weekNumber, 2);
  assert.equal(raw.dayNumber, 2);
  assert.equal(raw.weekdayLabel, '二');
  assert.equal(raw.sessionTitle, '正式訓練日');
  assert.equal(raw.entries.length, 5);

  assert.deepEqual(
    raw.entries.map((item) => item.phaseLabel),
    ['準備期', '第 1 回：6 分維持 1 分鐘', '第 2 回：6～6.5 分維持', '第 3 回：接近 7 分停再回 6 分', '收尾放鬆'],
  );
  assert.deepEqual(raw.entries.map((item) => item.durationSeconds), [120, 240, 300, 300, 180]);

  assert.equal(phase01.audioFile, 'audio/library/2026-05-05/generated/phase-01.wav');
  assert.equal(phase02.audioFile, 'audio/library/2026-05-05/generated/phase-02.wav');
  assert.equal(phase03.audioFile, 'audio/library/2026-05-05/generated/phase-03.wav');
  assert.equal(phase04.audioFile, 'audio/library/2026-05-05/generated/phase-04.wav');
  assert.equal(phase05.audioFile, 'audio/library/2026-05-05/generated/phase-05.wav');

  assert.deepEqual(phase01.timelineEvents.map((item) => item.startAtSecond), [4, 35, 70, 100]);
  assert.deepEqual(phase02.timelineEvents.map((item) => item.startAtSecond), [4, 40, 80, 115, 150, 190, 220]);
  assert.deepEqual(phase03.timelineEvents.map((item) => item.startAtSecond), [4, 55, 95, 135, 180, 225, 270]);
  assert.deepEqual(phase04.timelineEvents.map((item) => item.startAtSecond), [4, 45, 90, 135, 180, 225, 270]);
  assert.deepEqual(phase05.timelineEvents.map((item) => item.startAtSecond), [4, 45, 90, 135]);

  assert.equal(phase01.timelineEvents[0].clipId, 'score-under-four-check');
  assert.equal(phase02.timelineEvents[0].clipId, 'score-six-target');
  assert.equal(phase03.timelineEvents[0].clipId, 'score-six-half-zone');
  assert.equal(phase04.timelineEvents[0].clipId, 'score-seven-boundary');
  assert.equal(phase05.timelineEvents[0].clipId, 'settle-below-four');

  assert.equal(phase03.timelineClips['score-six-half-zone']?.text, '這一回停在 6 到 6.5 分：清楚、有熱度，但還不到必須停的邊界。');
  assert.equal(phase04.timelineClips['stop-on-urgency']?.text, '如果急迫感出現，現在就停，手停、呼吸放慢、骨盆底放鬆。');
  assert.equal(phase05.timelineClips['finish-cleanly']?.text, '很好，今天到這裡就可以收尾，讓身體乾淨地結束。');

  assert.equal(phase01.countdownGuidance?.summary, '啟動前掃描與 4 分以下暖機，共 4 句');
  assert.equal(phase02.countdownGuidance?.summary, '6 分定位與 1 分鐘高原維持，共 7 句');
  assert.equal(phase03.countdownGuidance?.summary, '6～6.5 分高原維持與防暴衝，共 7 句');
  assert.equal(phase04.countdownGuidance?.summary, '接近 7 分辨識、停止、回到 6 分，共 7 句');
  assert.equal(phase05.countdownGuidance?.summary, '回降到 4 分以下與收尾放鬆，共 4 句');

  assert.match(phase01.ttsStyle, /Controlled Plateau Companion/);
  assert.match(phase03.timelineClips['score-six-half-zone']?.ttsStyle, /near-field/);
  assert.match(phase04.timelineClips['score-seven-boundary']?.ttsStyle, /boundary reset mode/);
  assert.match(phase05.timelineClips['settle-below-four']?.ttsStyle, /cooldown mode/);

  assert.ok(libraryItem, 'library index 應包含 2026-05-05 正式訓練日條目');
  assert.equal(libraryItem.sourceDate, '2026-05-05');
  assert.equal(libraryItem.weekNumber, 2);
  assert.equal(libraryItem.dayNumber, 2);
  assert.equal(libraryItem.sessionTitle, '正式訓練日');
  assert.equal(libraryItem.manifestFile, 'audio/library/2026-05-05/manifest.json');
  assert.equal(libraryItem.entryCount, 5);
  assert.equal(libraryItem.schemaVersion, 'timeline-events-v1');
  assert.equal(libraryItem.timelineSchemaFile, 'audio/schema/timeline-event.schema.json');
});

test('2026-05-06 library manifest 會以全新 W2D3 放鬆日素材落在自己的日期目錄', async () => {
  const [raw, libraryIndex] = await Promise.all([
    readJson(W2D3_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);
  const phase01 = findEntry(raw, 'phase-01');
  const phase02 = findEntry(raw, 'phase-02');
  const phase03 = findEntry(raw, 'phase-03');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-05-06');

  assert.equal(raw.schemaVersion, 'timeline-events-v1');
  assert.equal(raw.sourceDate, '2026-05-06');
  assert.equal(raw.programStartDate, '2026-04-27');
  assert.equal(raw.weekNumber, 2);
  assert.equal(raw.dayNumber, 3);
  assert.equal(raw.weekdayLabel, '三');
  assert.equal(raw.sessionTitle, '放鬆日');
  assert.equal(raw.assetSourceDay, undefined);
  assert.equal(raw.entries.length, 3);

  assert.deepEqual(raw.entries.map((item) => item.phaseLabel), ['腹式呼吸', '反向凱格爾', '收尾掃描']);
  assert.deepEqual(raw.entries.map((item) => item.durationSeconds), [120, 180, 60]);

  for (const entry of raw.entries) {
    assert.match(entry.textFile, /^audio\/library\/2026-05-06\/texts\//);
    assert.match(entry.audioFile, /^audio\/library\/2026-05-06\/generated\//);
    for (const clip of Object.values(entry.timelineClips ?? {})) {
      assert.match(clip.textFile, /^audio\/library\/2026-05-06\/texts\//);
      assert.match(clip.audioFile, /^audio\/library\/2026-05-06\/guidance\//);
    }
  }

  assert.equal(Object.keys(phase01.timelineClips).length, 2);
  assert.equal(Object.keys(phase02.timelineClips).length, 2);
  assert.equal(Object.keys(phase03.timelineClips).length, 5);
  assert.equal(phase01.timelineEvents.length, 24);
  assert.equal(phase02.timelineEvents.length, 30);
  assert.equal(phase03.timelineEvents.length, 5);

  assert.deepEqual(phase01.timelineEvents.map((item) => item.startAtSecond).slice(0, 8), [0, 4, 10, 14, 20, 24, 30, 34]);
  assert.deepEqual(phase02.timelineEvents.map((item) => item.startAtSecond).slice(0, 8), [0, 4, 12, 16, 24, 28, 36, 40]);
  assert.deepEqual(phase03.timelineEvents.map((item) => item.startAtSecond), [0, 12, 24, 36, 48]);

  assert.equal(phase01.timelineClips['soft-belly-inhale']?.text, '吸氣，讓腹部自然鼓起。');
  assert.equal(phase01.timelineClips['long-exhale-release']?.text, '吐氣，肩膀和骨盆底一起放掉。');
  assert.equal(phase02.timelineClips['inhale-drop']?.text, '吸氣，骨盆底往下鬆。');
  assert.equal(phase02.timelineClips['exhale-open']?.text, '吐氣，保持打開，不要用力。');
  assert.equal(phase03.timelineClips['clean-finish']?.text, '排尿感正常，就乾淨結束。');

  assert.equal(phase01.countdownGuidance?.summary, '4 秒吸氣、6 秒吐氣，共 12 輪');
  assert.equal(phase02.countdownGuidance?.summary, '4 秒吸氣下沉、8 秒吐氣保持鬆，共 15 輪');
  assert.equal(phase03.countdownGuidance?.summary, '每 12 秒帶一次放鬆檢查，共 5 個提示');

  assert.ok(libraryItem, 'library index 應包含 2026-05-06 條目');
  assert.equal(libraryItem.sourceDate, '2026-05-06');
  assert.equal(libraryItem.weekNumber, 2);
  assert.equal(libraryItem.dayNumber, 3);
  assert.equal(libraryItem.sessionTitle, '放鬆日');
  assert.equal(libraryItem.manifestFile, 'audio/library/2026-05-06/manifest.json');
  assert.equal(libraryItem.entryCount, 3);
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
