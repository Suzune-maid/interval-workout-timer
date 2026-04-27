export function buildWorkoutPlan({ trainSeconds, restSeconds, rounds }) {
  const safeTrain = normalizePositiveSeconds(trainSeconds);
  const safeRest = normalizePositiveSeconds(restSeconds);
  const safeRounds = normalizePositiveInteger(rounds);
  const phases = [];

  for (let round = 1; round <= safeRounds; round += 1) {
    phases.push({
      type: 'train',
      label: `訓練 ${round}`,
      seconds: safeTrain,
      round,
    });

    if (round < safeRounds) {
      phases.push({
        type: 'rest',
        label: `放鬆 ${round}`,
        seconds: safeRest,
        round,
      });
    }
  }

  return phases;
}

export function createSessionState(config) {
  const phases = buildWorkoutPlan(config);
  return {
    phases,
    currentPhaseIndex: 0,
    remainingSeconds: phases[0]?.seconds ?? 0,
    isRunning: false,
    isComplete: phases.length === 0,
  };
}

export function advancePhase(state) {
  const nextPhaseIndex = getNextPhaseIndex(state.currentPhaseIndex, state.phases);

  if (nextPhaseIndex === null) {
    return {
      ...state,
      remainingSeconds: 0,
      isRunning: false,
      isComplete: true,
    };
  }

  return {
    ...state,
    currentPhaseIndex: nextPhaseIndex,
    remainingSeconds: state.phases[nextPhaseIndex].seconds,
    isComplete: false,
  };
}

export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutesPart = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secondsPart = String(seconds % 60).padStart(2, '0');
  return `${minutesPart}:${secondsPart}`;
}

export function getNextPhaseIndex(currentIndex, phases) {
  if (!Array.isArray(phases) || currentIndex >= phases.length - 1) {
    return null;
  }
  return currentIndex + 1;
}

function normalizePositiveSeconds(value) {
  const normalized = Math.max(1, Math.floor(Number(value) || 0));
  return normalized;
}

function normalizePositiveInteger(value) {
  const normalized = Math.max(1, Math.floor(Number(value) || 0));
  return normalized;
}
