import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProgramCalendar,
  createSelectedDayState,
  selectCalendarEntry,
} from '../timer-core.js';

test('createSelectedDayState 會用指定日建立目前選取日程', () => {
  const calendar = buildProgramCalendar('2026-04-27');
  const selected = createSelectedDayState(calendar, 10);

  assert.equal(selected.selectedDayOffset, 10);
  assert.equal(selected.entry.date, '2026-05-07');
  assert.equal(selected.entry.weekNumber, 2);
  assert.equal(selected.entry.dayNumber, 4);
});

test('selectCalendarEntry 會切換到點選的日程，並保留今日資訊方便標示', () => {
  const calendar = buildProgramCalendar('2026-04-27');
  const initial = createSelectedDayState(calendar, 0);
  const next = selectCalendarEntry(initial, 13);

  assert.equal(next.selectedDayOffset, 13);
  assert.equal(next.entry.date, '2026-05-10');
  assert.equal(next.entry.session.title, calendar[13].session.title);
  assert.equal(initial.selectedDayOffset, 0);
});

test('selectCalendarEntry 超出範圍時會夾在可用日程範圍內', () => {
  const calendar = buildProgramCalendar('2026-04-27');
  const initial = createSelectedDayState(calendar, 3);

  const beforeStart = selectCalendarEntry(initial, -99);
  const afterEnd = selectCalendarEntry(initial, 999);

  assert.equal(beforeStart.selectedDayOffset, 0);
  assert.equal(beforeStart.entry.date, '2026-04-27');
  assert.equal(afterEnd.selectedDayOffset, 41);
  assert.equal(afterEnd.entry.date, '2026-06-07');
});
