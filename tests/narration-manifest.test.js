import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const MANIFEST_PATH = new URL('../audio/today/narration-manifest.json', import.meta.url);

async function loadManifest() {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  return JSON.parse(raw);
}

test('phase-02 countdownGuidance manifest 會定義慢速 Kegel 的收放節奏', async () => {
  const manifest = await loadManifest();
  const entry = manifest.entries.find((item) => item.id === 'phase-02');

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
