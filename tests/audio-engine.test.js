import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioEngine } from '../audio-engine.js';

const NARRATION_A = './audio/library/test-fixtures/generated/phase-01.wav';
const NARRATION_B = './audio/library/test-fixtures/generated/phase-02.wav';
const GUIDANCE_A = './audio/library/test-fixtures/guidance/phase-01-inhale.wav';
const START_CUE = './audio/fx/countdown-start.wav';

function installFakeAudio() {
  const events = [];
  const instances = [];

  globalThis.Audio = class FakeAudio {
    constructor() {
      this.src = '';
      this.currentTime = 0;
      this.preload = '';
      this.listeners = new Map();
      instances.push(this);
    }

    addEventListener(type, handler, options = {}) {
      const handlers = this.listeners.get(type) ?? new Set();
      handlers.add({ handler, once: Boolean(options?.once) });
      this.listeners.set(type, handlers);
    }

    removeEventListener(type, handler) {
      const handlers = this.listeners.get(type);
      if (!handlers) {
        return;
      }

      for (const entry of handlers) {
        if (entry.handler === handler) {
          handlers.delete(entry);
        }
      }
    }

    dispatch(type) {
      const handlers = [...(this.listeners.get(type) ?? [])];
      for (const entry of handlers) {
        entry.handler();
        if (entry.once) {
          this.listeners.get(type)?.delete(entry);
        }
      }
    }

    load() {
      events.push({ type: 'load', src: this.src });
    }

    pause() {
      events.push({ type: 'pause', src: this.src });
    }

    play() {
      events.push({ type: 'play', src: this.src });
      return Promise.resolve();
    }
  };

  return { events, instances };
}

function nextTurn() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test('createAudioEngine 同一 track 以 replace-track 播放新 clip 時，會中斷舊播放並更新 track state', async () => {
  const { events, instances } = installFakeAudio();
  const engine = createAudioEngine();

  let firstResolved = 'pending';
  const firstPromise = engine.playClip({
    track: 'narration',
    src: NARRATION_A,
    interruptPolicy: 'replace-track',
  }).then((result) => {
    firstResolved = result;
  });

  await nextTurn();
  assert.deepEqual(engine.getTrackState('narration'), {
    track: 'narration',
    status: 'playing',
    src: NARRATION_A,
  });

  const secondPromise = engine.playClip({
    track: 'narration',
    src: NARRATION_B,
    interruptPolicy: 'replace-track',
  });

  await firstPromise;
  assert.equal(firstResolved, 'interrupted');
  assert.deepEqual(engine.getTrackState('narration'), {
    track: 'narration',
    status: 'playing',
    src: NARRATION_B,
  });
  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    [NARRATION_A, NARRATION_B],
  );

  instances[0].dispatch('ended');
  assert.equal(await secondPromise, 'ended');
  assert.deepEqual(engine.getTrackState('narration'), {
    track: 'narration',
    status: 'idle',
    src: null,
  });
});

test('createAudioEngine 可以只停止指定 track，而不影響其他 track 的播放', async () => {
  const { instances } = installFakeAudio();
  const engine = createAudioEngine();

  let guidanceResolved = 'pending';
  const narrationPromise = engine.playClip({ track: 'narration', src: NARRATION_A });
  const guidancePromise = engine.playClip({ track: 'guidance-primary', src: GUIDANCE_A }).then((result) => {
    guidanceResolved = result;
  });

  await nextTurn();
  assert.deepEqual(engine.getTrackState('narration'), {
    track: 'narration',
    status: 'playing',
    src: NARRATION_A,
  });
  assert.deepEqual(engine.getTrackState('guidance-primary'), {
    track: 'guidance-primary',
    status: 'playing',
    src: GUIDANCE_A,
  });

  engine.stopTrack('guidance-primary');
  await guidancePromise;

  assert.equal(guidanceResolved, 'cancelled');
  assert.deepEqual(engine.getTrackState('guidance-primary'), {
    track: 'guidance-primary',
    status: 'idle',
    src: null,
  });
  assert.deepEqual(engine.getTrackState('narration'), {
    track: 'narration',
    status: 'playing',
    src: NARRATION_A,
  });

  instances[0].dispatch('ended');
  assert.equal(await narrationPromise, 'ended');
});

test('createAudioEngine preload 會預先建立唯一 clip 的載入請求，且不改變 track state', () => {
  const { events } = installFakeAudio();
  const engine = createAudioEngine();

  engine.preload([
    { track: 'cue', src: START_CUE },
    { track: 'cue', src: START_CUE },
    { track: 'guidance-primary', src: GUIDANCE_A },
  ]);

  assert.deepEqual(
    events.filter((event) => event.type === 'load').map((event) => event.src),
    [START_CUE, GUIDANCE_A],
  );
  assert.deepEqual(engine.getTrackState('cue'), {
    track: 'cue',
    status: 'idle',
    src: null,
  });
  assert.deepEqual(engine.getTrackState('guidance-primary'), {
    track: 'guidance-primary',
    status: 'idle',
    src: null,
  });
});

test('createAudioEngine reset 會停止所有 track 並清空狀態', async () => {
  const engine = createAudioEngine();

  let narrationResolved = 'pending';
  let cueResolved = 'pending';
  const narrationPromise = engine.playClip({ track: 'narration', src: NARRATION_A }).then((result) => {
    narrationResolved = result;
  });
  const cuePromise = engine.playClip({ track: 'cue', src: START_CUE }).then((result) => {
    cueResolved = result;
  });

  await nextTurn();
  engine.reset();
  await Promise.all([narrationPromise, cuePromise]);

  assert.equal(narrationResolved, 'cancelled');
  assert.equal(cueResolved, 'cancelled');
  assert.deepEqual(engine.getTrackState('narration'), {
    track: 'narration',
    status: 'idle',
    src: null,
  });
  assert.deepEqual(engine.getTrackState('cue'), {
    track: 'cue',
    status: 'idle',
    src: null,
  });
});
