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

function createScheduler({ startMs = 0 } = {}) {
  let nextIntervalId = 1;
  let nextTimeoutId = 1;
  let nowMs = startMs;
  const intervals = new Map();
  const timeouts = new Map();

  function nextDueEntry(targetMs) {
    let nextEntry = null;

    for (const [id, interval] of intervals.entries()) {
      if (interval.nextRunAt > targetMs) {
        continue;
      }
      if (!nextEntry || interval.nextRunAt < nextEntry.runAt || (interval.nextRunAt === nextEntry.runAt && id < nextEntry.id)) {
        nextEntry = { type: 'interval', id, runAt: interval.nextRunAt, entry: interval };
      }
    }

    for (const [id, timeout] of timeouts.entries()) {
      if (timeout.runAt > targetMs) {
        continue;
      }
      if (!nextEntry || timeout.runAt < nextEntry.runAt || (timeout.runAt === nextEntry.runAt && id < nextEntry.id)) {
        nextEntry = { type: 'timeout', id, runAt: timeout.runAt, entry: timeout };
      }
    }

    return nextEntry;
  }

  async function runDueCallbacksUntil(targetMs, { coalesce = false } = {}) {
    if (coalesce) {
      nowMs = targetMs;
      const dueIntervalEntries = [...intervals.entries()]
        .filter(([, interval]) => interval.nextRunAt <= targetMs)
        .sort((a, b) => a[1].nextRunAt - b[1].nextRunAt || a[0] - b[0]);
      const dueTimeoutEntries = [...timeouts.entries()]
        .filter(([, timeout]) => timeout.runAt <= targetMs)
        .sort((a, b) => a[1].runAt - b[1].runAt || a[0] - b[0]);

      for (const [id, timeout] of dueTimeoutEntries) {
        if (!timeouts.has(id)) {
          continue;
        }
        timeouts.delete(id);
        await timeout.callback();
      }

      for (const [id, interval] of dueIntervalEntries) {
        if (!intervals.has(id)) {
          continue;
        }
        interval.nextRunAt = targetMs + interval.delay;
        await interval.callback();
      }
      return;
    }

    while (true) {
      const dueEntry = nextDueEntry(targetMs);

      if (!dueEntry) {
        nowMs = targetMs;
        return;
      }

      nowMs = dueEntry.runAt;
      if (dueEntry.type === 'timeout') {
        timeouts.delete(dueEntry.id);
        await dueEntry.entry.callback();
        continue;
      }

      dueEntry.entry.nextRunAt += dueEntry.entry.delay;
      await dueEntry.entry.callback();
    }
  }

  return {
    now() {
      return nowMs;
    },
    setInterval(callback, delay) {
      const id = nextIntervalId;
      nextIntervalId += 1;
      intervals.set(id, { callback, delay, nextRunAt: nowMs + delay });
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
    setTimeout(callback, delay) {
      const id = nextTimeoutId;
      nextTimeoutId += 1;
      timeouts.set(id, { callback, delay, runAt: nowMs + delay });
      return id;
    },
    clearTimeout(id) {
      timeouts.delete(id);
    },
    getActiveIntervalIds() {
      return [...intervals.keys()];
    },
    getActiveTimeoutIds() {
      return [...timeouts.keys()];
    },
    async tick(id) {
      const interval = intervals.get(id);
      if (!interval) {
        throw new Error(`Unknown interval id: ${id}`);
      }
      nowMs = interval.nextRunAt;
      interval.nextRunAt += interval.delay;
      await interval.callback();
    },
    async advance(ms, options) {
      await runDueCallbacksUntil(nowMs + ms, options);
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
    nowFn: scheduler.now,
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
    nowFn: scheduler.now,
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
    nowFn: scheduler.now,
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

test('timeline orchestrator 會把 start cue 後的第 0 秒 guidance 延後一小段，但不延後倒數啟動', async () => {
  const session = createSessionHarness([
    { label: '準備放鬆', seconds: 5 },
  ]);
  const scheduler = createScheduler();
  const narration = createNarrationPlayerHarness({
    guidanceByElapsedSecond: {
      0: { text: '吸氣' },
    },
  });
  const guidanceCalls = [];

  const orchestrator = createTimelineOrchestrator({
    sessionController: session,
    getNarrationPlayer: () => narration.player,
    hasNarrationAudio: () => true,
    setIntervalFn: scheduler.setInterval,
    clearIntervalFn: scheduler.clearInterval,
    setTimeoutFn: scheduler.setTimeout,
    clearTimeoutFn: scheduler.clearTimeout,
    nowFn: scheduler.now,
    initialGuidanceDelayMs: 300,
    onGuidance({ elapsedSecond }) {
      guidanceCalls.push(elapsedSecond);
    },
  });

  await orchestrator.start();

  assert.equal(session.getState().isRunning, true);
  assert.equal(scheduler.getActiveIntervalIds().length, 1);
  assert.equal(scheduler.getActiveTimeoutIds().length, 1);
  assert.deepEqual(guidanceCalls, []);
  assert.deepEqual(
    narration.calls.filter((call) => call.type === 'guidance'),
    [],
  );

  await scheduler.advance(299);
  assert.deepEqual(guidanceCalls, []);

  await scheduler.advance(1);
  assert.deepEqual(guidanceCalls, [0]);
  assert.deepEqual(
    narration.calls.filter((call) => call.type === 'guidance').map((call) => call.elapsedSecond),
    [0],
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
    nowFn: scheduler.now,
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

test('timeline orchestrator 在取消流程時會優先使用 generic audio engine 的 stopAll', async () => {
  const session = createSessionHarness([
    { label: '準備放鬆', seconds: 3 },
    { label: '正式收縮', seconds: 5 },
  ]);
  const scheduler = createScheduler();
  const intro = createDeferred();
  const calls = [];
  const player = {
    playPhaseIntro() {
      calls.push('intro');
      return intro.promise.then(() => ({ phaseIndex: 0 }));
    },
    stopAll() {
      calls.push('stopAll');
    },
    reset() {
      calls.push('reset');
    },
  };

  const orchestrator = createTimelineOrchestrator({
    sessionController: session,
    getNarrationPlayer: () => player,
    hasNarrationAudio: () => true,
    setIntervalFn: scheduler.setInterval,
    clearIntervalFn: scheduler.clearInterval,
    nowFn: scheduler.now,
  });

  const startPromise = orchestrator.start();
  await nextTurn();

  const skipResult = orchestrator.skip();
  assert.equal(skipResult.kind, 'phase-skipped');
  assert.deepEqual(calls, ['intro', 'stopAll', 'reset']);

  intro.resolve();
  await startPromise;
  assert.equal(scheduler.getActiveIntervalIds().length, 0);
});

test('timeline orchestrator 在 heartbeat 延遲時，會用 monotonic clock 一次追上多秒而不是只掉 1 秒', async () => {
  const session = createSessionHarness([
    { label: '準備放鬆', seconds: 6 },
  ]);
  const scheduler = createScheduler();
  const ticks = [];
  const guidanceCalls = [];
  const narration = createNarrationPlayerHarness({
    guidanceByElapsedSecond: {
      1: { text: '吸' },
      2: { text: '停' },
      3: { text: '吐' },
    },
  });

  const orchestrator = createTimelineOrchestrator({
    sessionController: session,
    getNarrationPlayer: () => narration.player,
    hasNarrationAudio: () => true,
    setIntervalFn: scheduler.setInterval,
    clearIntervalFn: scheduler.clearInterval,
    nowFn: scheduler.now,
    onTick({ state, elapsedSecond }) {
      ticks.push({ remainingSeconds: state.remainingSeconds, elapsedSecond });
    },
    onGuidance({ elapsedSecond }) {
      guidanceCalls.push(elapsedSecond);
    },
  });

  await orchestrator.start();
  assert.equal(session.getState().remainingSeconds, 6);

  await scheduler.advance(3200, { coalesce: true });

  assert.equal(session.getState().remainingSeconds, 3);
  assert.deepEqual(ticks.map((item) => item.remainingSeconds), [5, 4, 3]);
  assert.deepEqual(ticks.map((item) => item.elapsedSecond), [1, 2, 3]);
  assert.deepEqual(guidanceCalls, [1, 2, 3]);
});
