import {
  advancePhase,
  buildNarrationEntries,
  createSelectedDayState,
  createSessionStateFromPhases,
  selectCalendarEntry,
  selectCalendarWeek,
} from './timer-core.js';

export function createSessionController({ calendar, todayInfo, todayEntry }) {
  let daySelection = createSelectedDayState(calendar, todayInfo?.dayOffset ?? 0);
  let fallbackNarrationEntries = buildNarrationEntries(selectedEntry().session);
  let state = createSessionStateFromPhases(selectedEntry().session.phases);

  function selectedEntry() {
    return daySelection.entry ?? todayEntry;
  }

  function switchSelectedDay(dayOffset) {
    daySelection = selectCalendarEntry(daySelection, dayOffset);
    fallbackNarrationEntries = buildNarrationEntries(selectedEntry().session);
    state = createSessionStateFromPhases(selectedEntry().session.phases);
    return selectedEntry();
  }

  function switchVisibleWeek(weekNumber) {
    daySelection = selectCalendarWeek(daySelection, weekNumber);
    return daySelection;
  }

  function resetSessionState() {
    state = createSessionStateFromPhases(selectedEntry().session.phases);
    return state;
  }

  function setState(nextState) {
    state = nextState;
    return state;
  }

  function advanceSessionPhase() {
    state = advancePhase(state);
    return state;
  }

  return {
    getCalendar() {
      return calendar;
    },
    getTodayInfo() {
      return todayInfo;
    },
    getDaySelection() {
      return daySelection;
    },
    getState() {
      return state;
    },
    setState,
    advancePhase: advanceSessionPhase,
    selectedEntry,
    switchSelectedDay,
    switchVisibleWeek,
    resetSessionState,
    getFallbackNarrationEntries() {
      return fallbackNarrationEntries;
    },
  };
}
