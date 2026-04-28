const DEFAULT_TRACK_STATES = {
  narration: { track: 'narration', status: 'idle', src: null },
  cue: { track: 'cue', status: 'idle', src: null },
  'guidance-primary': { track: 'guidance-primary', status: 'idle', src: null },
  'guidance-secondary': { track: 'guidance-secondary', status: 'idle', src: null },
  ambient: { track: 'ambient', status: 'idle', src: null },
};

export function createAudioEngine({
  createAudio = () => (typeof Audio !== 'undefined' ? new Audio() : null),
} = {}) {
  const controllers = new Map();
  const trackStates = new Map(
    Object.values(DEFAULT_TRACK_STATES).map((state) => [state.track, { ...state }]),
  );
  const preloadedSrcs = new Set();

  function ensureTrackState(track) {
    if (!trackStates.has(track)) {
      trackStates.set(track, { track, status: 'idle', src: null });
    }

    return trackStates.get(track);
  }

  function setTrackState(track, patch) {
    const next = { ...ensureTrackState(track), ...patch };
    trackStates.set(track, next);
    return next;
  }

  function createController(track) {
    const audio = createAudio();
    let cancelCurrentPlayback = null;

    if (audio) {
      audio.preload = 'auto';
    }

    return {
      play(src) {
        cancelCurrentPlayback?.('interrupted');
        audio?.pause?.();
        if (audio) {
          audio.currentTime = 0;
          audio.src = src;
        }
        setTrackState(track, { status: 'playing', src });

        return new Promise((resolve, reject) => {
          let settled = false;

          const cleanup = () => {
            audio?.removeEventListener?.('ended', handleEnded);
            audio?.removeEventListener?.('error', handleError);
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
            setTrackState(track, { status: 'idle', src: null });
            resolve(result);
          };

          const fail = (error) => {
            if (settled) {
              return;
            }

            settled = true;
            cleanup();
            setTrackState(track, { status: 'idle', src: null });
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
          audio?.addEventListener?.('ended', handleEnded, { once: true });
          audio?.addEventListener?.('error', handleError, { once: true });

          Promise.resolve(audio?.play?.() ?? 'ended').catch(fail);
        });
      },
      stop(reason = 'cancelled') {
        cancelCurrentPlayback?.(reason);
        audio?.pause?.();
        if (audio) {
          audio.currentTime = 0;
        }
        setTrackState(track, { status: 'idle', src: null });
      },
      preload(src) {
        if (!audio || !src) {
          return;
        }

        audio.src = src;
        audio.load?.();
      },
    };
  }

  function controllerFor(track) {
    if (!controllers.has(track)) {
      controllers.set(track, createController(track));
    }

    return controllers.get(track);
  }

  function playClip({ track, src, interruptPolicy = 'replace-track' } = {}) {
    if (!track || !src) {
      return Promise.resolve(null);
    }

    const controller = controllerFor(track);
    if (interruptPolicy !== 'replace-track') {
      return controller.play(src);
    }

    return controller.play(src);
  }

  function stopTrack(track, reason = 'cancelled') {
    controllerFor(track).stop(reason);
  }

  function stopAll(reason = 'cancelled') {
    for (const track of new Set([...trackStates.keys(), ...controllers.keys()])) {
      stopTrack(track, reason);
    }
  }

  function reset() {
    stopAll('cancelled');
  }

  function preload(clips = []) {
    for (const clip of clips) {
      const track = clip?.track;
      const src = clip?.src;
      if (!track || !src || preloadedSrcs.has(src)) {
        continue;
      }

      preloadedSrcs.add(src);
      controllerFor(track).preload(src);
      setTrackState(track, { status: 'idle', src: null });
    }
  }

  function getTrackState(track) {
    return { ...ensureTrackState(track) };
  }

  for (const track of Object.keys(DEFAULT_TRACK_STATES)) {
    controllerFor(track);
  }

  return {
    playClip,
    stopTrack,
    stopAll,
    reset,
    preload,
    getTrackState,
  };
}
