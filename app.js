import {
  advancePhase,
  buildProgramCalendar,
  createSessionStateFromPhases,
  formatClock,
  resolveProgramDay,
} from './timer-core.js';

const PROGRAM_START_DATE = '2026-04-27';

const todayDateElement = document.querySelector('#today-date');
const todayWeekdayElement = document.querySelector('#today-weekday');
const todayFocusElement = document.querySelector('#today-focus');
const todaySummaryElement = document.querySelector('#today-summary');
const todayTitleElement = document.querySelector('#today-title');
const todayDurationElement = document.querySelector('#today-duration');
const todayNotesElement = document.querySelector('#today-notes');
const phaseLabel = document.querySelector('#phase-label');
const phaseProgress = document.querySelector('#phase-progress');
const phaseCue = document.querySelector('#phase-cue');
const timeDisplay = document.querySelector('#time-display');
const statusMessage = document.querySelector('#status-message');
const phasePlan = document.querySelector('#phase-plan');
const scheduleGrid = document.querySelector('#schedule-grid');
const startButton = document.querySelector('#start-button');
const pauseButton = document.querySelector('#pause-button');
const resetButton = document.querySelector('#reset-button');
const skipButton = document.querySelector('#skip-button');

const calendar = buildProgramCalendar(PROGRAM_START_DATE);
const todayInfo = resolveProgramDay(PROGRAM_START_DATE, getLocalDateString(new Date()));
const todayEntry = calendar[todayInfo.dayOffset];

let state = createSessionStateFromPhases(todayEntry.session.phases);
let timerId = null;

renderStaticContent();
renderTimer();
renderPhasePlan();
renderSchedule();

startButton.addEventListener('click', () => {
  if (state.isComplete) {
    state = createSessionStateFromPhases(todayEntry.session.phases);
  }

  if (timerId) {
    return;
  }

  state = {
    ...state,
    isRunning: true,
  };
  statusMessage.textContent = `開始 ${currentPhase()?.label ?? todayEntry.session.title}。維持節奏，照著今天的課表走。`;
  renderTimer();
  renderPhasePlan();

  timerId = window.setInterval(() => {
    if (state.remainingSeconds > 1) {
      state = {
        ...state,
        remainingSeconds: state.remainingSeconds - 1,
      };
      renderTimer();
      return;
    }

    state = advancePhase(state);

    if (state.isComplete) {
      stopTimer();
      statusMessage.textContent = '今日課表已跑完。接下來只要做收尾放鬆與身體掃描就好。';
    } else {
      state = {
        ...state,
        isRunning: true,
      };
      statusMessage.textContent = `切換到 ${currentPhase().label}。記得照著提示，不要急。`;
    }

    renderTimer();
    renderPhasePlan();
  }, 1000);
});

pauseButton.addEventListener('click', () => {
  if (!timerId) {
    return;
  }

  stopTimer();
  state = {
    ...state,
    isRunning: false,
  };
  statusMessage.textContent = '已暫停。重新開始前，先把呼吸放慢。';
  renderTimer();
});

resetButton.addEventListener('click', () => {
  stopTimer();
  state = createSessionStateFromPhases(todayEntry.session.phases);
  statusMessage.textContent = '已重設為今天的起始課表。';
  renderTimer();
  renderPhasePlan();
});

skipButton.addEventListener('click', () => {
  stopTimer();
  state = advancePhase(state);

  if (state.isComplete) {
    statusMessage.textContent = '已跳到今日課表最後。今天的主要流程完成。';
  } else {
    statusMessage.textContent = `已切換到 ${currentPhase().label}。`;
  }

  renderTimer();
  renderPhasePlan();
});

function renderStaticContent() {
  todayDateElement.textContent = formatDisplayDate(todayEntry.date);
  todayWeekdayElement.textContent = `第 ${todayEntry.weekNumber} 週・第 ${todayEntry.dayNumber} 天（週${todayEntry.weekdayLabel}）`;
  todayFocusElement.textContent = todayEntry.session.weekFocus;
  todaySummaryElement.textContent = todayEntry.session.summary;
  todayTitleElement.textContent = todayEntry.session.title;
  todayDurationElement.textContent = `建議時間：${todayEntry.session.durationLabel}`;

  todayNotesElement.innerHTML = '';
  todayEntry.session.notes.forEach((note) => {
    const item = document.createElement('li');
    item.textContent = note;
    todayNotesElement.appendChild(item);
  });

  if (todayInfo.isAfterProgram) {
    statusMessage.textContent = '6 週主計畫已走完，目前先停在最後一天內容，若要再跑一輪可之後改起始日。';
  }
}

function renderTimer() {
  const phase = currentPhase();
  const totalPhases = state.phases.length;

  phaseLabel.textContent = phase?.label ?? '今日課表完成';
  phaseProgress.textContent = state.isComplete
    ? `共 ${totalPhases} 段，已完成`
    : `第 ${state.currentPhaseIndex + 1} / ${totalPhases} 段`;
  phaseCue.textContent = phase?.cue ?? '今天的階段都已完成，最後做身體掃描即可。';
  timeDisplay.textContent = formatClock(state.remainingSeconds);
  pauseButton.disabled = !state.isRunning;
}

function renderPhasePlan() {
  phasePlan.innerHTML = '';

  state.phases.forEach((phase, index) => {
    const item = document.createElement('li');
    item.className = 'phase-item';

    if (index < state.currentPhaseIndex || state.isComplete) {
      item.classList.add('complete');
    }

    if (!state.isComplete && index === state.currentPhaseIndex) {
      item.classList.add('active');
    }

    item.innerHTML = `
      <div class="phase-line">
        <strong>${phase.label}</strong>
        <span>${formatClock(phase.seconds)}</span>
      </div>
      <p>${phase.cue ?? ''}</p>
    `;

    phasePlan.appendChild(item);
  });
}

function renderSchedule() {
  scheduleGrid.innerHTML = '';

  const weeks = groupByWeek(calendar);

  weeks.forEach((weekEntries, weekIndex) => {
    const weekCard = document.createElement('section');
    weekCard.className = 'week-card';

    const heading = document.createElement('div');
    heading.className = 'week-heading';
    heading.innerHTML = `
      <h3>第 ${weekIndex + 1} 週</h3>
      <p>${weekEntries[0].session.weekFocus}</p>
    `;
    weekCard.appendChild(heading);

    const list = document.createElement('div');
    list.className = 'week-list';

    weekEntries.forEach((entry) => {
      const item = document.createElement('article');
      item.className = 'day-card';

      if (entry.dayOffset < todayInfo.dayOffset) {
        item.classList.add('past');
      }

      if (entry.dayOffset === todayInfo.dayOffset) {
        item.classList.add('current');
      }

      item.innerHTML = `
        <p class="day-top">第 ${entry.dayNumber} 天・週${entry.weekdayLabel}</p>
        <h4>${entry.session.title}</h4>
        <p class="day-date">${formatDisplayDate(entry.date)}</p>
        <p class="day-summary">${entry.session.summary}</p>
        <p class="day-duration">${entry.session.durationLabel}</p>
      `;

      list.appendChild(item);
    });

    weekCard.appendChild(list);
    scheduleGrid.appendChild(weekCard);
  });
}

function currentPhase() {
  return state.phases[state.currentPhaseIndex] ?? null;
}

function stopTimer() {
  if (!timerId) {
    return;
  }

  window.clearInterval(timerId);
  timerId = null;
}

function groupByWeek(entries) {
  const groups = [];

  entries.forEach((entry) => {
    const index = entry.weekNumber - 1;
    groups[index] ??= [];
    groups[index].push(entry);
  });

  return groups;
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}
