export async function loadNarrationManifest(url = './audio/today/narration-manifest.json') {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`無法讀取語音清單：${response.status}`);
  }

  return response.json();
}

export function createNarrationPlayer(manifest) {
  const entries = Array.isArray(manifest?.entries) ? manifest.entries : [];
  const audio = typeof Audio !== 'undefined' ? new Audio() : null;
  let lastPlayedId = null;

  if (audio) {
    audio.preload = 'auto';
  }

  async function playForPhase(phaseIndex) {
    const entry = entries.find((item) => item.phaseIndex === phaseIndex);

    if (!entry || !audio || lastPlayedId === entry.id) {
      return entry ?? null;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.src = entry.audioFile;
    lastPlayedId = entry.id;

    await audio.play();
    return entry;
  }

  function reset() {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    lastPlayedId = null;
  }

  function getEntryForPhase(phaseIndex) {
    return entries.find((item) => item.phaseIndex === phaseIndex) ?? null;
  }

  return {
    playForPhase,
    reset,
    getEntryForPhase,
  };
}
