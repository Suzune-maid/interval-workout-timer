import test from 'node:test';
import assert from 'node:assert/strict';
import { advancePhase, createSessionStateFromPhases } from '../timer-core.js';
import { createTimelineOrchestrator } from '../timeline-orchestrator.js';

function nextTurn() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createScheduler() {
  let nextIntervalId = 1;
  const intervals = new Map();

  return {
    setInterval(callback, delay) {
      const id = nextIntervalId;
      nextIntervalId += 1;
      intervals.set(id, { callback, delay });
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
    getActiveIntervalIds() {
      return [...intervals.keys()];
    },
    async tick(id) {
      const interval = intervals.get(id);
      if (!interval) {
        throw new Error(`Unknown interval id: ${id}`);
      }
      await interval.callback();
    },
  };
}

function createSessionHarness(phases) {
  let state = createSessionStateFromPhases(phases);

  return {
    getState() {
      return state;
    },
    setState(nextState) {
      state = nextState;
      return state;
    },
    advancePhase() {
      state = advancePhase(state);
      return state;
    },
  };
}

function createNarrationPlayerHarness({
  introMode = 'immediate',
  endCueMode = 'immediate',
  guidanceByElapsedSecond = {},
} = {}) {
  const calls = [];
  const pendingIntros = [];
  const pendingEndCues = [];

  return {
    calls,
    pendingIntros,
    pendingEndCues,
    player: {
      playPhaseIntro(phaseIndex, playbackMode = 'full') {
        calls.push({ type: 'intro', phaseIndex, playbackMode });

        if (introMode === 'deferred') {
          const deferred = createDeferred();
          pendingIntros.push(deferred);
          return deferred.promise.then(() => ({ phaseIndex }));
        }

        return Promise.resolve({ phaseIndex });
      },
      playCountdownGuidance(phaseIndex, elapsedSecond) {
        calls.push({ type: 'guidance', phaseIndex, elapsedSecond });
        return Promise.resolve(guidanceByElapsedSecond[elapsedSecond] ?? null);
      },
      playPhaseEndCue() {
        calls.push({ type: 'end-cue' });

        if (endCueMode === 'deferred') {
          const deferred = createDeferred();
          pendingEndCues.push(deferred);
          return deferred.promise;
        }

        return Promise.resolve('ended');
      },
      stopActivePlayback() {
        calls.push({ type: 'stop' });
      },
      reset() {
        calls.push({ type: 'reset' });
      },
    },
  };
}

test('timeline orchestrator 會先送出 preparing，再在 intro 完成後送出 started', async () => {
  const session = createSessionHarness([
    { label: '準備放鬆', seconds: 3 },
  ]);
  const scheduler = createScheduler();
  const narration = createNarrationPlayerHarness({ introMode: 'deferred' });
  const events = [];

  const orchestrator = createTimelineOrchestrator({
    sessionController: session,
    getNarrationPlayer: () => narration.player,
    hasNarrationAudio: () => true,
    setIntervalFn: scheduler.setInterval,
    clearIntervalFn: scheduler.clearInterval,
    onPhasePreparing({ phase }) {
      events.push(`preparing:${phase.label}`);
    },
    onPhaseStarted({ phase }) {
      events.push(`started:${phase.label}`);
    },
  });

  const startPromise = orchestrator.start();
  await nextTurn();

  assert.deepEqual(events, ['preparing:準備放鬆']);
  assert.equal(orchestrator.isPreparing(), true);
  assert.equal(session.getState().isRunning, false);

  narration.pendingIntros[0].resolve();
  await startPromise;

  assert.deepEqual(events, ['preparing:準備放鬆', 'started:準備放鬆']);
  assert.equal(orchestrator.isPreparing(), false);
  assert.equal(session.getState().isRunning, true);
  assert.equal(scheduler.getActiveIntervalIds().length, 1);
});

test('timeline orchestrator 支援 pause 後以 cue-only resume，且不重設目前秒數', async () => {
  const session = createSessionHarness([
    { label: '準備放鬆', seconds: 3 },
  ]);
  const scheduler = createScheduler();
  const narration = createNarrationPlayerHarness();

  const orchestrator = createTimelineOrchestrator({
    sessionController: session,
    getNarrationPlayer: () => narration.player,
    hasNarrationAudio: () => true,
    setIntervalFn: scheduler.setInterval,
    clearIntervalFn: scheduler.clearInterval,
  });

  await orchestrator.start({ playbackMode: 'full' });
  const [intervalId] = scheduler.getActiveIntervalIds();
  await scheduler.tick(intervalId);
  assert.equal(session.getState().remainingSeconds, 2);

  const pauseResult = orchestrator.pause();
  assert.equal(pauseResult.kind, 'paused-running');
  assert.equal(session.getState().remainingSeconds, 2);
  assert.equal(session.getState().isRunning, false);
  assert.equal(scheduler.getActiveIntervalIds().length, 0);

  await orchestrator.start({ playbackMode: 'cue-only' });

  assert.deepEqual(
    narration.calls.filter((call) => call.type === 'intro').map((call) => call.playbackMode),
    ['full', 'cue-only'],
  );
  assert.equal(session.getState().remainingSeconds, 2);
  assert.equal(session.getState().isRunning, true);
  assert.equal(scheduler.getActiveIntervalIds().length, 1);
});

test('timeline orchestrator 在 skip 時會取消舊 sequence，不讓舊 intro 完成後回來啟動倒數', async () => {
  const session = createSessionHarness([
    { label: '準備放鬆', seconds: 3 },
    { label: '正式收縮', seconds: 5 },
  ]);
  const scheduler = createScheduler();
  const narration = createNarrationPlayerHarness({ introMode: 'deferred' });
  const events = [];

  const orchestrator = createTimelineOrchestrator({
    sessionController: session,
    getNarrationPlayer: () => narration.player,
    hasNarrationAudio: () => true,
    setIntervalFn: scheduler.setInterval,
    clearIntervalFn: scheduler.clearInterval,
    onPhasePreparing({ phase }) {
      events.push(`preparing:${phase.label}`);
    },
    onPhaseStarted({ phase }) {
      events.push(`started:${phase.label}`);
    },
  });

  const startPromise = orchestrator.start();
  await nextTurn();

  const skipResult = orchestrator.skip();
  assert.equal(skipResult.kind, 'phase-skipped');
  assert.equal(session.getState().currentPhaseIndex, 1);
  assert.equal(scheduler.getActiveIntervalIds().length, 0);

  narration.pendingIntros[0].resolve();
  await startPromise;

  assert.deepEqual(events, ['preparing:準備放鬆']);
  assert.equal(orchestrator.isPreparing(), false);
  assert.equal(scheduler.getActiveIntervalIds().length, 0);
  assert.deepEqual(
    narration.calls.filter((call) => call.type === 'stop').length,
    1,
  );
  assert.deepEqual(
    narration.calls.filter((call) => call.type === 'reset').length,
    1,
  );
});

test('timeline orchestrator 會在倒數中送出 tick / guidance，並在最後一段完成後送出 session completed', async () => {
  const session = createSessionHarness([
    { label: '準備放鬆', seconds: 2 },
  ]);
  const scheduler = createScheduler();
  const narration = createNarrationPlayerHarness({
    guidanceByElapsedSecond: {
      1: { text: '吸氣' },
    },
  });
  const events = [];

  const orchestrator = createTimelineOrchestrator({
    sessionController: session,
    getNarrationPlayer: () => narration.player,
    hasNarrationAudio: () => true,
    setIntervalFn: scheduler.setInterval,
    clearIntervalFn: scheduler.clearInterval,
    onPhasePreparing({ phase }) {
      events.push(`preparing:${phase.label}`);
    },
    onPhaseStarted({ phase }) {
      events.push(`started:${phase.label}`);
    },
    onTick({ state }) {
      events.push(`tick:${state.remainingSeconds}`);
    },
    onGuidance({ result }) {
      if (result?.text) {
        events.push(`guidance:${result.text}`);
      }
    },
    onPhaseCompleted({ phase }) {
      events.push(`completed:${phase.label}`);
    },
    onSessionCompleted() {
      events.push('session-complete');
    },
  });

  await orchestrator.start();
  const [intervalId] = scheduler.getActiveIntervalIds();

  await scheduler.tick(intervalId);
  await scheduler.tick(intervalId);

  assert.deepEqual(events, [
    'preparing:準備放鬆',
    'started:準備放鬆',
    'tick:1',
    'guidance:吸氣',
    'completed:準備放鬆',
    'session-complete',
  ]);
  assert.equal(session.getState().isComplete, true);
  assert.equal(session.getState().isRunning, false);
  assert.equal(scheduler.getActiveIntervalIds().length, 0);
});
