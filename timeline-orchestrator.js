import { advancePhase } from './timer-core.js';

export function createTimelineOrchestrator({
  sessionController,
  getNarrationPlayer,
  hasNarrationAudio = () => false,
  setIntervalFn = globalThis.window?.setInterval?.bind(globalThis.window),
  clearIntervalFn = globalThis.window?.clearInterval?.bind(globalThis.window),
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
    const narrationEnabled = hasNarrationAudio();
    isPreparingPhase = true;
    updateState({
      ...state,
      isRunning: false,
    });

    onPhasePreparing?.({
      phase,
      state: getState(),
      playbackMode,
      hasNarrationAudio: narrationEnabled,
      sequenceId,
    });

    if (narrationEnabled) {
      try {
        const entry = await getPlayer()?.playPhaseIntro?.(getState().currentPhaseIndex, playbackMode);
        if (sequenceId === phaseSequenceId) {
          onPhaseIntroFinished?.({
            entry,
            phase: currentPhase(),
            state: getState(),
            playbackMode,
            sequenceId,
          });
        }
      } catch (error) {
        if (sequenceId === phaseSequenceId) {
          onPhaseIntroError?.({
            error,
            phase: currentPhase(),
            state: getState(),
            playbackMode,
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
      playbackMode,
      hasNarrationAudio: narrationEnabled,
      sequenceId,
    });

    if (narrationEnabled) {
      void maybePlayCountdownGuidance(getState().currentPhaseIndex, 0, sequenceId);
    }

    startCountdownLoop(sequenceId);
    return { kind: 'started', sequenceId };
  }

  function startCountdownLoop(sequenceId) {
    stopTimer();
    timerId = setIntervalFn(async () => {
      if (sequenceId !== phaseSequenceId) {
        stopTimer();
        return;
      }

      const state = getState();
      if (state.remainingSeconds > 1) {
        const phase = currentPhase(state);
        const elapsedSecond = phase ? phase.seconds - state.remainingSeconds + 1 : 0;
        updateState({
          ...state,
          remainingSeconds: state.remainingSeconds - 1,
        });

        onTick?.({
          phase,
          state: getState(),
          elapsedSecond,
          sequenceId,
        });

        await maybePlayCountdownGuidance(
          phase?.phaseIndex ?? getState().currentPhaseIndex,
          elapsedSecond,
          sequenceId,
        );
        return;
      }

      const finishedPhase = currentPhase();
      stopTimer();
      updateState({
        ...getState(),
        remainingSeconds: 0,
        isRunning: false,
      });

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
