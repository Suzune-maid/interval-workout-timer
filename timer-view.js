export function renderTimer({ refs, state, isPreparingPhase, currentPhase, formatClock }) {
  const totalPhases = state.phases.length;

  refs.phaseLabel.textContent = currentPhase?.label ?? '目前課表完成';
  refs.phaseProgress.textContent = state.isComplete
    ? `共 ${totalPhases} 段，已完成`
    : `第 ${state.currentPhaseIndex + 1} / ${totalPhases} 段`;
  refs.phaseCue.textContent = currentPhase?.cue ?? '這一天的階段都已完成，最後做身體掃描即可。';
  refs.timeDisplay.textContent = formatClock(state.remainingSeconds);
  refs.startButton.disabled = state.isRunning || isPreparingPhase;
  refs.pauseButton.disabled = !state.isRunning && !isPreparingPhase;
}

export function renderPhasePlan({ refs, state, formatClock }) {
  refs.phasePlan.innerHTML = '';

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

    refs.phasePlan.appendChild(item);
  });
}

export function renderNarrationInfo({ refs, entry, hasNarrationAudio, formatClock }) {
  if (!entry) {
    refs.narrationStatusElement.textContent = '目前沒有對應語音。';
    refs.narrationTextElement.textContent = '若之後要補更多日期，只要沿用同樣的 manifest 格式即可。';
    return;
  }

  if (!hasNarrationAudio) {
    refs.narrationStatusElement.textContent = '這一天目前只有文字腳本，尚未對應專用語音素材。';
    refs.narrationTextElement.textContent = entry.text;
    return;
  }

  const guidanceSummary = entry.countdownGuidance?.summary
    ? ` ｜ 倒數引導：${entry.countdownGuidance.summary}`
    : '';

  refs.narrationStatusElement.textContent = `語音起點：${formatClock(entry.startsAtSecond)} ｜ 音檔長度：約 ${entry.audioDurationSeconds ?? '未記錄'} 秒${guidanceSummary}`;
  refs.narrationTextElement.textContent = entry.text;
}

export function renderGuidanceLive({ refs, entry, hasNarrationAudio, message }) {
  if (!refs.guidanceLiveElement) {
    return;
  }

  const guidance = entry?.countdownGuidance;

  if (message) {
    refs.guidanceLiveElement.textContent = message;
    return;
  }

  if (!guidance) {
    refs.guidanceLiveElement.textContent = hasNarrationAudio
      ? '這一段目前沒有倒數中的教練引導語音。'
      : '這一天目前先以文字腳本切換流程，尚未配置對應的中段語音。';
    return;
  }

  refs.guidanceLiveElement.textContent = `倒數中會依節奏播放：${guidance.summary}`;
}
