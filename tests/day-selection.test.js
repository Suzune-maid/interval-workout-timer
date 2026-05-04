import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProgramCalendar,
  createSelectedDayState,
  selectCalendarEntry,
  selectCalendarWeek,
} from '../timer-core.js';

test('createSelectedDayState 會用指定日建立目前選取日程', () => {
  const calendar = buildProgramCalendar('2026-04-27');
  const selected = createSelectedDayState(calendar, 10);

  assert.equal(selected.selectedDayOffset, 10);
  assert.equal(selected.entry.date, '2026-05-07');
  assert.equal(selected.entry.weekNumber, 2);
  assert.equal(selected.entry.dayNumber, 4);
  assert.equal(selected.visibleWeekNumber, 2);
});

test('selectCalendarEntry 會切換到點選的日程，並保留今日資訊方便標示', () => {
  const calendar = buildProgramCalendar('2026-04-27');
  const initial = createSelectedDayState(calendar, 0);
  const next = selectCalendarEntry(initial, 13);

  assert.equal(next.selectedDayOffset, 13);
  assert.equal(next.entry.date, '2026-05-10');
  assert.equal(next.entry.session.title, calendar[13].session.title);
  assert.equal(next.visibleWeekNumber, 2);
  assert.equal(initial.selectedDayOffset, 0);
  assert.equal(initial.visibleWeekNumber, 1);
});

test('selectCalendarEntry 超出範圍時會夾在可用日程範圍內', () => {
  const calendar = buildProgramCalendar('2026-04-27');
  const initial = createSelectedDayState(calendar, 3);

  const beforeStart = selectCalendarEntry(initial, -99);
  const afterEnd = selectCalendarEntry(initial, 999);

  assert.equal(beforeStart.selectedDayOffset, 0);
  assert.equal(beforeStart.entry.date, '2026-04-27');
  assert.equal(beforeStart.visibleWeekNumber, 1);
  assert.equal(afterEnd.selectedDayOffset, 41);
  assert.equal(afterEnd.entry.date, '2026-06-07');
  assert.equal(afterEnd.visibleWeekNumber, 6);
});

test('selectCalendarWeek 會只切換目前瀏覽週次，保留已選取的日程', () => {
  const calendar = buildProgramCalendar('2026-04-27');
  const initial = createSelectedDayState(calendar, 2);
  const moved = selectCalendarWeek(initial, 5);

  assert.equal(moved.selectedDayOffset, 2);
  assert.equal(moved.entry.date, '2026-04-29');
  assert.equal(moved.visibleWeekNumber, 5);
  assert.equal(initial.visibleWeekNumber, 1);
});

test('selectCalendarWeek 超出範圍時會夾在第 1 週到最後一週之間', () => {
  const calendar = buildProgramCalendar('2026-04-27');
  const initial = createSelectedDayState(calendar, 2);

  const beforeStart = selectCalendarWeek(initial, -99);
  const afterEnd = selectCalendarWeek(initial, 999);

  assert.equal(beforeStart.visibleWeekNumber, 1);
  assert.equal(afterEnd.visibleWeekNumber, 6);
  assert.equal(afterEnd.selectedDayOffset, 2);
});
