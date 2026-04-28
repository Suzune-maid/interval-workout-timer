import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNarrationEntries,
  buildProgramCalendar,
  createSelectedDayState,
  createSessionStateFromPhases,
  formatClock,
  selectCalendarEntry,
} from '../timer-core.js';
import { FakeDocument, collectByDatasetValue } from './support/fake-dom.js';
import { collectDomRefs } from '../dom-refs.js';
import { createSessionController } from '../session-controller.js';
import { renderSchedule, renderStaticContent } from '../schedule-view.js';
import {
  renderGuidanceLive,
  renderNarrationInfo,
  renderPhasePlan,
  renderTimer,
} from '../timer-view.js';

function createRefs() {
  const ids = [
    'today-date',
    'today-weekday',
    'today-focus',
    'today-summary',
    'today-title',
    'today-duration',
    'today-notes',
    'phase-label',
    'phase-progress',
    'phase-cue',
    'time-display',
    'status-message',
    'phase-plan',
    'schedule-grid',
    'narration-status',
    'narration-text',
    'guidance-live',
    'start-button',
    'pause-button',
    'reset-button',
    'skip-button',
  ];

  const document = new FakeDocument(ids);
  globalThis.document = document;
  return { document, refs: collectDomRefs(document) };
}

function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

test('collectDomRefs 會回傳 app 初始化需要的所有 DOM refs', () => {
  const { refs } = createRefs();

  assert.ok(refs.todayDateElement);
  assert.ok(refs.todayWeekdayElement);
  assert.ok(refs.todayFocusElement);
  assert.ok(refs.todaySummaryElement);
  assert.ok(refs.todayTitleElement);
  assert.ok(refs.todayDurationElement);
  assert.ok(refs.todayNotesElement);
  assert.ok(refs.phaseLabel);
  assert.ok(refs.phaseProgress);
  assert.ok(refs.phaseCue);
  assert.ok(refs.timeDisplay);
  assert.ok(refs.statusMessage);
  assert.ok(refs.phasePlan);
  assert.ok(refs.scheduleGrid);
  assert.ok(refs.narrationStatusElement);
  assert.ok(refs.narrationTextElement);
  assert.ok(refs.guidanceLiveElement);
  assert.ok(refs.startButton);
  assert.ok(refs.pauseButton);
  assert.ok(refs.resetButton);
  assert.ok(refs.skipButton);
});

test('createSessionController 會同步 selected day、fallback narration 與 session state', () => {
  const calendar = buildProgramCalendar('2026-04-27');
  const todayInfo = { dayOffset: 0, isAfterProgram: false };
  const controller = createSessionController({
    calendar,
    todayInfo,
    todayEntry: calendar[0],
  });

  assert.equal(controller.selectedEntry().dayOffset, 0);
  assert.equal(controller.getState().remainingSeconds, calendar[0].session.phases[0].seconds);
  assert.equal(controller.getFallbackNarrationEntries().length, calendar[0].session.phases.length);

  controller.switchSelectedDay(2);

  assert.equal(controller.selectedEntry().dayOffset, 2);
  assert.equal(controller.getState().remainingSeconds, calendar[2].session.phases[0].seconds);
  assert.equal(controller.getFallbackNarrationEntries().length, calendar[2].session.phases.length);

  controller.resetSessionState();
  assert.equal(controller.getState().currentPhaseIndex, 0);
  assert.equal(controller.getState().remainingSeconds, calendar[2].session.phases[0].seconds);
});

test('renderStaticContent 與 renderSchedule 會根據 selected day 更新畫面與按鈕狀態', () => {
  const calendar = buildProgramCalendar('2026-04-27');
  const todayInfo = { dayOffset: 0, isAfterProgram: false };
  const { refs } = createRefs();
  const daySelection = selectCalendarEntry(createSelectedDayState(calendar, 0), 2);
  const entry = daySelection.entry;
  const clicks = [];

  renderStaticContent({
    refs,
    entry,
    todayInfo,
    todayEntry: calendar[0],
    formatDisplayDate,
  });

  renderSchedule({
    refs,
    calendar,
    todayInfo,
    daySelection,
    formatDisplayDate,
    onSelectDay(dayOffset) {
      clicks.push(dayOffset);
    },
  });

  const selectedButton = collectByDatasetValue(refs.scheduleGrid, 'dayOffset', 2);
  const todayButton = collectByDatasetValue(refs.scheduleGrid, 'dayOffset', 0);

  assert.equal(refs.todayTitleElement.textContent, entry.session.title);
  assert.equal(refs.todaySummaryElement.textContent, entry.session.summary);
  assert.equal(refs.todayWeekdayElement.textContent, `第 ${entry.weekNumber} 週・第 ${entry.dayNumber} 天（週${entry.weekdayLabel}）`);
  assert.equal(refs.todayDurationElement.textContent, `建議時間：${entry.session.durationLabel}`);
  assert.equal(refs.todayNotesElement.children.length, entry.session.notes.length);
  assert.ok(selectedButton.classList.contains('selected'));
  assert.equal(selectedButton.getAttribute('aria-pressed'), 'true');
  assert.ok(todayButton.classList.contains('current'));

  selectedButton.click();
  assert.deepEqual(clicks, [2]);
});

test('renderTimer / renderPhasePlan / renderNarrationInfo / renderGuidanceLive 會正確反映 session state', () => {
  const calendar = buildProgramCalendar('2026-04-27');
  const entry = calendar[0];
  const { refs } = createRefs();
  const state = createSessionStateFromPhases(entry.session.phases);
  const currentPhase = state.phases[state.currentPhaseIndex];
  const narrationEntries = buildNarrationEntries(entry.session);
  const narrationEntry = {
    ...narrationEntries[0],
    audioDurationSeconds: 12,
    countdownGuidance: {
      summary: '每 30 秒提醒放鬆下顎與肩膀。',
    },
  };

  renderTimer({
    refs,
    state,
    isPreparingPhase: false,
    currentPhase,
    formatClock,
  });

  renderPhasePlan({
    refs,
    state,
    formatClock,
  });

  renderNarrationInfo({
    refs,
    entry: narrationEntry,
    hasNarrationAudio: true,
    formatClock,
  });

  renderGuidanceLive({
    refs,
    entry: narrationEntry,
    hasNarrationAudio: true,
  });

  assert.equal(refs.phaseLabel.textContent, currentPhase.label);
  assert.equal(refs.phaseProgress.textContent, `第 1 / ${state.phases.length} 段`);
  assert.equal(refs.phaseCue.textContent, currentPhase.cue);
  assert.equal(refs.timeDisplay.textContent, formatClock(state.remainingSeconds));
  assert.equal(refs.startButton.disabled, false);
  assert.equal(refs.pauseButton.disabled, true);
  assert.equal(refs.phasePlan.children.length, state.phases.length);
  assert.ok(refs.phasePlan.children[0].classList.contains('active'));
  assert.match(refs.narrationStatusElement.textContent, /^語音起點：/);
  assert.equal(refs.narrationTextElement.textContent, narrationEntry.text);
  assert.equal(refs.guidanceLiveElement.textContent, `倒數中會依節奏播放：${narrationEntry.countdownGuidance.summary}`);
});

test('renderNarrationInfo 與 renderGuidanceLive 在 fallback 模式會顯示文字腳本提示', () => {
  const calendar = buildProgramCalendar('2026-04-27');
  const entry = calendar[2];
  const { refs } = createRefs();
  const narrationEntry = {
    ...buildNarrationEntries(entry.session)[0],
    countdownGuidance: {
      summary: '每 30 秒提醒放鬆下顎與肩膀。',
    },
  };

  renderNarrationInfo({
    refs,
    entry: narrationEntry,
    hasNarrationAudio: false,
  });

  renderGuidanceLive({
    refs,
    entry: narrationEntry,
    hasNarrationAudio: false,
  });

  assert.equal(refs.narrationStatusElement.textContent, '這一天目前只有文字腳本，尚未對應專用語音素材。');
  assert.equal(refs.narrationTextElement.textContent, narrationEntry.text);
  assert.equal(refs.guidanceLiveElement.textContent, '倒數中會依節奏播放：每 30 秒提醒放鬆下顎與肩膀。');
});
