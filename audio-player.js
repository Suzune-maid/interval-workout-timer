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

  const narrationController = narrationAudio ? createAudioController(narrationAudio) : null;
  const cueController = cueAudio ? createAudioController(cueAudio) : null;

  if (narrationAudio) {
    narrationAudio.preload = 'auto';
  }

  if (cueAudio) {
    cueAudio.preload = 'auto';
  }

  async function playPhaseIntro(phaseIndex, playbackMode = 'full') {
    const entry = entries.find((item) => item.phaseIndex === phaseIndex);

    if (!entry || !cueController) {
      return entry ?? null;
    }

    if (playbackMode === 'full') {
      if (lastPlayedId === entry.id) {
        return entry;
      }

      if (narrationController) {
        const narrationResult = await narrationController.play(entry.audioFile);
        if (narrationResult !== 'ended') {
          return entry;
        }
      }

      lastPlayedId = entry.id;
    }

    if (startCueFile) {
      const cueResult = await cueController.play(startCueFile);
      if (cueResult !== 'ended') {
        return entry;
      }
    }

    return entry;
  }

  async function playPhaseEndCue() {
    if (!cueController || !endCueFile) {
      return null;
    }

    return cueController.play(endCueFile);
  }

  function reset() {
    narrationController?.stop();
    cueController?.stop();
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

function createAudioController(audio) {
  let cancelCurrentPlayback = null;

  return {
    async play(src) {
      cancelCurrentPlayback?.('interrupted');
      audio.pause();
      audio.currentTime = 0;
      audio.src = src;

      return new Promise((resolve, reject) => {
        let settled = false;

        const cleanup = () => {
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
          if (cancelCurrentPlayback === handleCancel) {
            cancelCurrentPlayback = null;
          }
        };

        const finish = (result) => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();
          resolve(result);
        };

        const fail = (error) => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();
          reject(error);
        };

        const handleEnded = () => {
          finish('ended');
        };

        const handleError = () => {
          fail(new Error(`音訊播放失敗：${src}`));
        };

        const handleCancel = (reason = 'cancelled') => {
          finish(reason);
        };

        cancelCurrentPlayback = handleCancel;
        audio.addEventListener('ended', handleEnded, { once: true });
        audio.addEventListener('error', handleError, { once: true });

        Promise.resolve(audio.play()).catch(fail);
      });
    },

    stop() {
      cancelCurrentPlayback?.('cancelled');
      audio.pause();
      audio.currentTime = 0;
    },
  };
}
