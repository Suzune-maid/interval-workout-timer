import test from 'node:test';
import assert from 'node:assert/strict';
import { createNarrationPlayer } from '../audio-player.js';

const START_CUE = './audio/fx/countdown-start.wav';
const END_CUE = './audio/fx/countdown-end.wav';
const INHALE_CUE = './audio/library/test-fixtures/guidance/phase-01-inhale.wav';
const EXHALE_CUE = './audio/library/test-fixtures/guidance/phase-01-exhale.wav';

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

function buildPlayerWithGuidance() {
  return createNarrationPlayer(
    {
      entries: [
        {
          id: 'phase-01',
          phaseIndex: 0,
          phaseLabel: '準備放鬆',
          audioFile: './audio/library/test-fixtures/generated/phase-01.wav',
          countdownGuidance: {
            summary: '4 秒吸氣、6 秒吐氣，共 6 輪',
            clips: {
              inhale: {
                id: 'inhale',
                text: '吸氣',
                audioFile: INHALE_CUE,
              },
              exhale: {
                id: 'exhale',
                text: '吐氣',
                audioFile: EXHALE_CUE,
              },
            },
            events: [
              { elapsedSecond: 0, clipId: 'inhale' },
              { elapsedSecond: 4, clipId: 'exhale' },
              { elapsedSecond: 10, clipId: 'inhale' },
            ],
          },
        },
      ],
    },
    {
      startCueFile: START_CUE,
      endCueFile: END_CUE,
    },
  );
}

test('createNarrationPlayer 會等階段旁白與開始音效都播完才結束 phase intro', async () => {
  const { events, instances } = installFakeAudio();

  const player = buildPlayerWithGuidance();

  let resolved = false;
  const introPromise = player.playPhaseIntro(0).then(() => {
    resolved = true;
  });

  await nextTurn();
  assert.equal(resolved, false, '不應只因為 audio.play() resolve 就視為整段播放完成');
  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    ['./audio/library/test-fixtures/generated/phase-01.wav'],
  );

  instances[0].dispatch('ended');
  await nextTurn();
  assert.equal(resolved, false, '旁白播完後，還要等開始音效播完');
  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    ['./audio/library/test-fixtures/generated/phase-01.wav', START_CUE],
  );

  instances[1].dispatch('ended');
  await introPromise;
  assert.equal(resolved, true);
});

test('createNarrationPlayer 在 cue-only 模式只播開始音效，且也要等音效播完', async () => {
  const { events, instances } = installFakeAudio();

  const player = buildPlayerWithGuidance();

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
        { id: 'phase-01', phaseIndex: 0, audioFile: './audio/library/test-fixtures/generated/phase-01.wav' },
        { id: 'phase-02', phaseIndex: 1, audioFile: './audio/library/test-fixtures/generated/phase-02.wav' },
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
      './audio/library/test-fixtures/generated/phase-01.wav',
      START_CUE,
      './audio/library/test-fixtures/generated/phase-02.wav',
      START_CUE,
    ],
  );
});

test('createNarrationPlayer 會在倒數中的指定秒數播放第一階段引導語音，且同一事件不重播', async () => {
  const { events, instances } = installFakeAudio();
  const player = buildPlayerWithGuidance();

  let firstResolved = false;
  const firstGuidancePromise = player.playCountdownGuidance(0, 0).then((result) => {
    firstResolved = result;
  });

  await nextTurn();
  assert.equal(firstResolved, false);
  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    [INHALE_CUE],
  );

  instances[2].dispatch('ended');
  await firstGuidancePromise;
  assert.equal(firstResolved.clipId, 'inhale');

  const repeated = await player.playCountdownGuidance(0, 0);
  assert.equal(repeated, null);

  let secondResolved = false;
  const secondGuidancePromise = player.playCountdownGuidance(0, 4).then((result) => {
    secondResolved = result;
  });

  await nextTurn();
  assert.equal(secondResolved, false);
  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    [INHALE_CUE, EXHALE_CUE],
  );

  instances[2].dispatch('ended');
  await secondGuidancePromise;
  assert.equal(secondResolved.clipId, 'exhale');
});

test('createNarrationPlayer reset 後會清空已播放的倒數引導事件，讓同一段可重新播放', async () => {
  const { events, instances } = installFakeAudio();
  const player = buildPlayerWithGuidance();

  const firstGuidancePromise = player.playCountdownGuidance(0, 0);
  instances[2].dispatch('ended');
  await firstGuidancePromise;

  player.reset();

  const replayPromise = player.playCountdownGuidance(0, 0);
  await nextTurn();
  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    [INHALE_CUE, INHALE_CUE],
  );
  instances[2].dispatch('ended');
  await replayPromise;
});

test('createNarrationPlayer stopActivePlayback 會中止目前的倒數引導播放，但保留已播放事件紀錄', async () => {
  const { events } = installFakeAudio();
  const player = buildPlayerWithGuidance();

  let resolved = false;
  const guidancePromise = player.playCountdownGuidance(0, 0).then((result) => {
    resolved = result;
  });

  await nextTurn();
  player.stopActivePlayback();
  await guidancePromise;

  assert.equal(resolved, null);
  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    [INHALE_CUE],
  );

  const replay = await player.playCountdownGuidance(0, 0);
  assert.equal(replay, null);
});

test('createNarrationPlayer 會透過 audio engine abstraction 暴露 track state 與 stopTrack', async () => {
  installFakeAudio();
  const player = buildPlayerWithGuidance();

  let resolved = false;
  const guidancePromise = player.playCountdownGuidance(0, 0).then((result) => {
    resolved = result;
  });

  await nextTurn();
  assert.deepEqual(player.getTrackState('guidance-primary'), {
    track: 'guidance-primary',
    status: 'playing',
    src: INHALE_CUE,
  });

  player.stopTrack('guidance-primary');
  await guidancePromise;

  assert.equal(resolved, null);
  assert.deepEqual(player.getTrackState('guidance-primary'), {
    track: 'guidance-primary',
    status: 'idle',
    src: null,
  });
  assert.deepEqual(player.getTrackState('narration'), {
    track: 'narration',
    status: 'idle',
    src: null,
  });
});

test('createNarrationPlayer 會用 timelineEvents 的 track / policy 設定驅動 guidance 播放', async () => {
  const calls = [];
  const player = createNarrationPlayer(
    {
      entries: [
        {
          id: 'phase-01',
          phaseIndex: 0,
          phaseLabel: '準備放鬆',
          countdownGuidance: {
            summary: '吸吐提示',
            mode: 'timed-breathing',
          },
          timelineClips: {
            inhale: {
              id: 'inhale',
              text: '吸氣',
              audioFile: INHALE_CUE,
            },
          },
          timelineEvents: [
            {
              id: 'phase-01-inhale-000',
              startAtSecond: 0,
              clipId: 'inhale',
              track: 'guidance-secondary',
              priority: 'high',
              interruptPolicy: 'replace-track',
              duckingGroup: 'speech',
              volume: 0.6,
            },
          ],
        },
      ],
    },
    {
      engine: {
        playClip(options) {
          calls.push(options);
          return Promise.resolve('ended');
        },
        stopTrack() {},
        stopAll() {},
        reset() {},
        preload() {},
        getTrackState(track) {
          return { track, status: 'idle', src: null };
        },
      },
    },
  );

  const result = await player.playCountdownGuidance(0, 0);

  assert.equal(result.clipId, 'inhale');
  assert.equal(result.text, '吸氣');
  assert.equal(result.audioFile, INHALE_CUE);
  assert.deepEqual(calls, [
    {
      track: 'guidance-secondary',
      src: INHALE_CUE,
      priority: 'high',
      interruptPolicy: 'replace-track',
      duckingGroup: 'speech',
      volume: 0.6,
    },
  ]);
});

test('createNarrationPlayer 會在倒數結束時播放結束音效，且等音效播完才結束', async () => {
  const { events, instances } = installFakeAudio();

  const player = buildPlayerWithGuidance();

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

  const player = buildPlayerWithGuidance();

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
    ['./audio/library/test-fixtures/generated/phase-01.wav'],
  );

  const replayPromise = player.playPhaseIntro(0);
  instances[0].dispatch('ended');
  await nextTurn();
  instances[1].dispatch('ended');
  await replayPromise;

  assert.deepEqual(
    events.filter((event) => event.type === 'play').map((event) => event.src),
    [
      './audio/library/test-fixtures/generated/phase-01.wav',
      './audio/library/test-fixtures/generated/phase-01.wav',
      START_CUE,
    ],
  );
});
