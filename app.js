import {
  advancePhase,
  createSessionState,
  formatClock,
} from './timer-core.js';

const form = document.querySelector('#config-form');
const trainInput = document.querySelector('#train-seconds');
const restInput = document.querySelector('#rest-seconds');
const roundsInput = document.querySelector('#rounds');
const phaseLabel = document.querySelector('#phase-label');
const roundLabel = document.querySelector('#round-label');
const timeDisplay = document.querySelector('#time-display');
const statusMessage = document.querySelector('#status-message');
const phasePlan = document.querySelector('#phase-plan');
const startButton = document.querySelector('#start-button');
const pauseButton = document.querySelector('#pause-button');
const resetButton = document.querySelector('#reset-button');
const skipButton = document.querySelector('#skip-button');

let state = createSessionState(readConfig());
let timerId = null;

render();

form.addEventListener('input', () => {
  if (state.isRunning) {
    return;
  }
  state = createSessionState(readConfig());
  statusMessage.textContent = '設定已更新，主人可以直接開始這輪鍛鍊。';
  render();
});

startButton.addEventListener('click', () => {
  if (state.isComplete) {
    state = createSessionState(readConfig());
  }

  if (timerId) {
    return;
  }

  state = {
    ...state,
    isRunning: true,
  };
  statusMessage.textContent = `開始 ${currentPhase().label}。保持節奏，穩穩往下做。`;
  render();

  timerId = window.setInterval(() => {
    if (state.remainingSeconds > 1) {
      state = {
        ...state,
        remainingSeconds: state.remainingSeconds - 1,
      };
      render();
      return;
    }

    state = advancePhase(state);

    if (state.isComplete) {
      stopTimer();
      statusMessage.textContent = '這一輪完成了，做得很好。';
    } else {
      state = {
        ...state,
        isRunning: true,
      };
      statusMessage.textContent = `切換到 ${currentPhase().label}。`; 
    }

    render();
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
  statusMessage.textContent = '已暫停。主人準備好時再繼續。';
  render();
});

resetButton.addEventListener('click', () => {
  stopTimer();
  state = createSessionState(readConfig());
  statusMessage.textContent = '已重設為新的起始狀態。';
  render();
});

skipButton.addEventListener('click', () => {
  stopTimer();
  state = advancePhase(state);

  if (state.isComplete) {
    statusMessage.textContent = '已跳過到結束。這輪流程完成。';
  } else {
    statusMessage.textContent = `已切換到 ${currentPhase().label}。`;
  }

  render();
});

function readConfig() {
  return {
    trainSeconds: Number(trainInput.value),
    restSeconds: Number(restInput.value),
    rounds: Number(roundsInput.value),
  };
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

function render() {
  const phase = currentPhase();
  const totalRounds = Number(roundsInput.value) || 1;

  phaseLabel.textContent = phase?.label ?? '已完成';
  roundLabel.textContent = state.isComplete
    ? `共 ${totalRounds} 回合，已完成`
    : `第 ${phase?.round ?? totalRounds} / ${totalRounds} 回合`;
  timeDisplay.textContent = formatClock(state.remainingSeconds);
  pauseButton.disabled = !state.isRunning;

  renderPhasePlan();
}

function renderPhasePlan() {
  phasePlan.innerHTML = '';

  state.phases.forEach((phase, index) => {
    const item = document.createElement('li');
    item.textContent = `${phase.label} · ${formatClock(phase.seconds)}`;

    if (index < state.currentPhaseIndex || state.isComplete) {
      item.classList.add('complete');
    }

    if (!state.isComplete && index === state.currentPhaseIndex) {
      item.classList.add('active');
    }

    phasePlan.appendChild(item);
  });
}
