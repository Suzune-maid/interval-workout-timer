import {
  advancePhase,
  buildNarrationEntries,
  buildProgramCalendar,
  createSessionStateFromPhases,
  findNarrationEntryByPhase,
  formatClock,
  resolveProgramDay,
} from './timer-core.js';
import { createNarrationPlayer, loadNarrationManifest } from './audio-player.js';

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
const narrationStatusElement = document.querySelector('#narration-status');
const narrationTextElement = document.querySelector('#narration-text');
const guidanceLiveElement = document.querySelector('#guidance-live');
const startButton = document.querySelector('#start-button');
const pauseButton = document.querySelector('#pause-button');
const resetButton = document.querySelector('#reset-button');
const skipButton = document.querySelector('#skip-button');

const calendar = buildProgramCalendar(PROGRAM_START_DATE);
const todayInfo = resolveProgramDay(PROGRAM_START_DATE, getLocalDateString(new Date()));
const todayEntry = calendar[todayInfo.dayOffset];
const fallbackNarrationEntries = buildNarrationEntries(todayEntry.session);

let state = createSessionStateFromPhases(todayEntry.session.phases);
let timerId = null;
let narrationPlayer = null;
let narrationManifest = null;
let isPreparingPhase = false;
let phaseSequenceId = 0;

renderStaticContent();
renderTimer();
renderPhasePlan();
renderSchedule();
renderNarrationInfo();
renderGuidanceLive();
initializeNarration().catch((error) => {
  narrationStatusElement.textContent = '語音素材讀取失敗，先顯示腳本內容。';
  narrationTextElement.textContent = error.message;
  renderGuidanceLive();
});

startButton.addEventListener('click', async () => {
  if (state.isComplete) {
    cancelActiveTimeline({ resetNarration: true });
    state = createSessionStateFromPhases(todayEntry.session.phases);
    renderTimer();
    renderPhasePlan();
    renderNarrationInfo();
  }

  if (timerId || isPreparingPhase) {
    return;
  }

  await beginPhaseCountdown({
    playbackMode: shouldReplayNarrationForCurrentPhase() ? 'full' : 'cue-only',
  });
});

pauseButton.addEventListener('click', () => {
  if (isPreparingPhase) {
    cancelActiveTimeline({ resetNarration: true });
    state = {
      ...state,
      isRunning: false,
    };
    statusMessage.textContent = '已暫停，目前停在倒數開始前。';
    renderTimer();
    renderGuidanceLive();
    return;
  }

  if (!timerId) {
    return;
  }

  cancelActiveTimeline();
  state = {
    ...state,
    isRunning: false,
  };
  statusMessage.textContent = '已暫停。重新開始時會先播開始音效，再繼續倒數。';
  renderTimer();
  renderGuidanceLive();
});

resetButton.addEventListener('click', () => {
  cancelActiveTimeline({ resetNarration: true });
  state = createSessionStateFromPhases(todayEntry.session.phases);
  statusMessage.textContent = '已重設為今天的起始課表。';
  renderTimer();
  renderPhasePlan();
  renderNarrationInfo();
  renderGuidanceLive();
});

skipButton.addEventListener('click', () => {
  cancelActiveTimeline({ resetNarration: true });
  state = advancePhase(state);

  if (state.isComplete) {
    statusMessage.textContent = '已跳到今日課表最後。今天的主要流程完成。';
  } else {
    statusMessage.textContent = `已切換到 ${currentPhase().label}。按開始後會先播階段說明，再開始倒數。`;
  }

  renderTimer();
  renderPhasePlan();
  renderNarrationInfo();
  renderGuidanceLive();
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
  startButton.disabled = state.isRunning || isPreparingPhase;
  pauseButton.disabled = !state.isRunning && !isPreparingPhase;
}

function renderNarrationInfo() {
  const entry = currentNarrationEntry();

  if (!entry) {
    narrationStatusElement.textContent = '目前沒有對應語音。';
    narrationTextElement.textContent = '若之後要補更多日期，只要沿用同樣的 manifest 格式即可。';
    return;
  }

  const guidanceSummary = entry.countdownGuidance?.summary
    ? ` ｜ 倒數引導：${entry.countdownGuidance.summary}`
    : '';

  narrationStatusElement.textContent = `語音起點：${formatClock(entry.startsAtSecond)} ｜ 音檔長度：約 ${entry.audioDurationSeconds ?? '未記錄'} 秒${guidanceSummary}`;
  narrationTextElement.textContent = entry.text;
}

function renderGuidanceLive(message) {
  if (!guidanceLiveElement) {
    return;
  }

  const entry = currentNarrationEntry();
  const guidance = entry?.countdownGuidance;

  if (message) {
    guidanceLiveElement.textContent = message;
    return;
  }

  if (!guidance) {
    guidanceLiveElement.textContent = '這一段目前沒有倒數中的教練引導語音。';
    return;
  }

  guidanceLiveElement.textContent = `倒數中會依節奏播放：${guidance.summary}`;
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

async function initializeNarration() {
  narrationManifest = await loadNarrationManifest();
  narrationPlayer = createNarrationPlayer(narrationManifest);
  renderNarrationInfo();
  renderGuidanceLive();
}

function currentNarrationEntry() {
  const phaseIndex = state.currentPhaseIndex;
  const manifestEntries = narrationManifest?.entries ?? fallbackNarrationEntries;
  return findNarrationEntryByPhase(manifestEntries, phaseIndex);
}

async function beginPhaseCountdown({ playbackMode = 'full' } = {}) {
  const phase = currentPhase();

  if (!phase || state.isComplete) {
    return;
  }

  const sequenceId = ++phaseSequenceId;
  isPreparingPhase = true;
  state = {
    ...state,
    isRunning: false,
  };
  statusMessage.textContent = playbackMode === 'full'
    ? `先播放 ${phase.label} 的階段說明與開始音效，之後才會開始倒數。`
    : `準備恢復 ${phase.label}，先播放開始音效。`;
  renderTimer();
  renderPhasePlan();
  renderGuidanceLive();

  await playPhaseIntroForCurrentPhase(playbackMode);

  if (sequenceId !== phaseSequenceId || state.isComplete) {
    return;
  }

  isPreparingPhase = false;
  state = {
    ...state,
    isRunning: true,
  };
  statusMessage.textContent = playbackMode === 'full'
    ? `${phase.label} 開始倒數。`
    : `${phase.label} 已恢復倒數。`;
  renderTimer();
  renderPhasePlan();
  renderGuidanceLive();
  void maybePlayCountdownGuidance(phase.phaseIndex ?? state.currentPhaseIndex, 0, sequenceId);
  startCountdownLoop(sequenceId);
}

function startCountdownLoop(sequenceId) {
  stopTimer();
  timerId = window.setInterval(async () => {
    if (sequenceId !== phaseSequenceId) {
      stopTimer();
      return;
    }

    if (state.remainingSeconds > 1) {
      const phase = currentPhase();
      const elapsedSecond = phase ? phase.seconds - state.remainingSeconds + 1 : 0;

      state = {
        ...state,
        remainingSeconds: state.remainingSeconds - 1,
      };
      renderTimer();
      await maybePlayCountdownGuidance(phase?.phaseIndex ?? state.currentPhaseIndex, elapsedSecond, sequenceId);
      return;
    }

    const finishedPhase = currentPhase();
    stopTimer();
    state = {
      ...state,
      remainingSeconds: 0,
      isRunning: false,
    };
    renderTimer();
    renderGuidanceLive();
    statusMessage.textContent = `${finishedPhase?.label ?? '目前段落'} 倒數結束，播放結束音效。`;
    await playPhaseEndCue();

    if (sequenceId !== phaseSequenceId) {
      return;
    }

    state = advancePhase(state);
    renderTimer();
    renderPhasePlan();
    renderGuidanceLive();

    if (state.isComplete) {
      statusMessage.textContent = '今日課表已跑完。接下來只要做收尾放鬆與身體掃描就好。';
      renderNarrationInfo();
      renderGuidanceLive();
      return;
    }

    await beginPhaseCountdown({ playbackMode: 'full' });
  }, 1000);
}

async function maybePlayCountdownGuidance(phaseIndex, elapsedSecond, sequenceId) {
  if (!narrationPlayer) {
    return null;
  }

  try {
    const result = await narrationPlayer.playCountdownGuidance(phaseIndex, elapsedSecond);

    if (sequenceId !== phaseSequenceId) {
      return null;
    }

    if (result?.text) {
      renderGuidanceLive(`教練引導：${result.text}（第 ${elapsedSecond} 秒）`);
    }

    return result;
  } catch (error) {
    if (sequenceId === phaseSequenceId) {
      renderGuidanceLive('中段引導語音播放失敗，倒數仍持續進行。');
    }
    return null;
  }
}

async function playPhaseIntroForCurrentPhase(playbackMode = 'full') {
  renderNarrationInfo();
  renderGuidanceLive();

  if (!narrationPlayer) {
    return null;
  }

  try {
    const entry = await narrationPlayer.playPhaseIntro(state.currentPhaseIndex, playbackMode);
    if (entry) {
      narrationStatusElement.textContent = playbackMode === 'full'
        ? `階段說明與開始音效已播完：${entry.phaseLabel}`
        : `開始音效已播完：${entry.phaseLabel}`;
    }
    return entry;
  } catch (error) {
    narrationStatusElement.textContent = '語音或開始音效播放失敗，仍會直接開始倒數。';
    return null;
  }
}

async function playPhaseEndCue() {
  if (!narrationPlayer) {
    return null;
  }

  try {
    await narrationPlayer.playPhaseEndCue();
    narrationStatusElement.textContent = '結束音效已播完，準備切換下一段。';
    return true;
  } catch (error) {
    narrationStatusElement.textContent = '結束音效播放失敗，仍會繼續切換到下一段。';
    return false;
  }
}

function shouldReplayNarrationForCurrentPhase() {
  const phase = currentPhase();
  return Boolean(phase && state.remainingSeconds === phase.seconds);
}

function currentPhase() {
  return state.phases[state.currentPhaseIndex] ?? null;
}

function cancelActiveTimeline({ resetNarration = false } = {}) {
  phaseSequenceId += 1;
  isPreparingPhase = false;
  stopTimer();
  narrationPlayer?.stopActivePlayback();

  if (resetNarration) {
    narrationPlayer?.reset();
  }
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
