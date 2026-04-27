import test from 'node:test';
import assert from 'node:assert/strict';
import { createNarrationPlayer } from '../audio-player.js';

test('createNarrationPlayer 會依 phaseIndex 播放對應語音且避免同段重播', async () => {
  const events = [];

  globalThis.Audio = class FakeAudio {
    constructor() {
      this.src = '';
      this.currentTime = 0;
      this.preload = '';
    }

    pause() {
      events.push({ type: 'pause', src: this.src });
    }

    play() {
      events.push({ type: 'play', src: this.src });
      return Promise.resolve();
    }
  };

  const player = createNarrationPlayer({
    entries: [
      { id: 'phase-01', phaseIndex: 0, audioFile: './audio/today/generated/phase-01.wav' },
      { id: 'phase-02', phaseIndex: 1, audioFile: './audio/today/generated/phase-02.wav' },
    ],
  });

  const first = await player.playForPhase(0);
  const repeated = await player.playForPhase(0);
  const second = await player.playForPhase(1);

  assert.equal(first.id, 'phase-01');
  assert.equal(repeated.id, 'phase-01');
  assert.equal(second.id, 'phase-02');
  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    [
      './audio/today/generated/phase-01.wav',
      './audio/today/generated/phase-02.wav',
    ],
  );
});

test('createNarrationPlayer reset 後可以重新播放同一段', async () => {
  let playCount = 0;

  globalThis.Audio = class FakeAudio {
    constructor() {
      this.src = '';
      this.currentTime = 0;
    }

    pause() {}

    play() {
      playCount += 1;
      return Promise.resolve();
    }
  };

  const player = createNarrationPlayer({
    entries: [{ id: 'phase-01', phaseIndex: 0, audioFile: './audio/today/generated/phase-01.wav' }],
  });

  await player.playForPhase(0);
  player.reset();
  await player.playForPhase(0);

  assert.equal(playCount, 2);
});
