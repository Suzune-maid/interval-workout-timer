function toClipMap(value) {
  if (!value) {
    return {};
  }

  if (Array.isArray(value)) {
    return Object.fromEntries(
      value
        .filter((item) => item?.id)
        .map((item) => [item.id, { ...item }]),
    );
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item)
        .map(([clipId, item]) => [clipId, { id: item.id ?? clipId, ...item }]),
    );
  }

  return {};
}

function toTimelineEvents(entry) {
  if (Array.isArray(entry?.timelineEvents)) {
    return entry.timelineEvents.map((event, index) => normalizeTimelineEvent(entry, event, index));
  }

  if (Array.isArray(entry?.countdownGuidance?.events)) {
    return entry.countdownGuidance.events.map((event, index) => normalizeTimelineEvent(entry, event, index));
  }

  return [];
}

function normalizeTimelineEvent(entry, event, index) {
  const startAtSecond = Number.isFinite(event?.startAtSecond)
    ? event.startAtSecond
    : Number.isFinite(event?.elapsedSecond)
      ? event.elapsedSecond
      : 0;

  return {
    id: event?.id ?? `${entry?.id ?? 'phase'}-${event?.clipId ?? 'clip'}-${String(index).padStart(3, '0')}`,
    startAtSecond,
    clipId: event?.clipId ?? null,
    track: event?.track ?? 'guidance-primary',
    priority: event?.priority ?? 'primary',
    interruptPolicy: event?.interruptPolicy ?? 'replace-track',
    duckingGroup: event?.duckingGroup ?? 'speech',
    volume: event?.volume ?? 1,
  };
}

function buildCountdownGuidance(entry, timelineClips, timelineEvents) {
  if (!entry?.countdownGuidance && timelineEvents.length === 0) {
    return null;
  }

  return {
    ...(entry?.countdownGuidance ?? {}),
    clips: timelineClips,
    events: timelineEvents.map((event) => ({
      elapsedSecond: event.startAtSecond,
      clipId: event.clipId,
    })),
  };
}

function normalizeEntry(entry) {
  const timelineClips = toClipMap(entry?.timelineClips ?? entry?.countdownGuidance?.clips);
  const timelineEvents = toTimelineEvents(entry);

  return {
    ...entry,
    timelineClips,
    timelineEvents,
    countdownGuidance: buildCountdownGuidance(entry, timelineClips, timelineEvents),
  };
}

export function normalizeNarrationManifest(document) {
  const entries = Array.isArray(document?.entries)
    ? document.entries.map((entry) => normalizeEntry(entry))
    : [];

  return {
    ...document,
    schemaVersion: document?.schemaVersion ?? 'legacy-phase-guidance',
    entries,
  };
}
