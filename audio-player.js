export async function loadNarrationManifest(url = './audio/today/narration-manifest.json') {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`無法讀取語音清單：${response.status}`);
  }

  return response.json();
}

export function createNarrationPlayer(manifest, options = {}) {
  const entries = Array.isArray(manifest?.entries) ? manifest.entries : [];
  const narrationAudio = typeof Audio !== 'undefined' ? new Audio() : null;
  const cueAudio = typeof Audio !== 'undefined' ? new Audio() : null;
  const startCueFile = options.startCueFile ?? './audio/fx/countdown-start.wav';
  const endCueFile = options.endCueFile ?? './audio/fx/countdown-end.wav';
  let lastPlayedId = null;

  if (narrationAudio) {
    narrationAudio.preload = 'auto';
  }

  if (cueAudio) {
    cueAudio.preload = 'auto';
  }

  async function playPhaseIntro(phaseIndex, playbackMode = 'full') {
    const entry = entries.find((item) => item.phaseIndex === phaseIndex);

    if (!entry || !narrationAudio || !cueAudio) {
      return entry ?? null;
    }

    if (playbackMode === 'full') {
      if (lastPlayedId === entry.id) {
        return entry;
      }

      await playClip(narrationAudio, entry.audioFile);
      lastPlayedId = entry.id;
    }

    if (startCueFile) {
      await playClip(cueAudio, startCueFile);
    }

    return entry;
  }

  async function playPhaseEndCue() {
    if (!cueAudio || !endCueFile) {
      return null;
    }

    await playClip(cueAudio, endCueFile);
    return endCueFile;
  }

  function reset() {
    if (narrationAudio) {
      narrationAudio.pause();
      narrationAudio.currentTime = 0;
    }

    if (cueAudio) {
      cueAudio.pause();
      cueAudio.currentTime = 0;
    }

    lastPlayedId = null;
  }

  function getEntryForPhase(phaseIndex) {
    return entries.find((item) => item.phaseIndex === phaseIndex) ?? null;
  }

  return {
    playPhaseIntro,
    playPhaseEndCue,
    reset,
    getEntryForPhase,
  };
}

async function playClip(audio, src) {
  audio.pause();
  audio.currentTime = 0;
  audio.src = src;
  await audio.play();
}
