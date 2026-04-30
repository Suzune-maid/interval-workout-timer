import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeNarrationManifest } from '../narration-manifest.js';

const TODAY_MANIFEST_PATH = new URL('../audio/today/narration-manifest.json', import.meta.url);
const TODAY_SOURCE_PATH = new URL('../audio/today/narration-source.json', import.meta.url);
const LIBRARY_INDEX_PATH = new URL('../audio/library/index.json', import.meta.url);
const GUIDED_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-04-27/manifest.json', import.meta.url);
const REUSED_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-04-30/manifest.json', import.meta.url);

async function readJson(url) {
  const raw = await readFile(url, 'utf8');
  return JSON.parse(raw);
}

function findEntry(document, id) {
  return document.entries.find((item) => item.id === id);
}

test('today narration manifest 會沿用 2026-04-27 的凱格爾普通日音檔與 guidance 結構', async () => {
  const raw = await readJson(TODAY_MANIFEST_PATH);
  const phase01 = findEntry(raw, 'phase-01');
  const phase02 = findEntry(raw, 'phase-02');
  const phase03 = findEntry(raw, 'phase-03');
  const phase04 = findEntry(raw, 'phase-04');
  const phase05 = findEntry(raw, 'phase-05');

  assert.equal(raw.schemaVersion, 'timeline-events-v1');
  assert.equal(raw.sourceDate, '2026-04-30');
  assert.equal(raw.sessionTitle, '凱格爾普通日');
  assert.equal(raw.entries.length, 5);

  assert.deepEqual(
    raw.entries.map((item) => item.phaseLabel),
    ['準備放鬆', '慢速凱格爾（10 次）', '快速凱格爾（10 次）', '反向凱格爾', '收尾掃描'],
  );

  assert.equal(phase01.audioFile, 'audio/library/2026-04-27/generated/phase-01.wav');
  assert.equal(phase02.audioFile, 'audio/library/2026-04-27/generated/phase-02.wav');
  assert.equal(phase03.audioFile, 'audio/library/2026-04-27/generated/phase-03.wav');
  assert.equal(phase04.audioFile, 'audio/library/2026-04-27/generated/phase-04.wav');
  assert.equal(phase05.audioFile, 'audio/library/2026-04-27/generated/phase-05.wav');

  assert.equal(phase01.countdownGuidance?.summary, '4 秒吸氣、6 秒吐氣，共 6 輪');
  assert.equal(phase02.countdownGuidance?.summary, '3 秒收、6 秒放，共 10 次');
  assert.equal(phase03.countdownGuidance?.summary, '1 秒點收、1 秒全放，共 10 次');
  assert.equal(phase04.countdownGuidance?.summary, '4 秒吸氣下沉、8 秒吐氣保持鬆，共 10 輪');
  assert.equal(phase05.countdownGuidance?.summary, '每 12 秒帶一次放鬆檢查，共 5 個提示');

  assert.deepEqual(phase01.timelineEvents.map((item) => item.startAtSecond), [0, 4, 10, 14, 20, 24, 30, 34, 40, 44, 50, 54]);
  assert.deepEqual(phase03.timelineEvents.map((item) => item.startAtSecond), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  assert.deepEqual(phase05.timelineEvents.map((item) => item.startAtSecond), [0, 12, 24, 36, 48]);

  assert.deepEqual(Object.keys(phase01.timelineClips), ['inhale', 'exhale']);
  assert.deepEqual(Object.keys(phase02.timelineClips), ['contract', 'release']);
  assert.deepEqual(Object.keys(phase03.timelineClips), ['pulse', 'release']);
  assert.deepEqual(Object.keys(phase04.timelineClips), ['inhaleDrop', 'exhaleSoft']);
  assert.deepEqual(Object.keys(phase05.timelineClips), ['abdomenRelax', 'glutesRelease', 'quadRelax', 'pelvicFloorSoft', 'urinaryCheck']);
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

test('today narration source、2026-04-30 library manifest 與 library index 會同步記錄沿用 2026-04-27 的資產', async () => {
  const [source, reusedLibraryManifest, libraryIndex] = await Promise.all([
    readJson(TODAY_SOURCE_PATH),
    readJson(REUSED_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);

  const sourcePhase02 = findEntry(source, 'phase-02');
  const sourcePhase05 = findEntry(source, 'phase-05');
  const libraryPhase03 = findEntry(reusedLibraryManifest, 'phase-03');
  const libraryPhase05 = findEntry(reusedLibraryManifest, 'phase-05');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-04-30');

  assert.equal(source.schemaVersion, 'timeline-events-v1');
  assert.equal(reusedLibraryManifest.schemaVersion, 'timeline-events-v1');
  assert.equal(source.sourceDate, '2026-04-30');
  assert.equal(reusedLibraryManifest.sourceDate, '2026-04-30');
  assert.equal(source.entries.length, 5);
  assert.equal(reusedLibraryManifest.entries.length, 5);

  assert.equal(sourcePhase02.audioFile, 'audio/library/2026-04-27/generated/phase-02.wav');
  assert.equal(sourcePhase02.timelineClips.contract?.audioFile, 'audio/library/2026-04-27/guidance/phase-02-contract.wav');
  assert.equal(sourcePhase02.timelineClips.release?.audioFile, 'audio/library/2026-04-27/guidance/phase-02-release.wav');
  assert.equal(sourcePhase05.timelineEvents.length, 5);

  assert.equal(libraryPhase03.countdownGuidance?.summary, '1 秒點收、1 秒全放，共 10 次');
  assert.deepEqual(libraryPhase03.timelineEvents.map((item) => item.startAtSecond), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  assert.equal(libraryPhase05.timelineClips.urinaryCheck?.audioFile, 'audio/library/2026-04-27/guidance/phase-05-urinary-check.wav');
  assert.equal(libraryPhase05.timelineClips.urinaryCheck?.text, '留意排尿感');

  assert.ok(libraryItem, 'library index 應包含 2026-04-30 凱格爾普通日條目');
  assert.equal(libraryItem.entryCount, 5);
  assert.equal(libraryItem.manifestFile, 'audio/library/2026-04-30/manifest.json');
  assert.equal(libraryItem.schemaVersion, 'timeline-events-v1');
  assert.equal(libraryItem.timelineSchemaFile, 'audio/schema/timeline-event.schema.json');
});
