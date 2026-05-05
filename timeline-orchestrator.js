import { advancePhase } from './timer-core.js';

export function createTimelineOrchestrator({
  sessionController,
  getNarrationPlayer,
  hasNarrationAudio = () => false,
  setIntervalFn = globalThis.window?.setInterval?.bind(globalThis.window),
  clearIntervalFn = globalThis.window?.clearInterval?.bind(globalThis.window),
  setTimeoutFn = globalThis.window?.setTimeout?.bind(globalThis.window),
  clearTimeoutFn = globalThis.window?.clearTimeout?.bind(globalThis.window),
  nowFn = () => globalThis.window?.performance?.now?.() ?? Date.now(),
  initialGuidanceDelayMs = 300,
  onPhasePreparing,
  onPhaseStarted,
  onTick,
  onGuidance,
  onGuidanceError,
  onPhaseIntroFinished,
  onPhaseIntroError,
  onPhaseCompleted,
  onPhaseEndCueFinished,
  onPhaseEndCueError,
  onSessionCompleted,
} = {}) {
  let timerId = null;
  let isPreparingPhase = false;
  let phaseSequenceId = 0;
  let countdownClock = null;
  let initialGuidanceTimeoutId = null;

  function getState() {
    return sessionController.getState();
  }

  function currentPhase(state = getState()) {
    return state?.phases?.[state.currentPhaseIndex] ?? null;
  }

  function getPlayer() {
    return getNarrationPlayer?.() ?? null;
  }

  function stopTimer() {
    if (!timerId) {
      return;
    }

    clearIntervalFn?.(timerId);
    timerId = null;
  }

  function clearInitialGuidanceTimeout() {
    if (initialGuidanceTimeoutId === null) {
      return;
    }

    clearTimeoutFn?.(initialGuidanceTimeoutId);
    initialGuidanceTimeoutId = null;
  }

  function resetCountdownClock() {
    countdownClock = null;
  }

  function syncCountdownClock(state = getState()) {
    const phase = currentPhase(state);
    if (!phase) {
      countdownClock = null;
      return null;
    }

    const baseElapsedSeconds = Math.max(0, phase.seconds - state.remainingSeconds);
    countdownClock = {
      sequenceId: phaseSequenceId,
      phaseIndex: state.currentPhaseIndex,
      phaseSeconds: phase.seconds,
      startedAtMs: nowFn(),
      baseElapsedSeconds,
      processedElapsedSeconds: baseElapsedSeconds,
    };
    return countdownClock;
  }

  function updateState(nextState) {
    return sessionController.setState(nextState);
  }

  function moveToNextPhase() {
    if (typeof sessionController.advancePhase === 'function') {
      return sessionController.advancePhase();
    }

    return updateState(advancePhase(getState()));
  }

  function cancel({ resetNarration = false } = {}) {
    phaseSequenceId += 1;
    isPreparingPhase = false;
    stopTimer();
    clearInitialGuidanceTimeout();
    resetCountdownClock();

    const player = getPlayer();
    if (player?.stopAll) {
      player.stopAll();
    } else {
      player?.stopActivePlayback?.();
    }

    if (resetNarration) {
      player?.reset?.();
    }

    return {
      kind: 'cancelled',
      sequenceId: phaseSequenceId,
    };
  }

  async function maybePlayCountdownGuidance(phaseIndex, elapsedSecond, sequenceId) {
    if (!hasNarrationAudio()) {
      return null;
    }

    const player = getPlayer();
    if (!player?.playCountdownGuidance) {
      return null;
    }

    try {
      const result = await player.playCountdownGuidance(phaseIndex, elapsedSecond);
      if (sequenceId !== phaseSequenceId) {
        return null;
      }

      if (result) {
        onGuidance?.({
          result,
          state: getState(),
          phase: currentPhase(),
          elapsedSecond,
          sequenceId,
        });
      }

      return result;
    } catch (error) {
      if (sequenceId === phaseSequenceId) {
        onGuidanceError?.({
          error,
          state: getState(),
          phase: currentPhase(),
          elapsedSecond,
          sequenceId,
        });
      }
      return null;
    }
  }

  function scheduleInitialCountdownGuidance(sequenceId) {
    if (!hasNarrationAudio()) {
      return;
    }

    const phaseIndex = getState().currentPhaseIndex;
    const delayMs = Math.max(0, Number(initialGuidanceDelayMs) || 0);
    if (!setTimeoutFn || delayMs === 0) {
      void maybePlayCountdownGuidance(phaseIndex, 0, sequenceId);
      return;
    }

    clearInitialGuidanceTimeout();
    initialGuidanceTimeoutId = setTimeoutFn(() => {
      initialGuidanceTimeoutId = null;
      void maybePlayCountdownGuidance(phaseIndex, 0, sequenceId);
    }, delayMs);
  }

  async function start({ playbackMode = 'full' } = {}) {
    const phase = currentPhase();
    const state = getState();

    if (!phase || state?.isComplete) {
      return { kind: 'noop' };
    }

    if (timerId || isPreparingPhase) {
      return { kind: 'already-active' };
    }

    const sequenceId = ++phaseSequenceId;
    const player = getPlayer();
    const narrationEnabled = hasNarrationAudio();
    const effectivePlaybackMode = narrationEnabled ? playbackMode : 'cue-only';
    const willPlayStartCue = Boolean(player?.playPhaseIntro);
    isPreparingPhase = true;
    updateState({
      ...state,
      isRunning: false,
    });

    onPhasePreparing?.({
      phase,
      state: getState(),
      playbackMode: effectivePlaybackMode,
      hasNarrationAudio: narrationEnabled,
      willPlayStartCue,
      sequenceId,
    });

    if (willPlayStartCue) {
      try {
        const entry = await player?.playPhaseIntro?.(getState().currentPhaseIndex, effectivePlaybackMode);
        if (sequenceId === phaseSequenceId) {
          onPhaseIntroFinished?.({
            entry,
            phase: currentPhase(),
            state: getState(),
            playbackMode: effectivePlaybackMode,
            hasNarrationAudio: narrationEnabled,
            willPlayStartCue,
            sequenceId,
          });
        }
      } catch (error) {
        if (sequenceId === phaseSequenceId) {
          onPhaseIntroError?.({
            error,
            phase: currentPhase(),
            state: getState(),
            playbackMode: effectivePlaybackMode,
            hasNarrationAudio: narrationEnabled,
            willPlayStartCue,
            sequenceId,
          });
        }
      }
    }

    if (sequenceId !== phaseSequenceId || getState().isComplete) {
      return { kind: 'cancelled', sequenceId };
    }

    isPreparingPhase = false;
    updateState({
      ...getState(),
      isRunning: true,
    });

    onPhaseStarted?.({
      phase: currentPhase(),
      state: getState(),
      playbackMode: effectivePlaybackMode,
      hasNarrationAudio: narrationEnabled,
      willPlayStartCue,
      sequenceId,
    });

    if (narrationEnabled) {
      scheduleInitialCountdownGuidance(sequenceId);
    }

    syncCountdownClock(getState());
    startCountdownLoop(sequenceId);
    return { kind: 'started', sequenceId };
  }

  function startCountdownLoop(sequenceId) {
    stopTimer();
    syncCountdownClock(getState());
    timerId = setIntervalFn(async () => {
      if (sequenceId !== phaseSequenceId) {
        stopTimer();
        return;
      }

      const state = getState();
      const phase = currentPhase(state);
      const clock = countdownClock;
      if (!phase || !clock || clock.sequenceId !== sequenceId || clock.phaseIndex !== state.currentPhaseIndex) {
        syncCountdownClock(state);
        return;
      }

      const elapsedByClock = Math.max(
        clock.baseElapsedSeconds,
        Math.floor((nowFn() - clock.startedAtMs) / 1000) + clock.baseElapsedSeconds,
      );
      const cappedElapsed = Math.min(phase.seconds, elapsedByClock);

      if (cappedElapsed <= clock.processedElapsedSeconds) {
        return;
      }

      for (let elapsedSecond = clock.processedElapsedSeconds + 1; elapsedSecond <= cappedElapsed; elapsedSecond += 1) {
        if (sequenceId !== phaseSequenceId) {
          stopTimer();
          return;
        }

        const liveState = getState();
        const livePhase = currentPhase(liveState);
        if (!livePhase) {
          resetCountdownClock();
          stopTimer();
          return;
        }

        const nextRemainingSeconds = Math.max(0, livePhase.seconds - elapsedSecond);
        updateState({
          ...liveState,
          remainingSeconds: nextRemainingSeconds,
          isRunning: nextRemainingSeconds > 0,
        });
        countdownClock.processedElapsedSeconds = elapsedSecond;

        if (nextRemainingSeconds > 0) {
          onTick?.({
            phase: livePhase,
            state: getState(),
            elapsedSecond,
            sequenceId,
          });

          await maybePlayCountdownGuidance(
            livePhase.phaseIndex ?? getState().currentPhaseIndex,
            elapsedSecond,
            sequenceId,
          );
          continue;
        }

        const finishedPhase = livePhase;
        stopTimer();
        resetCountdownClock();
        onPhaseCompleted?.({
          phase: finishedPhase,
          state: getState(),
          sequenceId,
        });

        if (hasNarrationAudio()) {
          try {
            const result = await getPlayer()?.playPhaseEndCue?.();
            if (sequenceId === phaseSequenceId) {
              onPhaseEndCueFinished?.({
                result,
                phase: finishedPhase,
                state: getState(),
                sequenceId,
              });
            }
          } catch (error) {
            if (sequenceId === phaseSequenceId) {
              onPhaseEndCueError?.({
                error,
                phase: finishedPhase,
                state: getState(),
                sequenceId,
              });
            }
          }
        }

        if (sequenceId !== phaseSequenceId) {
          return;
        }

        moveToNextPhase();

        if (getState().isComplete) {
          onSessionCompleted?.({
            state: getState(),
            sequenceId,
          });
          return;
        }

        await start({ playbackMode: 'full' });
        return;
      }
    }, 1000);
  }

  function pause({ resetNarration = false } = {}) {
    if (isPreparingPhase) {
      cancel({ resetNarration: true });
      updateState({
        ...getState(),
        isRunning: false,
      });
      return { kind: 'paused-preparing' };
    }

    if (!timerId) {
      return { kind: 'idle' };
    }

    cancel({ resetNarration });
    updateState({
      ...getState(),
      isRunning: false,
    });
    return { kind: 'paused-running' };
  }

  function skip({ resetNarration = true } = {}) {
    cancel({ resetNarration });
    moveToNextPhase();

    return {
      kind: getState().isComplete ? 'session-complete' : 'phase-skipped',
      state: getState(),
    };
  }

  return {
    start,
    pause,
    skip,
    cancel,
    isPreparing() {
      return isPreparingPhase;
    },
    hasActiveTimer() {
      return Boolean(timerId);
    },
    getSequenceId() {
      return phaseSequenceId;
    },
  };
}
