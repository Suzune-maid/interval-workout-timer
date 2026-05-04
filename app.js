import {
  buildProgramCalendar,
  findNarrationEntryByPhase,
  formatClock,
  resolveProgramDay,
} from './timer-core.js';
import {
  createNarrationPlayer,
  loadNarrationLibraryIndex,
  loadNarrationManifest,
} from './audio-player.js';
import { collectDomRefs } from './dom-refs.js';
import { createSessionController } from './session-controller.js';
import { renderSchedule, renderStaticContent } from './schedule-view.js';
import {
  renderGuidanceLive,
  renderNarrationInfo,
  renderPhasePlan,
  renderTimer,
} from './timer-view.js';
import { createTimelineOrchestrator } from './timeline-orchestrator.js';

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

function createCueOnlyNarrationPlayer() {
  let cueAudio = null;
  let activePlayback = null;

  function clearActivePlayback() {
    if (!activePlayback) {
      return;
    }

    cueAudio?.removeEventListener?.('ended', activePlayback.handleEnded);
    cueAudio?.removeEventListener?.('error', activePlayback.handleError);
    activePlayback = null;
  }

  function finish(result) {
    const playback = activePlayback;
    if (!playback) {
      return;
    }

    clearActivePlayback();
    playback.resolve(result);
  }

  function fail(error) {
    const playback = activePlayback;
    if (!playback) {
      return;
    }

    clearActivePlayback();
    playback.reject(error);
  }

  function stopActivePlayback(reason = 'cancelled') {
    const playback = activePlayback;
    if (!playback) {
      return;
    }

    cueAudio?.pause?.();
    if (cueAudio) {
      cueAudio.currentTime = 0;
    }
    clearActivePlayback();
    playback.resolve(reason);
  }

  return {
    playPhaseIntro(phaseIndex) {
      stopActivePlayback('interrupted');
      cueAudio = cueAudio ?? (typeof Audio !== 'undefined' ? new Audio() : null);
      if (cueAudio) {
        cueAudio.preload = 'auto';
        cueAudio.currentTime = 0;
        cueAudio.src = './audio/fx/countdown-start.wav';
      }

      return new Promise((resolve, reject) => {
        if (!cueAudio) {
          resolve({ phaseIndex, phaseLabel: null });
          return;
        }

        const handleEnded = () => finish({ phaseIndex, phaseLabel: null });
        const handleError = () => fail(new Error('開始音效播放失敗。'));
        activePlayback = { resolve, reject, handleEnded, handleError };
        cueAudio.addEventListener('ended', handleEnded, { once: true });
        cueAudio.addEventListener('error', handleError, { once: true });
        Promise.resolve(cueAudio.play()).catch(handleError);
      });
    },
    async playCountdownGuidance() {
      return null;
    },
    stopAll() {
      stopActivePlayback('cancelled');
    },
    reset() {
      stopActivePlayback('cancelled');
    },
  };
}

let narrationPlayer = createCueOnlyNarrationPlayer();
let narrationManifest = null;
let narrationLibraryItems = null;
let activeNarrationDate = null;
let narrationLoadRequestId = 0;

const timeline = createTimelineOrchestrator({
  sessionController,
  getNarrationPlayer: () => narrationPlayer,
  hasNarrationAudio: hasNarrationAudioForSelectedDay,
  setIntervalFn: window.setInterval.bind(window),
  clearIntervalFn: window.clearInterval.bind(window),
  onPhasePreparing({ phase, state, playbackMode, hasNarrationAudio, willPlayStartCue }) {
    const isResuming = state.remainingSeconds < phase.seconds;
    refs.statusMessage.textContent = hasNarrationAudio
      ? playbackMode === 'full'
        ? `先播放 ${phase.label} 的階段說明與開始音效，之後才會開始倒數。`
        : `準備恢復 ${phase.label}，先播放開始音效。`
      : willPlayStartCue
        ? isResuming
          ? `準備恢復 ${phase.label}，先播放開始音效。`
          : `準備開始 ${phase.label}，先播放開始音效。`
        : `${phase.label} 目前會直接開始倒數，這一天尚未配置專用語音。`;
    syncTimerViews();
    syncGuidanceLive();
  },
  onPhaseIntroFinished({ entry, phase, playbackMode, hasNarrationAudio, sequenceId }) {
    if (sequenceId !== timeline.getSequenceId()) {
      return;
    }

    const phaseLabel = hasNarrationAudio
      ? entry?.phaseLabel ?? phase?.label ?? '目前段落'
      : phase?.label ?? '目前段落';
    refs.narrationStatusElement.textContent = playbackMode === 'full'
      ? `階段說明與開始音效已播完：${phaseLabel}`
      : `開始音效已播完：${phaseLabel}`;
  },
  onPhaseIntroError({ sequenceId }) {
    if (sequenceId !== timeline.getSequenceId()) {
      return;
    }

    refs.narrationStatusElement.textContent = '語音或開始音效播放失敗，仍會直接開始倒數。';
  },
  onPhaseStarted({ phase, state }) {
    refs.statusMessage.textContent = state.remainingSeconds < phase.seconds
      ? `${phase.label} 已恢復倒數。`
      : `${phase.label} 開始倒數。`;
    syncTimerViews();
    syncGuidanceLive();
  },
  onTick() {
    syncTimerViews();
  },
  onGuidance({ result, elapsedSecond }) {
    if (result?.text) {
      syncGuidanceLive(`教練引導：${result.text}（第 ${elapsedSecond} 秒）`);
    }
  },
  onGuidanceError() {
    syncGuidanceLive('中段引導語音播放失敗，倒數仍持續進行。');
  },
  onPhaseCompleted({ phase }) {
    syncTimerViews();
    syncGuidanceLive();
    refs.statusMessage.textContent = hasNarrationAudioForSelectedDay()
      ? `${phase?.label ?? '目前段落'} 倒數結束，播放結束音效。`
      : `${phase?.label ?? '目前段落'} 倒數結束，準備切換下一段。`;
  },
  onPhaseEndCueFinished({ sequenceId }) {
    if (sequenceId !== timeline.getSequenceId()) {
      return;
    }

    refs.narrationStatusElement.textContent = '結束音效已播完，準備切換下一段。';
  },
  onPhaseEndCueError({ sequenceId }) {
    if (sequenceId !== timeline.getSequenceId()) {
      return;
    }

    refs.narrationStatusElement.textContent = '結束音效播放失敗，仍會繼續切換到下一段。';
  },
  onSessionCompleted() {
    refs.statusMessage.textContent = '目前課表已跑完。接下來只要做收尾放鬆與身體掃描就好。';
    syncTimerViews();
    syncNarrationInfo();
    syncGuidanceLive();
  },
});

renderAll();
initializeNarration().catch((error) => {
  refs.narrationStatusElement.textContent = '語音素材讀取失敗，先顯示腳本內容。';
  refs.narrationTextElement.textContent = error.message;
  syncGuidanceLive();
});

refs.startButton.addEventListener('click', async () => {
  if (getState().isComplete) {
    timeline.cancel({ resetNarration: true });
    sessionController.resetSessionState();
    syncTimerViews();
    syncNarrationInfo();
  }

  if (timeline.hasActiveTimer() || timeline.isPreparing()) {
    return;
  }

  await timeline.start({
    playbackMode: shouldReplayNarrationForCurrentPhase() ? 'full' : 'cue-only',
  });
});

refs.pauseButton.addEventListener('click', () => {
  const result = timeline.pause();

  if (result.kind === 'paused-preparing') {
    refs.statusMessage.textContent = '已暫停，目前停在倒數開始前。';
    syncTimerViews();
    syncGuidanceLive();
    return;
  }

  if (result.kind !== 'paused-running') {
    return;
  }

  refs.statusMessage.textContent = '已暫停。重新開始時會先播開始音效，再繼續倒數。';
  syncTimerViews();
  syncGuidanceLive();
});

refs.resetButton.addEventListener('click', () => {
  timeline.cancel({ resetNarration: true });
  sessionController.resetSessionState();
  const entry = selectedEntry();
  refs.statusMessage.textContent = `已重設為第 ${entry.weekNumber} 週第 ${entry.dayNumber} 天的起始課表。`;
  syncTimerViews();
  syncNarrationInfo();
  syncGuidanceLive();
});

refs.skipButton.addEventListener('click', () => {
  const result = timeline.skip({ resetNarration: true });

  if (result.kind === 'session-complete') {
    refs.statusMessage.textContent = '已跳到目前課表最後。這一天的主要流程完成。';
  } else {
    refs.statusMessage.textContent = hasNarrationAudioForSelectedDay()
      ? `已切換到 ${currentPhase().label}。按開始後會先播階段說明，再開始倒數。`
      : `已切換到 ${currentPhase().label}。按開始後會先播開始音效，再開始倒數。`;
  }

  syncTimerViews();
  syncNarrationInfo();
  syncGuidanceLive();
});

async function initializeNarration() {
  await ensureNarrationLibraryIndex();
  await syncNarrationForSelectedDay();
  syncNarrationInfo();
  syncGuidanceLive();
}

async function ensureNarrationLibraryIndex() {
  if (Array.isArray(narrationLibraryItems)) {
    return narrationLibraryItems;
  }

  try {
    narrationLibraryItems = await loadNarrationLibraryIndex();
  } catch {
    narrationLibraryItems = [];
  }

  return narrationLibraryItems;
}

async function syncNarrationForSelectedDay() {
  const requestId = ++narrationLoadRequestId;
  const entry = selectedEntry();
  const manifestUrl = await resolveNarrationManifestUrl(entry);

  if (!manifestUrl) {
    if (requestId === narrationLoadRequestId) {
      clearNarrationAudio();
    }
    return false;
  }

  const manifest = await loadNarrationManifest(manifestUrl);
  if (requestId !== narrationLoadRequestId || entry.date !== selectedEntry().date) {
    return false;
  }

  narrationManifest = manifest;
  narrationPlayer = createNarrationPlayer(manifest);
  activeNarrationDate = entry.date;
  return true;
}

async function resolveNarrationManifestUrl(entry) {
  const libraryItems = await ensureNarrationLibraryIndex();
  const libraryItem = libraryItems.find((item) => item.libraryKey === entry.date || item.sourceDate === entry.date);

  if (libraryItem?.manifestFile) {
    return `./${libraryItem.manifestFile}`;
  }

  return null;
}

function clearNarrationAudio() {
  narrationManifest = null;
  narrationPlayer = createCueOnlyNarrationPlayer();
  activeNarrationDate = null;
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
    isPreparingPhase: timeline.isPreparing(),
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
    onSelectWeek: switchVisibleWeek,
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
  return Boolean(
    narrationPlayer
      && activeNarrationDate === selectedEntry().date
      && Array.isArray(narrationManifest?.entries),
  );
}

function shouldReplayNarrationForCurrentPhase() {
  const phase = currentPhase();
  return Boolean(phase && getState().remainingSeconds === phase.seconds);
}

function getSelectionStatusMessage(entry) {
  if (entry.dayOffset === todayInfo.dayOffset) {
    return hasNarrationAudioForSelectedDay()
      ? '已切回今天的課表。按開始後會先播階段說明，再開始倒數。'
      : '已切回今天的課表。按開始後會先播開始音效，再開始倒數。';
  }

  return `已切換到第 ${entry.weekNumber} 週第 ${entry.dayNumber} 天。按開始後會載入這一天的流程。`;
}

async function switchSelectedDay(dayOffset) {
  if (dayOffset === sessionController.getDaySelection().selectedDayOffset) {
    return;
  }

  timeline.cancel({ resetNarration: true });
  const entry = sessionController.switchSelectedDay(dayOffset);
  refs.statusMessage.textContent = `已切換到第 ${entry.weekNumber} 週第 ${entry.dayNumber} 天。按開始後會載入這一天的流程。`;

  renderAll();

  try {
    await syncNarrationForSelectedDay();
  } catch {
    clearNarrationAudio();
  }

  refs.statusMessage.textContent = getSelectionStatusMessage(entry);
  syncNarrationInfo();
  syncGuidanceLive();
}

function switchVisibleWeek(weekNumber) {
  const currentSelection = sessionController.getDaySelection();
  if (weekNumber === currentSelection.visibleWeekNumber) {
    return;
  }

  sessionController.switchVisibleWeek(weekNumber);
  syncSchedule();
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
