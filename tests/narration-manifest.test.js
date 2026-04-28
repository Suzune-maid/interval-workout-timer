import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeNarrationManifest } from '../narration-manifest.js';

const TODAY_MANIFEST_PATH = new URL('../audio/today/narration-manifest.json', import.meta.url);
const TODAY_SOURCE_PATH = new URL('../audio/today/narration-source.json', import.meta.url);
const LIBRARY_INDEX_PATH = new URL('../audio/library/index.json', import.meta.url);
const GUIDED_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-04-27/manifest.json', import.meta.url);
const FORMAL_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-04-28/manifest.json', import.meta.url);

async function readJson(url) {
  const raw = await readFile(url, 'utf8');
  return JSON.parse(raw);
}

function findEntry(document, id) {
  return document.entries.find((item) => item.id === id);
}

test('today narration manifest 會把正式訓練日的正式案 guidance 掛到 phase-01 到 phase-04', async () => {
  const raw = await readJson(TODAY_MANIFEST_PATH);
  const phase01 = findEntry(raw, 'phase-01');
  const phase02 = findEntry(raw, 'phase-02');
  const phase03 = findEntry(raw, 'phase-03');
  const phase04 = findEntry(raw, 'phase-04');
  const phase05 = findEntry(raw, 'phase-05');

  assert.equal(raw.schemaVersion, 'timeline-events-v1');
  assert.equal(raw.sourceDate, '2026-04-28');
  assert.equal(raw.sessionTitle, '正式訓練日');

  assert.equal(phase01.countdownGuidance?.summary, '曖昧耳語暖身，共 4 句');
  assert.equal(phase02.countdownGuidance?.summary, '正式案引導：4 句加強挑逗＋2 句曖昧耳語');
  assert.equal(phase03.countdownGuidance?.summary, '正式案引導：4 句加強挑逗＋2 句曖昧耳語');
  assert.equal(phase04.countdownGuidance?.summary, '正式案引導：2 句加強挑逗＋2 句曖昧耳語');
  assert.equal(phase05.countdownGuidance, undefined);

  assert.deepEqual(phase01.timelineEvents.map((item) => item.startAtSecond), [0, 25, 55, 85]);
  assert.deepEqual(phase02.timelineEvents.map((item) => item.startAtSecond), [15, 45, 75, 105, 135, 160]);
  assert.deepEqual(phase03.timelineEvents.map((item) => item.startAtSecond), [20, 55, 90, 130, 170, 210]);
  assert.deepEqual(phase04.timelineEvents.map((item) => item.startAtSecond), [25, 75, 130, 190]);
  assert.deepEqual(phase05.timelineEvents, []);

  assert.deepEqual(Object.keys(phase01.timelineClips), ['whisper-wake', 'whisper-just-right', 'whisper-hold', 'whisper-linger']);
  assert.deepEqual(Object.keys(phase04.timelineClips), ['tease-six-seven', 'tease-doorway', 'whisper-doorway', 'whisper-step-back']);
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

test('today narration source、formal library manifest 與 library index 會同步保存正式案 guidance clips / events', async () => {
  const [source, formalLibraryManifest, libraryIndex] = await Promise.all([
    readJson(TODAY_SOURCE_PATH),
    readJson(FORMAL_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);

  const sourcePhase02 = findEntry(source, 'phase-02');
  const sourcePhase03 = findEntry(source, 'phase-03');
  const libraryPhase04 = findEntry(formalLibraryManifest, 'phase-04');
  const libraryPhase05 = findEntry(formalLibraryManifest, 'phase-05');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-04-28');

  assert.equal(source.schemaVersion, 'timeline-events-v1');
  assert.equal(formalLibraryManifest.schemaVersion, 'timeline-events-v1');
  assert.equal(sourcePhase02.countdownGuidance?.summary, '正式案引導：4 句加強挑逗＋2 句曖昧耳語');
  assert.equal(sourcePhase03.timelineEvents.length, 6);
  assert.equal(libraryPhase04.countdownGuidance?.summary, '正式案引導：2 句加強挑逗＋2 句曖昧耳語');
  assert.equal(libraryPhase04.timelineEvents.length, 4);
  assert.equal(libraryPhase04.timelineClips['whisper-doorway']?.text, '就停在門口……先不要再多。');
  assert.equal(libraryPhase04.timelineClips['whisper-step-back']?.text, '退半步……就好。');
  assert.deepEqual(libraryPhase05.timelineEvents, []);
  assert.equal(libraryPhase05.countdownGuidance, undefined);
  assert.ok(libraryItem, 'library index 應包含 2026-04-28 formal day 條目');
  assert.equal(libraryItem.schemaVersion, 'timeline-events-v1');
  assert.equal(libraryItem.timelineSchemaFile, 'audio/schema/timeline-event.schema.json');
});
