import test from 'node:test';
import assert from 'node:assert/strict';
import { createNarrationPlayer } from '../audio-player.js';

const START_CUE = './audio/fx/countdown-start.wav';
const END_CUE = './audio/fx/countdown-end.wav';

test('createNarrationPlayer 會先播階段旁白再播開始音效，且避免同段重播', async () => {
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

  const player = createNarrationPlayer(
    {
      entries: [
        { id: 'phase-01', phaseIndex: 0, audioFile: './audio/today/generated/phase-01.wav' },
        { id: 'phase-02', phaseIndex: 1, audioFile: './audio/today/generated/phase-02.wav' },
      ],
    },
    {
      startCueFile: START_CUE,
      endCueFile: END_CUE,
    },
  );

  const first = await player.playPhaseIntro(0);
  const repeated = await player.playPhaseIntro(0);
  const second = await player.playPhaseIntro(1);

  assert.equal(first.id, 'phase-01');
  assert.equal(repeated.id, 'phase-01');
  assert.equal(second.id, 'phase-02');
  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    [
      './audio/today/generated/phase-01.wav',
      START_CUE,
      './audio/today/generated/phase-02.wav',
      START_CUE,
    ],
  );
});

test('createNarrationPlayer 會在倒數結束時播放結束音效', async () => {
  const played = [];

  globalThis.Audio = class FakeAudio {
    constructor() {
      this.src = '';
      this.currentTime = 0;
      this.preload = '';
    }

    pause() {}

    play() {
      played.push(this.src);
      return Promise.resolve();
    }
  };

  const player = createNarrationPlayer(
    {
      entries: [{ id: 'phase-01', phaseIndex: 0, audioFile: './audio/today/generated/phase-01.wav' }],
    },
    {
      startCueFile: START_CUE,
      endCueFile: END_CUE,
    },
  );

  await player.playPhaseEndCue();

  assert.deepEqual(played, [END_CUE]);
});

test('createNarrationPlayer reset 後可以重新播放同一段的旁白與開始音效', async () => {
  let playCount = 0;

  globalThis.Audio = class FakeAudio {
    constructor() {
      this.src = '';
      this.currentTime = 0;
      this.preload = '';
    }

    pause() {}

    play() {
      playCount += 1;
      return Promise.resolve();
    }
  };

  const player = createNarrationPlayer(
    {
      entries: [{ id: 'phase-01', phaseIndex: 0, audioFile: './audio/today/generated/phase-01.wav' }],
    },
    {
      startCueFile: START_CUE,
      endCueFile: END_CUE,
    },
  );

  await player.playPhaseIntro(0);
  player.reset();
  await player.playPhaseIntro(0);

  assert.equal(playCount, 4);
});
