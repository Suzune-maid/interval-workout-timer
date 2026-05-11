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
const W2D4_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-05-07/manifest.json', import.meta.url);
const W2D5_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-05-08/manifest.json', import.meta.url);
const W2D6_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-05-09/manifest.json', import.meta.url);
const W2D7_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-05-10/manifest.json', import.meta.url);
const W3D1_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-05-11/manifest.json', import.meta.url);

async function readJson(url) {
  const raw = await readFile(url, 'utf8');
  return JSON.parse(raw);
}

function findEntry(document, id) {
  return document.entries.find((item) => item.id === id);
}

function assertReplaceTrackClipsFit(entry) {
  const eventsByTrack = new Map();
  for (const event of entry.timelineEvents ?? []) {
    if (event.interruptPolicy !== 'replace-track') {
      continue;
    }
    const events = eventsByTrack.get(event.track) ?? [];
    events.push(event);
    eventsByTrack.set(event.track, events);
  }

  for (const [track, events] of eventsByTrack) {
    events.sort((a, b) => a.startAtSecond - b.startAtSecond);
    for (let index = 0; index < events.length - 1; index += 1) {
      const event = events[index];
      const nextEvent = events[index + 1];
      const clip = entry.timelineClips?.[event.clipId];
      assert.ok(clip, `${entry.id} ${event.id} should reference an existing clip`);
      assert.ok(
        clip.audioDurationSeconds <= entry.durationSeconds - event.startAtSecond,
        `${entry.id} ${track} ${event.clipId} duration ${clip.audioDurationSeconds}s should fit before phase ends at ${entry.durationSeconds}s`,
      );
      assert.ok(
        clip.audioDurationSeconds <= nextEvent.startAtSecond - event.startAtSecond,
        `${entry.id} ${track} ${event.clipId} duration ${clip.audioDurationSeconds}s should fit before next replace-track event at ${nextEvent.startAtSecond}s`,
      );
    }
    const finalEvent = events.at(-1);
    const finalClip = entry.timelineClips?.[finalEvent.clipId];
    assert.ok(finalClip, `${entry.id} ${finalEvent.id} should reference an existing clip`);
    assert.ok(
      finalClip.audioDurationSeconds <= entry.durationSeconds - finalEvent.startAtSecond,
      `${entry.id} ${track} ${finalEvent.clipId} duration ${finalClip.audioDurationSeconds}s should fit before phase ends at ${entry.durationSeconds}s`,
    );
  }
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

test('2026-05-07 library manifest 會補齊 W2D4，並只為開場旁白新增變化音檔', async () => {
  const [raw, libraryIndex] = await Promise.all([
    readJson(W2D4_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);
  const phase01 = findEntry(raw, 'phase-01');
  const phase02 = findEntry(raw, 'phase-02');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-05-07');

  assert.equal(raw.sourceDate, '2026-05-07');
  assert.equal(raw.libraryKey, '2026-05-07');
  assert.equal(raw.assetSourceDay, '2026-04-27');
  assert.equal(raw.weekNumber, 2);
  assert.equal(raw.dayNumber, 4);
  assert.equal(raw.weekdayLabel, '四');
  assert.equal(raw.sessionTitle, '凱格爾普通日');
  assert.equal(raw.entries.length, 5);
  assert.equal(phase01.textFile, 'audio/library/2026-05-07/texts/phase-01.txt');
  assert.equal(phase01.audioFile, 'audio/library/2026-05-07/generated/phase-01.wav');
  assert.equal(phase01.text, '現在開始：準備放鬆。今天不用急著進入狀態，先把腹部、臀部和大腿鬆開。等呼吸穩了，再把注意力放回骨盆底。');
  assert.equal(phase02.audioFile, 'audio/library/2026-04-27/generated/phase-02.wav');
  assert.equal(phase02.timelineClips.contract?.audioFile, 'audio/library/2026-04-27/guidance/phase-02-contract.wav');

  assert.ok(libraryItem, 'library index 應包含 2026-05-07 條目');
  assert.equal(libraryItem.weekNumber, 2);
  assert.equal(libraryItem.dayNumber, 4);
  assert.equal(libraryItem.manifestFile, 'audio/library/2026-05-07/manifest.json');
});

test('2026-05-08 library manifest 會補齊 W2D5，並為正式日加入兩個分數控制變化 cue', async () => {
  const [raw, libraryIndex] = await Promise.all([
    readJson(W2D5_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);
  const phase01 = findEntry(raw, 'phase-01');
  const phase03 = findEntry(raw, 'phase-03');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-05-08');

  assert.equal(raw.sourceDate, '2026-05-08');
  assert.equal(raw.libraryKey, '2026-05-08');
  assert.equal(raw.assetSourceDay, '2026-05-05');
  assert.equal(raw.weekNumber, 2);
  assert.equal(raw.dayNumber, 5);
  assert.equal(raw.weekdayLabel, '五');
  assert.equal(raw.sessionTitle, '正式訓練日');
  assert.deepEqual(raw.entries.map((item) => item.durationSeconds), [120, 240, 300, 300, 180]);
  assert.equal(phase01.audioFile, 'audio/library/2026-05-05/generated/phase-01.wav');
  assert.equal(phase01.timelineClips['score-under-four-check']?.textFile, 'audio/library/2026-05-08/texts/phase-01-guidance-01.txt');
  assert.equal(phase01.timelineClips['score-under-four-check']?.audioFile, 'audio/library/2026-05-08/guidance/phase-01-guidance-01.wav');
  assert.equal(phase01.timelineClips['score-under-four-check']?.text, '先掃描分數：如果還在 4 分以下，就只暖身，不追刺激。');
  assert.equal(phase01.timelineEvents[0].startAtSecond, 4);
  assert.equal(phase03.timelineClips['breathe-down-small']?.textFile, 'audio/library/2026-05-08/texts/phase-03-guidance-mid-135.txt');
  assert.equal(phase03.timelineClips['breathe-down-small']?.audioFile, 'audio/library/2026-05-08/guidance/phase-03-guidance-mid-135.wav');
  assert.equal(phase03.timelineClips['breathe-down-small']?.text, '留在 6 到 6.5 分就好；有熱度，但你還能慢下來，這才是今天要練的控制。');
  assert.equal(phase03.timelineEvents.find((item) => item.startAtSecond === 135)?.clipId, 'breathe-down-small');

  assert.ok(libraryItem, 'library index 應包含 2026-05-08 條目');
  assert.equal(libraryItem.manifestFile, 'audio/library/2026-05-08/manifest.json');
});

test('2026-05-09 library manifest 會補齊 adaptive W2D6，並只替換反向與收尾兩個 cue', async () => {
  const [raw, libraryIndex] = await Promise.all([
    readJson(W2D6_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);
  const phase04 = findEntry(raw, 'phase-04');
  const phase05 = findEntry(raw, 'phase-05');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-05-09');

  assert.equal(raw.sourceDate, '2026-05-09');
  assert.equal(raw.libraryKey, '2026-05-09');
  assert.equal(raw.assetSourceDay, '2026-04-27');
  assert.equal(raw.weekNumber, 2);
  assert.equal(raw.dayNumber, 6);
  assert.equal(raw.weekdayLabel, '六');
  assert.equal(raw.sessionTitle, '凱格爾普通日（可依狀態改放鬆）');
  assert.equal(phase04.audioFile, 'audio/library/2026-04-27/generated/phase-04.wav');
  assert.equal(phase04.timelineEvents.find((item) => item.startAtSecond === 4)?.clipId, 'adaptiveReverseOpen');
  assert.equal(phase04.timelineClips.adaptiveReverseOpen?.textFile, 'audio/library/2026-05-09/texts/phase-04-guidance-01.txt');
  assert.equal(phase04.timelineClips.adaptiveReverseOpen?.audioFile, 'audio/library/2026-05-09/guidance/phase-04-guidance-01.wav');
  assert.equal(phase04.timelineClips.adaptiveReverseOpen?.text, '吸氣時往下鬆，不要推、不要憋；只是讓骨盆底自己打開。');
  assert.equal(phase04.timelineClips.exhaleSoft?.audioFile, 'audio/library/2026-04-27/guidance/phase-04-exhale-soft.wav');
  assert.equal(phase05.timelineEvents.find((item) => item.startAtSecond === 48)?.clipId, 'adaptiveCleanFinish');
  assert.equal(phase05.timelineClips.adaptiveCleanFinish?.textFile, 'audio/library/2026-05-09/texts/phase-05-guidance-final.txt');
  assert.equal(phase05.timelineClips.adaptiveCleanFinish?.audioFile, 'audio/library/2026-05-09/guidance/phase-05-guidance-final.wav');
  assert.equal(phase05.timelineClips.adaptiveCleanFinish?.text, '今天不用硬撐；如果身體已經放鬆，就把這份鬆感留下來，乾淨收尾。');

  assert.ok(libraryItem, 'library index 應包含 2026-05-09 條目');
  assert.equal(libraryItem.sessionTitle, '凱格爾普通日（可依狀態改放鬆）');
});

test('2026-05-10 library manifest 會補齊休息日，並只替換循環吸吐兩個 cue', async () => {
  const [raw, libraryIndex] = await Promise.all([
    readJson(W2D7_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);
  const phase01 = findEntry(raw, 'phase-01');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-05-10');

  assert.equal(raw.sourceDate, '2026-05-10');
  assert.equal(raw.libraryKey, '2026-05-10');
  assert.equal(raw.assetSourceDay, '2026-05-03');
  assert.equal(raw.weekNumber, 2);
  assert.equal(raw.dayNumber, 7);
  assert.equal(raw.weekdayLabel, '日');
  assert.equal(raw.sessionTitle, '休息／輕放鬆日');
  assert.equal(raw.entries.length, 1);
  assert.equal(phase01.timelineEvents.length, 36);
  assert.equal(phase01.timelineClips.inhale?.textFile, 'audio/library/2026-05-10/texts/phase-01-inhale.txt');
  assert.equal(phase01.timelineClips.inhale?.audioFile, 'audio/library/2026-05-10/guidance/phase-01-inhale.wav');
  assert.equal(phase01.timelineClips.inhale?.text, '吸氣，讓身體慢慢安靜。');
  assert.equal(phase01.timelineClips.exhale?.textFile, 'audio/library/2026-05-10/texts/phase-01-exhale.txt');
  assert.equal(phase01.timelineClips.exhale?.audioFile, 'audio/library/2026-05-10/guidance/phase-01-exhale.wav');
  assert.equal(phase01.timelineClips.exhale?.text, '吐氣，把骨盆底一起放掉。');
  assert.deepEqual(phase01.timelineEvents.map((item) => item.clipId).slice(0, 4), ['inhale', 'exhale', 'inhale', 'exhale']);

  assert.ok(libraryItem, 'library index 應包含 2026-05-10 條目');
  assert.equal(libraryItem.entryCount, 1);
  assert.equal(libraryItem.manifestFile, 'audio/library/2026-05-10/manifest.json');
});

test('2026-05-11 library manifest 會建立 W3D1 全新凱格爾 base，不沿用 W1/W2 節奏資產', async () => {
  const [raw, libraryIndex] = await Promise.all([
    readJson(W3D1_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);
  const phase01 = findEntry(raw, 'phase-01');
  const phase02 = findEntry(raw, 'phase-02');
  const phase03 = findEntry(raw, 'phase-03');
  const phase04 = findEntry(raw, 'phase-04');
  const phase05 = findEntry(raw, 'phase-05');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-05-11');

  assert.equal(raw.schemaVersion, 'timeline-events-v1');
  assert.equal(raw.sourceDate, '2026-05-11');
  assert.equal(raw.libraryKey, '2026-05-11');
  assert.equal(raw.assetSourceDay, undefined);
  assert.equal(raw.programStartDate, '2026-04-27');
  assert.equal(raw.weekNumber, 3);
  assert.equal(raw.dayNumber, 1);
  assert.equal(raw.weekdayLabel, '一');
  assert.equal(raw.sessionTitle, '凱格爾普通日');
  assert.equal(raw.entries.length, 5);

  assert.deepEqual(raw.entries.map((item) => item.phaseLabel), ['準備放鬆', '慢速凱格爾（10 次）', '快速凱格爾（12 次）', '反向凱格爾', '收尾掃描']);
  assert.deepEqual(raw.entries.map((item) => item.durationSeconds), [60, 130, 24, 150, 60]);

  for (const entry of raw.entries) {
    assert.match(entry.textFile, /^audio\/library\/2026-05-11\/texts\//);
    assert.match(entry.audioFile, /^audio\/library\/2026-05-11\/generated\//);
    assert.equal(entry.ttsModel, 'google/gemini-3.1-flash-tts-preview');
    assert.equal(entry.ttsVoice, 'Leda');
    assert.ok(entry.audioDurationSeconds > 0);
    assert.match(entry.audioSha256, /^[a-f0-9]{64}$/);
    for (const clip of Object.values(entry.timelineClips ?? {})) {
      assert.match(clip.textFile, /^audio\/library\/2026-05-11\/texts\//);
      assert.match(clip.audioFile, /^audio\/library\/2026-05-11\/guidance\//);
      assert.ok(clip.audioDurationSeconds > 0);
      assert.match(clip.audioSha256, /^[a-f0-9]{64}$/);
    }
  }

  assert.equal(phase01.countdownGuidance?.summary, '4 秒吸氣、6 秒吐氣，共 6 輪');
  assert.equal(phase02.countdownGuidance?.summary, '5 秒輕收、8 秒完整放掉，共 10 次');
  assert.equal(phase03.countdownGuidance?.summary, '1 秒輕點、1 秒全放，共 12 次');
  assert.equal(phase04.countdownGuidance?.summary, '4 秒吸氣下沉、8 秒吐氣保持鬆，共 12 輪，最後 6 秒安靜放鬆');
  assert.equal(phase05.countdownGuidance?.summary, '每 12 秒帶一次放鬆檢查，共 5 個提示');

  assert.deepEqual(phase01.timelineEvents.map((item) => item.startAtSecond), [0, 4, 10, 14, 20, 24, 30, 34, 40, 44, 50, 54]);
  assert.deepEqual(phase02.timelineEvents.map((item) => item.startAtSecond).slice(0, 8), [0, 5, 13, 18, 26, 31, 39, 44]);
  assert.deepEqual(phase02.timelineEvents.map((item) => item.startAtSecond).slice(-2), [117, 122]);
  assert.deepEqual(phase03.timelineEvents.map((item) => item.startAtSecond).slice(0, 8), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(phase03.timelineEvents.length, 24);
  assert.deepEqual(phase04.timelineEvents.map((item) => item.startAtSecond).slice(0, 8), [0, 4, 12, 16, 24, 28, 36, 40]);
  assert.deepEqual(phase04.timelineEvents.map((item) => item.startAtSecond).slice(-2), [132, 136]);
  assert.equal(phase04.timelineEvents.length, phase04.countdownGuidance.breathPattern.cycles * 2);
  assert.equal(
    Math.max(...phase04.timelineEvents.map((item) => item.startAtSecond)),
    phase04.durationSeconds - phase04.countdownGuidance.breathPattern.trailingRelaxSeconds - phase04.countdownGuidance.breathPattern.exhaleSeconds,
  );
  assert.deepEqual(phase05.timelineEvents.map((item) => item.startAtSecond), [0, 12, 24, 36, 48]);
  for (const entry of raw.entries) {
    assertReplaceTrackClipsFit(entry);
  }

  assert.equal(phase02.timelineClips.contract?.text, '輕輕收住，維持五秒。');
  assert.equal(phase02.timelineClips.release?.text, '完整放掉，讓骨盆底回到柔軟。');
  assert.equal(phase03.timelineClips.contract?.text, '點一下。');
  assert.equal(phase03.timelineClips.release?.text, '放掉。');
  assert.equal(phase04.timelineClips.inhaleDrop?.text, '吸氣，往下鬆開。');
  assert.equal(phase04.timelineClips.exhaleSoft?.text, '吐氣，保持打開，不要夾緊。');
  assert.equal(phase05.timelineClips.cleanFinish?.text, '很好，身體乾淨放鬆，就停在這裡。');

  assert.ok(libraryItem, 'library index 應包含 2026-05-11 條目');
  assert.equal(libraryItem.sourceDate, '2026-05-11');
  assert.equal(libraryItem.weekNumber, 3);
  assert.equal(libraryItem.dayNumber, 1);
  assert.equal(libraryItem.sessionTitle, '凱格爾普通日');
  assert.equal(libraryItem.manifestFile, 'audio/library/2026-05-11/manifest.json');
  assert.equal(libraryItem.entryCount, 5);
  assert.equal(libraryItem.schemaVersion, 'timeline-events-v1');
  assert.equal(libraryItem.timelineSchemaFile, 'audio/schema/timeline-event.schema.json');
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
