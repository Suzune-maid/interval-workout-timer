export function createScreenWakeLockController({
  navigator = globalThis.navigator,
  document = globalThis.document,
} = {}) {
  let wakeLockSentinel = null;
  let shouldKeepAwake = false;
  let requestInFlight = null;

  function isSupported() {
    return Boolean(navigator?.wakeLock?.request);
  }

  function isVisible() {
    return document?.visibilityState !== 'hidden';
  }

  async function request() {
    shouldKeepAwake = true;

    if (!isSupported() || !isVisible()) {
      return false;
    }

    if (wakeLockSentinel) {
      return true;
    }

    if (requestInFlight) {
      return requestInFlight;
    }

    requestInFlight = navigator.wakeLock.request('screen')
      .then(async (sentinel) => {
        requestInFlight = null;

        if (!shouldKeepAwake) {
          await sentinel.release?.();
          return false;
        }

        wakeLockSentinel = sentinel;
        sentinel.addEventListener?.('release', () => {
          if (wakeLockSentinel === sentinel) {
            wakeLockSentinel = null;
          }
        });
        return true;
      })
      .catch(() => {
        requestInFlight = null;
        return false;
      });

    return requestInFlight;
  }

  async function release() {
    shouldKeepAwake = false;
    const sentinel = wakeLockSentinel;
    wakeLockSentinel = null;

    if (!sentinel || sentinel.released) {
      return false;
    }

    await sentinel.release?.();
    return true;
  }

  document?.addEventListener?.('visibilitychange', () => {
    if (shouldKeepAwake && isVisible() && !wakeLockSentinel) {
      void request();
    }
  });

  return {
    isSupported,
    isActive() {
      return Boolean(wakeLockSentinel);
    },
    request,
    release,
  };
}
