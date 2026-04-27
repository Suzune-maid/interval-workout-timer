import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const MANIFEST_PATH = new URL('../audio/today/narration-manifest.json', import.meta.url);

async function loadManifest() {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  return JSON.parse(raw);
}

function findEntry(manifest, id) {
  return manifest.entries.find((item) => item.id === id);
}

test('phase-02 countdownGuidance manifest 會定義慢速 Kegel 的收放節奏', async () => {
  const manifest = await loadManifest();
  const entry = findEntry(manifest, 'phase-02');

  assert.ok(entry, 'phase-02 應存在於 narration manifest');
  assert.ok(entry.countdownGuidance, 'phase-02 應有 countdownGuidance');
  assert.equal(entry.countdownGuidance.summary, '3 秒收、6 秒放，共 10 次');
  assert.deepEqual(Object.keys(entry.countdownGuidance.clips).sort(), ['contract', 'release']);
  assert.deepEqual(
    entry.countdownGuidance.events.map((item) => item.elapsedSecond),
    [0, 3, 9, 12, 18, 21, 27, 30, 36, 39, 45, 48, 54, 57, 63, 66, 72, 75, 81, 84],
  );
  assert.deepEqual(
    entry.countdownGuidance.events.map((item) => item.clipId),
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
});

test('phase-03 countdownGuidance manifest 會定義快速 Kegel 的點收全放節奏', async () => {
  const manifest = await loadManifest();
  const entry = findEntry(manifest, 'phase-03');

  assert.ok(entry, 'phase-03 應存在於 narration manifest');
  assert.ok(entry.countdownGuidance, 'phase-03 應有 countdownGuidance');
  assert.equal(entry.countdownGuidance.summary, '1 秒點收、1 秒全放，共 10 次');
  assert.deepEqual(Object.keys(entry.countdownGuidance.clips).sort(), ['pulse', 'release']);
  assert.deepEqual(
    entry.countdownGuidance.events.map((item) => item.elapsedSecond),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  );
  assert.deepEqual(
    entry.countdownGuidance.events.map((item) => item.clipId),
    [
      'pulse', 'release',
      'pulse', 'release',
      'pulse', 'release',
      'pulse', 'release',
      'pulse', 'release',
      'pulse', 'release',
      'pulse', 'release',
      'pulse', 'release',
      'pulse', 'release',
      'pulse', 'release',
    ],
  );
});

test('phase-04 countdownGuidance manifest 會定義反向 Kegel 的呼吸下沉節奏', async () => {
  const manifest = await loadManifest();
  const entry = findEntry(manifest, 'phase-04');

  assert.ok(entry, 'phase-04 應存在於 narration manifest');
  assert.ok(entry.countdownGuidance, 'phase-04 應有 countdownGuidance');
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

test('phase-05 countdownGuidance manifest 會定義收尾掃描的放鬆檢查節奏', async () => {
  const manifest = await loadManifest();
  const entry = findEntry(manifest, 'phase-05');

  assert.ok(entry, 'phase-05 應存在於 narration manifest');
  assert.ok(entry.countdownGuidance, 'phase-05 應有 countdownGuidance');
  assert.equal(entry.countdownGuidance.summary, '每 12 秒帶一次放鬆檢查，共 5 個提示');
  assert.deepEqual(
    Object.keys(entry.countdownGuidance.clips).sort(),
    ['abdomenRelax', 'pelvicFloorSoft', 'quadRelax', 'urinaryCheck', 'glutesRelease'].sort(),
  );
  assert.deepEqual(
    entry.countdownGuidance.events.map((item) => item.elapsedSecond),
    [0, 12, 24, 36, 48],
  );
  assert.deepEqual(
    entry.countdownGuidance.events.map((item) => item.clipId),
    ['abdomenRelax', 'glutesRelease', 'quadRelax', 'pelvicFloorSoft', 'urinaryCheck'],
  );
});
