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

test('today narration manifest 會用 timeline/event schema 表達正式訓練日，且不重複保存 legacy guidance events/clips', async () => {
  const raw = await readJson(TODAY_MANIFEST_PATH);
  const entry = findEntry(raw, 'phase-02');

  assert.equal(raw.schemaVersion, 'timeline-events-v1');
  assert.equal(raw.sourceDate, '2026-04-28');
  assert.equal(raw.sessionTitle, '正式訓練日');
  assert.ok(entry, 'phase-02 應存在於 today narration manifest');
  assert.deepEqual(entry.timelineClips, {});
  assert.deepEqual(entry.timelineEvents, []);
  assert.equal(entry.countdownGuidance, undefined);
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

test('today narration source、formal library manifest 與 library index 會同步使用 timeline/event schema', async () => {
  const [source, formalLibraryManifest, libraryIndex] = await Promise.all([
    readJson(TODAY_SOURCE_PATH),
    readJson(FORMAL_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);

  const sourceEntry = findEntry(source, 'phase-03');
  const libraryEntry = findEntry(formalLibraryManifest, 'phase-05');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-04-28');

  assert.equal(source.schemaVersion, 'timeline-events-v1');
  assert.equal(formalLibraryManifest.schemaVersion, 'timeline-events-v1');
  assert.ok(Array.isArray(sourceEntry.timelineEvents), 'source phase-03 應使用 timelineEvents');
  assert.ok(Array.isArray(libraryEntry.timelineEvents), 'formal library phase-05 應使用 timelineEvents');
  assert.deepEqual(sourceEntry.timelineEvents, []);
  assert.deepEqual(libraryEntry.timelineEvents, []);
  assert.equal(sourceEntry.countdownGuidance, undefined);
  assert.equal(libraryEntry.countdownGuidance, undefined);
  assert.ok(libraryItem, 'library index 應包含 2026-04-28 formal day 條目');
  assert.equal(libraryItem.schemaVersion, 'timeline-events-v1');
  assert.equal(libraryItem.timelineSchemaFile, 'audio/schema/timeline-event.schema.json');
});
