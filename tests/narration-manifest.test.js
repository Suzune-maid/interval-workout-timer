import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeNarrationManifest } from '../narration-manifest.js';

const TODAY_MANIFEST_PATH = new URL('../audio/today/narration-manifest.json', import.meta.url);
const TODAY_SOURCE_PATH = new URL('../audio/today/narration-source.json', import.meta.url);
const LIBRARY_INDEX_PATH = new URL('../audio/library/index.json', import.meta.url);
const LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-04-27/manifest.json', import.meta.url);

async function readJson(url) {
  const raw = await readFile(url, 'utf8');
  return JSON.parse(raw);
}

function findEntry(document, id) {
  return document.entries.find((item) => item.id === id);
}

test('narration manifest 會用 timeline/event schema 表達 phase-02 guidance，原始資料不再重複保存 legacy events/clips', async () => {
  const raw = await readJson(TODAY_MANIFEST_PATH);
  const entry = findEntry(raw, 'phase-02');

  assert.equal(raw.schemaVersion, 'timeline-events-v1');
  assert.ok(entry, 'phase-02 應存在於 narration manifest');
  assert.ok(Array.isArray(entry.timelineEvents), 'phase-02 應提供 timelineEvents');
  assert.deepEqual(
    entry.timelineEvents.map((item) => item.startAtSecond),
    [0, 3, 9, 12, 18, 21, 27, 30, 36, 39, 45, 48, 54, 57, 63, 66, 72, 75, 81, 84],
  );
  assert.deepEqual(
    entry.timelineEvents.map((item) => item.clipId),
    [
      'contract', 'release',
      'contract', 'release',
      'contract', 'release',
      'contract', 'release',
      'contract', 'release',
      'contract', 'release',
      'contract', 'release',
      'contract', 'release',
      'contract', 'release',
      'contract', 'release',
    ],
  );
  assert.equal(entry.timelineEvents[0].track, 'guidance-primary');
  assert.equal(entry.countdownGuidance?.events, undefined);
  assert.equal(entry.countdownGuidance?.clips, undefined);
});

test('normalizeNarrationManifest 會從 timeline/event schema 還原相容 countdownGuidance 檢視資料', async () => {
  const raw = await readJson(TODAY_MANIFEST_PATH);
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

test('narration source 與 library manifest 也會同步使用 timeline/event schema', async () => {
  const [source, libraryManifest, libraryIndex] = await Promise.all([
    readJson(TODAY_SOURCE_PATH),
    readJson(LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);

  const sourceEntry = findEntry(source, 'phase-03');
  const libraryEntry = findEntry(libraryManifest, 'phase-05');

  assert.equal(source.schemaVersion, 'timeline-events-v1');
  assert.equal(libraryManifest.schemaVersion, 'timeline-events-v1');
  assert.ok(Array.isArray(sourceEntry.timelineEvents), 'source phase-03 應使用 timelineEvents');
  assert.ok(Array.isArray(libraryEntry.timelineEvents), 'library phase-05 應使用 timelineEvents');
  assert.equal(sourceEntry.countdownGuidance?.events, undefined);
  assert.equal(libraryEntry.countdownGuidance?.clips, undefined);
  assert.equal(libraryIndex.items[0].schemaVersion, 'timeline-events-v1');
  assert.equal(libraryIndex.items[0].timelineSchemaFile, 'audio/schema/timeline-event.schema.json');
});
