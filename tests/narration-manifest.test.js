import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeNarrationManifest } from '../narration-manifest.js';

const TODAY_MANIFEST_PATH = new URL('../audio/today/narration-manifest.json', import.meta.url);
const TODAY_SOURCE_PATH = new URL('../audio/today/narration-source.json', import.meta.url);
const LIBRARY_INDEX_PATH = new URL('../audio/library/index.json', import.meta.url);
const GUIDED_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-04-27/manifest.json', import.meta.url);
const RELAX_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-04-29/manifest.json', import.meta.url);

async function readJson(url) {
  const raw = await readFile(url, 'utf8');
  return JSON.parse(raw);
}

function findEntry(document, id) {
  return document.entries.find((item) => item.id === id);
}

test('today narration manifest 會把放鬆日 guidance 掛到 phase-01 到 phase-03', async () => {
  const raw = await readJson(TODAY_MANIFEST_PATH);
  const phase01 = findEntry(raw, 'phase-01');
  const phase02 = findEntry(raw, 'phase-02');
  const phase03 = findEntry(raw, 'phase-03');

  assert.equal(raw.schemaVersion, 'timeline-events-v1');
  assert.equal(raw.sourceDate, '2026-04-29');
  assert.equal(raw.sessionTitle, '放鬆日');
  assert.equal(raw.entries.length, 3);

  assert.equal(phase01.phaseLabel, '腹式呼吸');
  assert.equal(phase02.phaseLabel, '反向凱格爾');
  assert.equal(phase03.phaseLabel, '收尾掃描');

  assert.equal(phase01.countdownGuidance?.summary, '4 秒吸氣、6 秒吐氣，共 12 輪');
  assert.equal(phase02.countdownGuidance?.summary, '4 秒吸氣下沉、8 秒吐氣保持鬆，共 15 輪');
  assert.equal(phase03.countdownGuidance?.summary, '每 12 秒帶一次放鬆檢查，共 5 個提示');

  assert.deepEqual(phase01.timelineEvents.map((item) => item.startAtSecond), [0, 4, 10, 14, 20, 24, 30, 34, 40, 44, 50, 54, 60, 64, 70, 74, 80, 84, 90, 94, 100, 104, 110, 114]);
  assert.deepEqual(phase02.timelineEvents.map((item) => item.startAtSecond), [0, 4, 12, 16, 24, 28, 36, 40, 48, 52, 60, 64, 72, 76, 84, 88, 96, 100, 108, 112, 120, 124, 132, 136, 144, 148, 156, 160, 168, 172]);
  assert.deepEqual(phase03.timelineEvents.map((item) => item.startAtSecond), [0, 12, 24, 36, 48]);

  assert.deepEqual(Object.keys(phase01.timelineClips), ['inhale', 'exhale']);
  assert.deepEqual(Object.keys(phase02.timelineClips), ['inhaleDrop', 'exhaleSoft']);
  assert.deepEqual(Object.keys(phase03.timelineClips), ['abdomenRelax', 'glutesRelease', 'quadRelax', 'pelvicFloorSoft', 'urinaryCheck']);
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

test('today narration source、relax library manifest 與 library index 會同步保存放鬆日 guidance clips / events', async () => {
  const [source, relaxLibraryManifest, libraryIndex] = await Promise.all([
    readJson(TODAY_SOURCE_PATH),
    readJson(RELAX_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);

  const sourcePhase01 = findEntry(source, 'phase-01');
  const sourcePhase03 = findEntry(source, 'phase-03');
  const libraryPhase02 = findEntry(relaxLibraryManifest, 'phase-02');
  const libraryPhase03 = findEntry(relaxLibraryManifest, 'phase-03');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-04-29');

  assert.equal(source.schemaVersion, 'timeline-events-v1');
  assert.equal(relaxLibraryManifest.schemaVersion, 'timeline-events-v1');
  assert.equal(source.sourceDate, '2026-04-29');
  assert.equal(relaxLibraryManifest.sourceDate, '2026-04-29');
  assert.equal(source.entries.length, 3);
  assert.equal(relaxLibraryManifest.entries.length, 3);

  assert.equal(sourcePhase01.countdownGuidance?.summary, '4 秒吸氣、6 秒吐氣，共 12 輪');
  assert.equal(sourcePhase01.timelineEvents.length, 24);
  assert.deepEqual(sourcePhase03.timelineEvents.map((item) => item.startAtSecond), [0, 12, 24, 36, 48]);

  assert.equal(libraryPhase02.countdownGuidance?.summary, '4 秒吸氣下沉、8 秒吐氣保持鬆，共 15 輪');
  assert.equal(libraryPhase02.timelineEvents.length, 30);
  assert.equal(libraryPhase03.timelineClips.urinaryCheck?.text, '留意排尿感。');
  assert.equal(libraryPhase03.timelineClips.pelvicFloorSoft?.text, '會陰，鬆開。');

  assert.ok(libraryItem, 'library index 應包含 2026-04-29 放鬆日條目');
  assert.equal(libraryItem.entryCount, 3);
  assert.equal(libraryItem.schemaVersion, 'timeline-events-v1');
  assert.equal(libraryItem.timelineSchemaFile, 'audio/schema/timeline-event.schema.json');
});
