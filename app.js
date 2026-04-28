import {
  advancePhase,
  buildProgramCalendar,
  findNarrationEntryByPhase,
  formatClock,
  resolveProgramDay,
} from './timer-core.js';
import { createNarrationPlayer, loadNarrationManifest } from './audio-player.js';
import { collectDomRefs } from './dom-refs.js';
import { createSessionController } from './session-controller.js';
import { renderSchedule, renderStaticContent } from './schedule-view.js';
import {
  renderGuidanceLive,
  renderNarrationInfo,
  renderPhasePlan,
  renderTimer,
} from './timer-view.js';

const PROGRAM_START_DATE = '2026-04-27';

const refs = collectDomRefs(document);
const calendar = buildProgramCalendar(PROGRAM_START_DATE);
const todayInfo = resolveProgramDay(PROGRAM_START_DATE, getLocalDateString(new Date()));
const todayEntry = calendar[todayInfo.dayOffset] ?? calendar[0];
const sessionController = createSessionController({
  calendar,
  todayInfo,
  todayEntry,
});

let timerId = null;
let narrationPlayer = null;
let narrationManifest = null;
let isPreparingPhase = false;
let phaseSequenceId = 0;

renderAll();
initializeNarration().catch((error) => {
  refs.narrationStatusElement.textContent = '語音素材讀取失敗，先顯示腳本內容。';
  refs.narrationTextElement.textContent = error.message;
  syncGuidanceLive();
});

refs.startButton.addEventListener('click', async () => {
  if (getState().isComplete) {
    cancelActiveTimeline({ resetNarration: true });
    sessionController.resetSessionState();
    syncTimerViews();
    syncNarrationInfo();
  }

  if (timerId || isPreparingPhase) {
    return;
  }

  await beginPhaseCountdown({
    playbackMode: shouldReplayNarrationForCurrentPhase() ? 'full' : 'cue-only',
  });
});

refs.pauseButton.addEventListener('click', () => {
  if (isPreparingPhase) {
    cancelActiveTimeline({ resetNarration: true });
    sessionController.setState({
      ...getState(),
      isRunning: false,
    });
    refs.statusMessage.textContent = '已暫停，目前停在倒數開始前。';
    syncTimerViews();
    syncGuidanceLive();
    return;
  }

  if (!timerId) {
    return;
  }

  cancelActiveTimeline();
  sessionController.setState({
    ...getState(),
    isRunning: false,
  });
  refs.statusMessage.textContent = '已暫停。重新開始時會先播開始音效，再繼續倒數。';
  syncTimerViews();
  syncGuidanceLive();
});

refs.resetButton.addEventListener('click', () => {
  cancelActiveTimeline({ resetNarration: true });
  sessionController.resetSessionState();
  const entry = selectedEntry();
  refs.statusMessage.textContent = `已重設為第 ${entry.weekNumber} 週第 ${entry.dayNumber} 天的起始課表。`;
  syncTimerViews();
  syncNarrationInfo();
  syncGuidanceLive();
});

refs.skipButton.addEventListener('click', () => {
  cancelActiveTimeline({ resetNarration: true });
  sessionController.setState(advancePhase(getState()));

  if (getState().isComplete) {
    refs.statusMessage.textContent = '已跳到目前課表最後。這一天的主要流程完成。';
  } else {
    refs.statusMessage.textContent = `已切換到 ${currentPhase().label}。按開始後會先播階段說明，再開始倒數。`;
  }

  syncTimerViews();
  syncNarrationInfo();
  syncGuidanceLive();
});

async function initializeNarration() {
  narrationManifest = await loadNarrationManifest();
  narrationPlayer = createNarrationPlayer(narrationManifest);
  syncNarrationInfo();
  syncGuidanceLive();
}

function renderAll() {
  syncStaticContent();
  syncTimerViews();
  syncSchedule();
  syncNarrationInfo();
  syncGuidanceLive();
}

function syncStaticContent() {
  renderStaticContent({
    refs,
    entry: selectedEntry(),
    todayInfo,
    todayEntry,
    formatDisplayDate,
  });
}

function syncTimerViews() {
  renderTimer({
    refs,
    state: getState(),
    isPreparingPhase,
    currentPhase: currentPhase(),
    formatClock,
  });
  renderPhasePlan({
    refs,
    state: getState(),
    formatClock,
  });
}

function syncSchedule() {
  renderSchedule({
    refs,
    calendar,
    todayInfo,
    daySelection: sessionController.getDaySelection(),
    formatDisplayDate,
    onSelectDay: switchSelectedDay,
  });
}

function syncNarrationInfo() {
  renderNarrationInfo({
    refs,
    entry: currentNarrationEntry(),
    hasNarrationAudio: hasNarrationAudioForSelectedDay(),
    formatClock,
  });
}

function syncGuidanceLive(message) {
  renderGuidanceLive({
    refs,
    entry: currentNarrationEntry(),
    hasNarrationAudio: hasNarrationAudioForSelectedDay(),
    message,
  });
}

function getState() {
  return sessionController.getState();
}

function selectedEntry() {
  return sessionController.selectedEntry();
}

function currentPhase() {
  const state = getState();
  return state.phases[state.currentPhaseIndex] ?? null;
}

function currentNarrationEntry() {
  const phaseIndex = getState().currentPhaseIndex;
  return findNarrationEntryByPhase(getNarrationEntriesForSelectedDay(), phaseIndex);
}

function getNarrationEntriesForSelectedDay() {
  return hasNarrationAudioForSelectedDay()
    ? narrationManifest?.entries ?? sessionController.getFallbackNarrationEntries()
    : sessionController.getFallbackNarrationEntries();
}

function hasNarrationAudioForSelectedDay() {
  if (!narrationPlayer || !Array.isArray(narrationManifest?.entries)) {
    return false;
  }

  const phases = selectedEntry().session?.phases ?? [];
  const manifestEntries = narrationManifest.entries;

  if (phases.length !== manifestEntries.length) {
    return false;
  }

  return phases.every((phase, index) => {
    const manifestEntry = manifestEntries[index];
    return manifestEntry
      && manifestEntry.phaseLabel === phase.label
      && manifestEntry.durationSeconds === phase.seconds;
  });
}

async function beginPhaseCountdown({ playbackMode = 'full' } = {}) {
  const phase = currentPhase();
  const state = getState();
  const hasNarrationAudio = hasNarrationAudioForSelectedDay();

  if (!phase || state.isComplete) {
    return;
  }

  const sequenceId = ++phaseSequenceId;
  isPreparingPhase = true;
  sessionController.setState({
    ...state,
    isRunning: false,
  });
  refs.statusMessage.textContent = hasNarrationAudio
    ? playbackMode === 'full'
      ? `先播放 ${phase.label} 的階段說明與開始音效，之後才會開始倒數。`
      : `準備恢復 ${phase.label}，先播放開始音效。`
    : `${phase.label} 目前會直接開始倒數，這一天尚未配置專用語音。`;
  syncTimerViews();
  syncGuidanceLive();

  if (hasNarrationAudio) {
    await playPhaseIntroForCurrentPhase(playbackMode, sequenceId);
  }

  if (sequenceId !== phaseSequenceId || getState().isComplete) {
    return;
  }

  isPreparingPhase = false;
  sessionController.setState({
    ...getState(),
    isRunning: true,
  });
  refs.statusMessage.textContent = playbackMode === 'full'
    ? `${phase.label} 開始倒數。`
    : `${phase.label} 已恢復倒數。`;
  syncTimerViews();
  syncGuidanceLive();

  if (hasNarrationAudio) {
    void maybePlayCountdownGuidance(phase.phaseIndex ?? getState().currentPhaseIndex, 0, sequenceId);
  }

  startCountdownLoop(sequenceId);
}

function startCountdownLoop(sequenceId) {
  stopTimer();
  timerId = window.setInterval(async () => {
    if (sequenceId !== phaseSequenceId) {
      stopTimer();
      return;
    }

    const state = getState();
    if (state.remainingSeconds > 1) {
      const phase = currentPhase();
      const elapsedSecond = phase ? phase.seconds - state.remainingSeconds + 1 : 0;

      sessionController.setState({
        ...state,
        remainingSeconds: state.remainingSeconds - 1,
      });
      syncTimerViews();
      await maybePlayCountdownGuidance(phase?.phaseIndex ?? getState().currentPhaseIndex, elapsedSecond, sequenceId);
      return;
    }

    const finishedPhase = currentPhase();
    stopTimer();
    sessionController.setState({
      ...getState(),
      remainingSeconds: 0,
      isRunning: false,
    });
    syncTimerViews();
    syncGuidanceLive();
    refs.statusMessage.textContent = hasNarrationAudioForSelectedDay()
      ? `${finishedPhase?.label ?? '目前段落'} 倒數結束，播放結束音效。`
      : `${finishedPhase?.label ?? '目前段落'} 倒數結束，準備切換下一段。`;
    await playPhaseEndCue(sequenceId);

    if (sequenceId !== phaseSequenceId) {
      return;
    }

    sessionController.setState(advancePhase(getState()));
    syncTimerViews();
    syncGuidanceLive();

    if (getState().isComplete) {
      refs.statusMessage.textContent = '目前課表已跑完。接下來只要做收尾放鬆與身體掃描就好。';
      syncNarrationInfo();
      syncGuidanceLive();
      return;
    }

    await beginPhaseCountdown({ playbackMode: 'full' });
  }, 1000);
}

async function maybePlayCountdownGuidance(phaseIndex, elapsedSecond, sequenceId) {
  if (!hasNarrationAudioForSelectedDay()) {
    return null;
  }

  try {
    const result = await narrationPlayer.playCountdownGuidance(phaseIndex, elapsedSecond);

    if (sequenceId !== phaseSequenceId) {
      return null;
    }

    if (result?.text) {
      syncGuidanceLive(`教練引導：${result.text}（第 ${elapsedSecond} 秒）`);
    }

    return result;
  } catch (error) {
    if (sequenceId === phaseSequenceId) {
      syncGuidanceLive('中段引導語音播放失敗，倒數仍持續進行。');
    }
    return null;
  }
}

async function playPhaseIntroForCurrentPhase(playbackMode = 'full', sequenceId = phaseSequenceId) {
  syncNarrationInfo();
  syncGuidanceLive();

  if (!hasNarrationAudioForSelectedDay()) {
    if (sequenceId === phaseSequenceId) {
      refs.narrationStatusElement.textContent = '這一天目前只有文字腳本，倒數會直接開始。';
    }
    return null;
  }

  try {
    const entry = await narrationPlayer.playPhaseIntro(getState().currentPhaseIndex, playbackMode);
    if (entry && sequenceId === phaseSequenceId) {
      refs.narrationStatusElement.textContent = playbackMode === 'full'
        ? `階段說明與開始音效已播完：${entry.phaseLabel}`
        : `開始音效已播完：${entry.phaseLabel}`;
    }
    return entry;
  } catch (error) {
    if (sequenceId === phaseSequenceId) {
      refs.narrationStatusElement.textContent = '語音或開始音效播放失敗，仍會直接開始倒數。';
    }
    return null;
  }
}

async function playPhaseEndCue(sequenceId = phaseSequenceId) {
  if (!hasNarrationAudioForSelectedDay()) {
    return null;
  }

  try {
    await narrationPlayer.playPhaseEndCue();
    if (sequenceId === phaseSequenceId) {
      refs.narrationStatusElement.textContent = '結束音效已播完，準備切換下一段。';
    }
    return true;
  } catch (error) {
    if (sequenceId === phaseSequenceId) {
      refs.narrationStatusElement.textContent = '結束音效播放失敗，仍會繼續切換到下一段。';
    }
    return false;
  }
}

function shouldReplayNarrationForCurrentPhase() {
  const phase = currentPhase();
  return Boolean(phase && getState().remainingSeconds === phase.seconds);
}

function switchSelectedDay(dayOffset) {
  if (dayOffset === sessionController.getDaySelection().selectedDayOffset) {
    return;
  }

  cancelActiveTimeline({ resetNarration: true });
  const entry = sessionController.switchSelectedDay(dayOffset);
  refs.statusMessage.textContent = entry.dayOffset === todayInfo.dayOffset
    ? '已切回今天的課表。按開始後會先播階段說明，再開始倒數。'
    : `已切換到第 ${entry.weekNumber} 週第 ${entry.dayNumber} 天。按開始後會載入這一天的流程。`;

  renderAll();
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
