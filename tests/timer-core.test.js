import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advancePhase,
  buildWorkoutPlan,
  createSessionState,
  formatClock,
  getNextPhaseIndex,
} from '../timer-core.js';

test('buildWorkoutPlan 會建立訓練與休息交錯的流程，最後一回合不追加休息', () => {
  const phases = buildWorkoutPlan({ trainSeconds: 40, restSeconds: 20, rounds: 3 });

  assert.deepEqual(
    phases.map((phase) => ({
      type: phase.type,
      label: phase.label,
      seconds: phase.seconds,
      round: phase.round,
    })),
    [
      { type: 'train', label: '訓練 1', seconds: 40, round: 1 },
      { type: 'rest', label: '放鬆 1', seconds: 20, round: 1 },
      { type: 'train', label: '訓練 2', seconds: 40, round: 2 },
      { type: 'rest', label: '放鬆 2', seconds: 20, round: 2 },
      { type: 'train', label: '訓練 3', seconds: 40, round: 3 },
    ],
  );
});

test('formatClock 會把秒數格式化成 mm:ss', () => {
  assert.equal(formatClock(0), '00:00');
  assert.equal(formatClock(9), '00:09');
  assert.equal(formatClock(65), '01:05');
});

test('getNextPhaseIndex 會回傳下一個階段索引，最後一段回傳 null', () => {
  const phases = buildWorkoutPlan({ trainSeconds: 30, restSeconds: 15, rounds: 2 });

  assert.equal(getNextPhaseIndex(0, phases), 1);
  assert.equal(getNextPhaseIndex(1, phases), 2);
  assert.equal(getNextPhaseIndex(2, phases), null);
});

test('createSessionState 會建立初始計時狀態', () => {
  const state = createSessionState({ trainSeconds: 45, restSeconds: 15, rounds: 2 });

  assert.equal(state.currentPhaseIndex, 0);
  assert.equal(state.remainingSeconds, 45);
  assert.equal(state.isRunning, false);
  assert.equal(state.isComplete, false);
  assert.equal(state.phases.length, 3);
  assert.equal(state.phases[0].label, '訓練 1');
});

test('advancePhase 會前往下一階段，最後一段後標記完成', () => {
  const initial = createSessionState({ trainSeconds: 30, restSeconds: 10, rounds: 2 });
  const afterFirst = advancePhase(initial);
  const afterSecond = advancePhase(afterFirst);
  const completed = advancePhase(afterSecond);

  assert.equal(afterFirst.currentPhaseIndex, 1);
  assert.equal(afterFirst.remainingSeconds, 10);
  assert.equal(afterSecond.currentPhaseIndex, 2);
  assert.equal(afterSecond.remainingSeconds, 30);
  assert.equal(completed.currentPhaseIndex, 2);
  assert.equal(completed.remainingSeconds, 0);
  assert.equal(completed.isRunning, false);
  assert.equal(completed.isComplete, true);
});
