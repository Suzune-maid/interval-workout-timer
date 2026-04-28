import { createAudioEngine } from './audio-engine.js';
import { normalizeNarrationManifest } from './narration-manifest.js';

export async function loadNarrationManifest(url = './audio/today/narration-manifest.json') {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`無法讀取語音清單：${response.status}`);
  }

  const raw = await response.json();
  return normalizeNarrationManifest(raw);
}

export function createNarrationPlayer(manifest, options = {}) {
  const normalizedManifest = normalizeNarrationManifest(manifest);
  const entries = Array.isArray(normalizedManifest?.entries) ? normalizedManifest.entries : [];
  const startCueFile = options.startCueFile ?? './audio/fx/countdown-start.wav';
  const endCueFile = options.endCueFile ?? './audio/fx/countdown-end.wav';
  const engine = options.engine ?? createAudioEngine();
  let lastPlayedId = null;
  const playedGuidanceEvents = new Set();

  async function playPhaseIntro(phaseIndex, playbackMode = 'full') {
    const entry = entries.find((item) => item.phaseIndex === phaseIndex);

    if (!entry) {
      return null;
    }

    if (playbackMode === 'full') {
      if (lastPlayedId === entry.id) {
        return entry;
      }

      const narrationResult = await engine.playClip({
        track: 'narration',
        src: entry.audioFile,
        priority: 'primary',
        interruptPolicy: 'replace-track',
        duckingGroup: 'speech',
      });

      if (narrationResult !== 'ended') {
        return entry;
      }

      lastPlayedId = entry.id;
    }

    if (startCueFile) {
      const cueResult = await engine.playClip({
        track: 'cue',
        src: startCueFile,
        priority: 'high',
        interruptPolicy: 'replace-track',
      });
      if (cueResult !== 'ended') {
        return entry;
      }
    }

    return entry;
  }

  async function playCountdownGuidance(phaseIndex, elapsedSecond) {
    const entry = entries.find((item) => item.phaseIndex === phaseIndex);
    const guidance = entry?.countdownGuidance;

    if (!entry || !guidance) {
      return null;
    }

    const guidanceEvent = entry.timelineEvents?.find((item) => item.startAtSecond === elapsedSecond)
      ?? guidance.events?.find((item) => item.elapsedSecond === elapsedSecond)
      ?? null;

    if (!guidanceEvent) {
      return null;
    }

    const eventKey = guidanceEvent.id ?? `${entry.id}:${guidanceEvent.startAtSecond ?? guidanceEvent.elapsedSecond}:${guidanceEvent.clipId}`;
    if (playedGuidanceEvents.has(eventKey)) {
      return null;
    }

    const clip = entry.timelineClips?.[guidanceEvent.clipId] ?? guidance.clips?.[guidanceEvent.clipId];
    if (!clip?.audioFile) {
      return null;
    }

    playedGuidanceEvents.add(eventKey);
    const result = await engine.playClip({
      track: guidanceEvent.track ?? 'guidance-primary',
      src: clip.audioFile,
      priority: guidanceEvent.priority ?? 'primary',
      interruptPolicy: guidanceEvent.interruptPolicy ?? 'replace-track',
      duckingGroup: guidanceEvent.duckingGroup ?? 'speech',
      volume: guidanceEvent.volume ?? 1,
    });

    if (result !== 'ended') {
      return null;
    }

    return {
      ...guidanceEvent,
      elapsedSecond: guidanceEvent.elapsedSecond ?? guidanceEvent.startAtSecond,
      text: clip.text,
      audioFile: clip.audioFile,
    };
  }

  async function playPhaseEndCue() {
    if (!endCueFile) {
      return null;
    }

    return engine.playClip({
      track: 'cue',
      src: endCueFile,
      priority: 'high',
      interruptPolicy: 'replace-track',
    });
  }

  function stopTrack(track) {
    engine.stopTrack(track);
  }

  function stopAll() {
    engine.stopAll();
  }

  function stopActivePlayback() {
    stopAll();
  }

  function reset() {
    lastPlayedId = null;
    playedGuidanceEvents.clear();
    engine.reset();
  }

  function preload(clips) {
    engine.preload(clips);
  }

  function getTrackState(track) {
    return engine.getTrackState(track);
  }

  function getEntryForPhase(phaseIndex) {
    return entries.find((item) => item.phaseIndex === phaseIndex) ?? null;
  }

  return {
    playPhaseIntro,
    playCountdownGuidance,
    playPhaseEndCue,
    stopTrack,
    stopAll,
    stopActivePlayback,
    reset,
    preload,
    getTrackState,
    getEntryForPhase,
  };
}
