import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advancePhase,
  buildDailySession,
  buildNarrationEntries,
  findNarrationEntryByPhase,
  buildProgramCalendar,
  buildWorkoutPlan,
  createSessionState,
  createSessionStateFromPhases,
  formatClock,
  getNextPhaseIndex,
  resolveProgramDay,
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

test('createSessionStateFromPhases 會接受自訂階段陣列', () => {
  const state = createSessionStateFromPhases([
    { label: '準備放鬆', seconds: 60 },
    { label: '反向 Kegel', seconds: 120 },
  ]);

  assert.equal(state.currentPhaseIndex, 0);
  assert.equal(state.remainingSeconds, 60);
  assert.equal(state.phases.length, 2);
  assert.equal(state.phases[1].label, '反向 Kegel');
});

test('resolveProgramDay 會把日期換算成第幾週第幾天', () => {
  const firstDay = resolveProgramDay('2026-04-27', '2026-04-27');
  const laterDay = resolveProgramDay('2026-04-27', '2026-05-09');

  assert.equal(firstDay.weekNumber, 1);
  assert.equal(firstDay.dayNumber, 1);
  assert.equal(firstDay.dayOffset, 0);
  assert.equal(laterDay.weekNumber, 2);
  assert.equal(laterDay.dayNumber, 6);
  assert.equal(laterDay.dayOffset, 12);
});

test('buildProgramCalendar 會建立 42 天的完整日程表', () => {
  const calendar = buildProgramCalendar('2026-04-27');

  assert.equal(calendar.length, 42);
  assert.equal(calendar[0].date, '2026-04-27');
  assert.equal(calendar[0].weekNumber, 1);
  assert.equal(calendar[0].dayNumber, 1);
  assert.equal(calendar[41].date, '2026-06-07');
  assert.equal(calendar[41].weekNumber, 6);
  assert.equal(calendar[41].dayNumber, 7);
});

test('buildDailySession 會依週次與星期建立正式訓練內容', () => {
  const formalDay = buildDailySession(3, 5);
  const advancedKegelDay = buildDailySession(6, 1);

  assert.equal(formalDay.kind, 'formal');
  assert.match(formalDay.title, /正式訓練/);
  assert.match(formalDay.weekFocus, /第一次乾式波峰嘗試/);
  assert.ok(formalDay.phases.length >= 4);

  assert.equal(advancedKegelDay.kind, 'kegel');
  assert.ok(advancedKegelDay.phases.some((phase) => phase.label.includes('波峰模擬')));
});

test('buildNarrationEntries 會為課表建立可重用語音腳本與對應起始時間', () => {
  const session = {
    title: '正式訓練日',
    phases: [
      { label: '準備期', seconds: 120, cue: '呼吸、放鬆與設定今天只做地圖建立。' },
      { label: '第 1 回：到 5 分停', seconds: 180, cue: '穩定上升到 5 分後停止。' },
      { label: '收尾放鬆', seconds: 60, cue: '可正常結束，最後做呼吸與反向 Kegel。' },
    ],
  };

  const entries = buildNarrationEntries(session);

  assert.equal(entries.length, 3);
  assert.equal(entries[0].phaseIndex, 0);
  assert.equal(entries[0].startsAtSecond, 0);
  assert.equal(entries[1].phaseIndex, 1);
  assert.equal(entries[1].startsAtSecond, 120);
  assert.equal(entries[2].phaseIndex, 2);
  assert.equal(entries[2].startsAtSecond, 300);
  assert.match(entries[0].text, /現在開始：準備期/);
  assert.match(entries[1].text, /第 1 回：到 5 分停/);
});

test('findNarrationEntryByPhase 會找出目前段落對應的語音素材', () => {
  const entries = [
    { id: 'phase-01', phaseIndex: 0, text: 'A' },
    { id: 'phase-02', phaseIndex: 1, text: 'B' },
  ];

  assert.deepEqual(findNarrationEntryByPhase(entries, 1), { id: 'phase-02', phaseIndex: 1, text: 'B' });
  assert.equal(findNarrationEntryByPhase(entries, 2), null);
});
