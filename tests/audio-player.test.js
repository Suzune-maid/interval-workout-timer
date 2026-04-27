import test from 'node:test';
import assert from 'node:assert/strict';
import { createNarrationPlayer } from '../audio-player.js';

const START_CUE = './audio/fx/countdown-start.wav';
const END_CUE = './audio/fx/countdown-end.wav';

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

test('createNarrationPlayer 會等階段旁白與開始音效都播完才結束 phase intro', async () => {
  const { events, instances } = installFakeAudio();

  const player = createNarrationPlayer(
    {
      entries: [
        { id: 'phase-01', phaseIndex: 0, phaseLabel: '準備放鬆', audioFile: './audio/today/generated/phase-01.wav' },
      ],
    },
    {
      startCueFile: START_CUE,
      endCueFile: END_CUE,
    },
  );

  let resolved = false;
  const introPromise = player.playPhaseIntro(0).then(() => {
    resolved = true;
  });

  await nextTurn();
  assert.equal(resolved, false, '不應只因為 audio.play() resolve 就視為整段播放完成');
  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    ['./audio/today/generated/phase-01.wav'],
  );

  instances[0].dispatch('ended');
  await nextTurn();
  assert.equal(resolved, false, '旁白播完後，還要等開始音效播完');
  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    ['./audio/today/generated/phase-01.wav', START_CUE],
  );

  instances[1].dispatch('ended');
  await introPromise;
  assert.equal(resolved, true);
});

test('createNarrationPlayer 在 cue-only 模式只播開始音效，且也要等音效播完', async () => {
  const { events, instances } = installFakeAudio();

  const player = createNarrationPlayer(
    {
      entries: [
        { id: 'phase-01', phaseIndex: 0, audioFile: './audio/today/generated/phase-01.wav' },
      ],
    },
    {
      startCueFile: START_CUE,
      endCueFile: END_CUE,
    },
  );

  let resolved = false;
  const introPromise = player.playPhaseIntro(0, 'cue-only').then(() => {
    resolved = true;
  });

  await nextTurn();
  assert.equal(resolved, false);
  assert.deepEqual(events.filter((event) => event.type === 'play').map((event) => event.src), [START_CUE]);

  instances[1].dispatch('ended');
  await introPromise;
  assert.equal(resolved, true);
});

test('createNarrationPlayer full 模式對同一段不會重播旁白或 cue', async () => {
  const { events, instances } = installFakeAudio();

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

  const firstPromise = player.playPhaseIntro(0);
  instances[0].dispatch('ended');
  await nextTurn();
  instances[1].dispatch('ended');
  const first = await firstPromise;

  const repeated = await player.playPhaseIntro(0);

  const secondPromise = player.playPhaseIntro(1);
  instances[0].dispatch('ended');
  await nextTurn();
  instances[1].dispatch('ended');
  const second = await secondPromise;

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

test('createNarrationPlayer 會在倒數結束時播放結束音效，且等音效播完才結束', async () => {
  const { events, instances } = installFakeAudio();

  const player = createNarrationPlayer(
    {
      entries: [{ id: 'phase-01', phaseIndex: 0, audioFile: './audio/today/generated/phase-01.wav' }],
    },
    {
      startCueFile: START_CUE,
      endCueFile: END_CUE,
    },
  );

  let resolved = false;
  const endPromise = player.playPhaseEndCue().then(() => {
    resolved = true;
  });

  await nextTurn();
  assert.equal(resolved, false, '結束音效應等播完才 resolve');
  assert.deepEqual(events.filter((event) => event.type === 'play').map((event) => event.src), [END_CUE]);

  instances[1].dispatch('ended');
  await endPromise;
  assert.equal(resolved, true);
});

test('createNarrationPlayer reset 會中止等待中的 phase intro，且之後可以重新播放', async () => {
  const { events, instances } = installFakeAudio();

  const player = createNarrationPlayer(
    {
      entries: [{ id: 'phase-01', phaseIndex: 0, audioFile: './audio/today/generated/phase-01.wav' }],
    },
    {
      startCueFile: START_CUE,
      endCueFile: END_CUE,
    },
  );

  let interruptedResolved = false;
  const interruptedPromise = player.playPhaseIntro(0).then(() => {
    interruptedResolved = true;
  });

  await nextTurn();
  player.reset();
  await interruptedPromise;
  assert.equal(interruptedResolved, true, 'reset 不應讓等待中的 intro 卡住');
  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    ['./audio/today/generated/phase-01.wav'],
  );

  const replayPromise = player.playPhaseIntro(0);
  instances[0].dispatch('ended');
  await nextTurn();
  instances[1].dispatch('ended');
  await replayPromise;

  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    [
      './audio/today/generated/phase-01.wav',
      './audio/today/generated/phase-01.wav',
      START_CUE,
    ],
  );
});
