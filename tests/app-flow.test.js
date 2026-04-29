import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildNarrationEntries, buildProgramCalendar } from '../timer-core.js';

const PROJECT_ROOT = '/home/atmjin/.hermes/archive/github/interval-workout-timer';
const START_CUE = './audio/fx/countdown-start.wav';

function nextTurn() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.tokens = new Set();
  }

  setFromString(value) {
    this.tokens = new Set(String(value || '').split(/\s+/).filter(Boolean));
    this.owner._className = [...this.tokens].join(' ');
  }

  add(...tokens) {
    for (const token of tokens) {
      if (token) {
        this.tokens.add(token);
      }
    }
    this.owner._className = [...this.tokens].join(' ');
  }

  remove(...tokens) {
    for (const token of tokens) {
      this.tokens.delete(token);
    }
    this.owner._className = [...this.tokens].join(' ');
  }

  contains(token) {
    return this.tokens.has(token);
  }
}

class FakeElement {
  constructor(tagName, id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.listeners = new Map();
    this.attributes = new Map();
    this.textContent = '';
    this.disabled = false;
    this.type = '';
    this._innerHTML = '';
    this._className = '';
    this.classList = new FakeClassList(this);
  }

  set className(value) {
    this.classList.setFromString(value);
  }

  get className() {
    return this._className;
  }

  set innerHTML(value) {
    this._innerHTML = String(value ?? '');
    this.children = [];
    this.textContent = '';
  }

  get innerHTML() {
    return this._innerHTML;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  dispatchEvent(type) {
    for (const handler of this.listeners.get(type) ?? []) {
      handler({ currentTarget: this, target: this, type });
    }
  }

  click() {
    this.dispatchEvent('click');
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

class FakeDocument {
  constructor(ids) {
    this.elements = new Map();
    for (const id of ids) {
      this.elements.set(id, new FakeElement('div', id));
    }
  }

  querySelector(selector) {
    if (!selector.startsWith('#')) {
      return null;
    }

    return this.elements.get(selector.slice(1)) ?? null;
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }
}

function installFakeDom() {
  const ids = [
    'today-date',
    'today-weekday',
    'today-focus',
    'today-summary',
    'today-title',
    'today-duration',
    'today-notes',
    'phase-label',
    'phase-progress',
    'phase-cue',
    'time-display',
    'status-message',
    'phase-plan',
    'schedule-grid',
    'narration-status',
    'narration-text',
    'guidance-live',
    'start-button',
    'pause-button',
    'reset-button',
    'skip-button',
  ];

  const document = new FakeDocument(ids);
  globalThis.document = document;
  return document;
}

function installFakeWindow() {
  let nextIntervalId = 1;
  let nowMs = 0;
  const intervals = new Map();

  async function runDueCallbacksUntil(targetMs, { coalesce = false } = {}) {
    if (coalesce) {
      nowMs = targetMs;
      const dueEntries = [...intervals.entries()]
        .filter(([, entry]) => entry.nextRunAt <= targetMs)
        .sort((a, b) => a[1].nextRunAt - b[1].nextRunAt || a[0] - b[0]);

      for (const [id, entry] of dueEntries) {
        if (!intervals.has(id)) {
          continue;
        }
        entry.nextRunAt = targetMs + entry.delay;
        await entry.callback();
      }
      return;
    }

    while (true) {
      let nextEntry = null;
      for (const [id, entry] of intervals.entries()) {
        if (entry.nextRunAt > targetMs) {
          continue;
        }
        if (!nextEntry || entry.nextRunAt < nextEntry.entry.nextRunAt || (entry.nextRunAt === nextEntry.entry.nextRunAt && id < nextEntry.id)) {
          nextEntry = { id, entry };
        }
      }

      if (!nextEntry) {
        nowMs = targetMs;
        return;
      }

      nowMs = nextEntry.entry.nextRunAt;
      nextEntry.entry.nextRunAt += nextEntry.entry.delay;
      await nextEntry.entry.callback();
    }
  }

  globalThis.window = {
    performance: {
      now() {
        return nowMs;
      },
    },
    setInterval(callback, delay) {
      const id = nextIntervalId;
      nextIntervalId += 1;
      intervals.set(id, { callback, delay, nextRunAt: nowMs + delay });
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
  };

  return {
    now() {
      return nowMs;
    },
    getActiveIntervalIds() {
      return [...intervals.keys()];
    },
    async tick(id) {
      const entry = intervals.get(id);
      if (!entry) {
        throw new Error(`Unknown interval id: ${id}`);
      }
      nowMs = entry.nextRunAt;
      entry.nextRunAt += entry.delay;
      await entry.callback();
    },
    async advance(ms, options) {
      await runDueCallbacksUntil(nowMs + ms, options);
    },
  };
}

function installFakeDate(isoString = '2026-04-27T08:00:00Z') {
  const RealDate = Date;
  const fixedTime = new RealDate(isoString).getTime();

  class FakeDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixedTime);
        return;
      }

      super(...args);
    }

    static now() {
      return fixedTime;
    }
  }

  globalThis.Date = FakeDate;

  return () => {
    globalThis.Date = RealDate;
  };
}

function installFakeAudio() {
  const events = [];
  const instances = [];

  globalThis.Audio = class FakeAudio {
    constructor() {
      this.src = '';
      this.currentTime = 0;
      this.preload = '';
      this.listeners = new Map();
      instances.push(this);
    }

    addEventListener(type, handler, options = {}) {
      const handlers = this.listeners.get(type) ?? new Set();
      handlers.add({ handler, once: Boolean(options?.once) });
      this.listeners.set(type, handlers);
    }

    removeEventListener(type, handler) {
      const handlers = this.listeners.get(type);
      if (!handlers) {
        return;
      }

      for (const entry of handlers) {
        if (entry.handler === handler) {
          handlers.delete(entry);
        }
      }
    }

    dispatch(type) {
      const handlers = [...(this.listeners.get(type) ?? [])];
      for (const entry of handlers) {
        entry.handler();
        if (entry.once) {
          this.listeners.get(type)?.delete(entry);
        }
      }
    }

    pause() {
      events.push({ type: 'pause', src: this.src });
    }

    play() {
      events.push({ type: 'play', src: this.src });
      return Promise.resolve();
    }
  };

  return { events, instances };
}

function buildManifestForEntry(entry, options = {}) {
  const audioDurations = options.audioDurations ?? {};

  return {
    entries: buildNarrationEntries(entry.session).map((item) => ({
      ...item,
      audioFile: `./audio/today/generated/${item.id}.wav`,
      audioDurationSeconds: audioDurations[item.id] ?? Math.min(item.durationSeconds, 12),
    })),
  };
}

function installFakeFetch(manifest) {
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return manifest;
    },
  });
}

function findDayButton(root, dayOffset) {
  const queue = [...root.children];

  while (queue.length > 0) {
    const node = queue.shift();
    if (node?.dataset?.dayOffset === String(dayOffset)) {
      return node;
    }
    queue.push(...(node?.children ?? []));
  }

  return null;
}

async function bootApp({
  isoString = '2026-04-27T08:00:00Z',
  manifestEntry = 0,
  manifestOptions = {},
} = {}) {
  const restoreDate = installFakeDate(isoString);
  const calendar = buildProgramCalendar('2026-04-27');
  const todayEntry = typeof manifestEntry === 'number' ? calendar[manifestEntry] : manifestEntry;
  const document = installFakeDom();
  const timer = installFakeWindow();
  const audio = installFakeAudio();
  installFakeFetch(buildManifestForEntry(todayEntry, manifestOptions));

  const moduleUrl = `${pathToFileURL(path.join(PROJECT_ROOT, 'app.js')).href}?test=${Date.now()}-${Math.random()}`;
  await import(moduleUrl);
  await nextTurn();
  await nextTurn();

  return { calendar, document, timer, audio, restoreDate };
}

test('切換到沒有專用語音的日子時，會重設課表並退回文字腳本模式', async () => {
  const { calendar, document, audio, restoreDate } = await bootApp();
  try {
    const startButton = document.querySelector('#start-button');
    const scheduleGrid = document.querySelector('#schedule-grid');
    const phaseLabel = document.querySelector('#phase-label');
    const timeDisplay = document.querySelector('#time-display');
    const statusMessage = document.querySelector('#status-message');
    const narrationStatus = document.querySelector('#narration-status');
    const guidanceLive = document.querySelector('#guidance-live');

    startButton.click();
    await nextTurn();

    const dayThreeButton = findDayButton(scheduleGrid, 2);
    assert.ok(dayThreeButton, '應能找到第 1 週第 3 天的日程按鈕');
    dayThreeButton.click();
    await nextTurn();

    const playEvents = audio.events.filter((event) => event.type === 'play').map((event) => event.src);
    const pauseEvents = audio.events.filter((event) => event.type === 'pause').map((event) => event.src);

    assert.deepEqual(playEvents, ['./audio/today/generated/phase-01.wav']);
    assert.ok(pauseEvents.length >= 1, '切日時應中止目前正在播放的旁白');
    assert.equal(phaseLabel.textContent, calendar[2].session.phases[0].label);
    assert.equal(timeDisplay.textContent, '02:00');
    assert.equal(statusMessage.textContent, '已切換到第 1 週第 3 天。按開始後會載入這一天的流程。');
    assert.equal(narrationStatus.textContent, '這一天目前只有文字腳本，尚未對應專用語音素材。');
    assert.equal(guidanceLive.textContent, '這一天目前先以文字腳本切換流程，尚未配置對應的中段語音。');
  } finally {
    restoreDate();
  }
});

test('沒有專用語音的日子開始倒數前，也會先播放開始音效', async () => {
  const { calendar, document, timer, audio, restoreDate } = await bootApp();
  try {
    const startButton = document.querySelector('#start-button');
    const scheduleGrid = document.querySelector('#schedule-grid');
    const statusMessage = document.querySelector('#status-message');
    const narrationStatus = document.querySelector('#narration-status');
    const timeDisplay = document.querySelector('#time-display');

    const dayThreeButton = findDayButton(scheduleGrid, 2);
    assert.ok(dayThreeButton, '應能找到第 1 週第 3 天的日程按鈕');
    dayThreeButton.click();
    await nextTurn();

    startButton.click();
    await nextTurn();

    const playEvents = audio.events.filter((event) => event.type === 'play').map((event) => event.src);
    assert.deepEqual(playEvents, [START_CUE]);
    assert.equal(statusMessage.textContent, `準備開始 ${calendar[2].session.phases[0].label}，先播放開始音效。`);

    audio.instances[1].dispatch('ended');
    await nextTurn();

    const [intervalId] = timer.getActiveIntervalIds();
    assert.ok(intervalId, '開始音效播完後應建立計時器');
    assert.equal(statusMessage.textContent, `${calendar[2].session.phases[0].label} 開始倒數。`);
    assert.equal(narrationStatus.textContent, `開始音效已播完：${calendar[2].session.phases[0].label}`);

    await timer.tick(intervalId);
    assert.equal(timeDisplay.textContent, '01:59');
  } finally {
    restoreDate();
  }
});

test('倒數已開始後暫停再恢復，只會重播開始音效，不會重播整段旁白', async () => {
  const { document, timer, audio, restoreDate } = await bootApp();
  try {
    const startButton = document.querySelector('#start-button');
    const pauseButton = document.querySelector('#pause-button');
    const statusMessage = document.querySelector('#status-message');
    const timeDisplay = document.querySelector('#time-display');

    startButton.click();
    await nextTurn();
    audio.instances[0].dispatch('ended');
    await nextTurn();
    audio.instances[1].dispatch('ended');
    await nextTurn();

    const [intervalId] = timer.getActiveIntervalIds();
    assert.ok(intervalId, '開始倒數後應建立計時器');
    await timer.tick(intervalId);
    assert.equal(timeDisplay.textContent, '00:59');

    pauseButton.click();
    await nextTurn();
    assert.equal(statusMessage.textContent, '已暫停。重新開始時會先播開始音效，再繼續倒數。');

    startButton.click();
    await nextTurn();

    const playEvents = audio.events.filter((event) => event.type === 'play').map((event) => event.src);
    assert.deepEqual(playEvents, [
      './audio/today/generated/phase-01.wav',
      START_CUE,
      START_CUE,
    ]);
    assert.equal(statusMessage.textContent, '準備恢復 準備放鬆，先播放開始音效。');
  } finally {
    restoreDate();
  }
});

test('跳到下一段時會停止目前播放並切到下一個 phase', async () => {
  const { calendar, document, audio, restoreDate } = await bootApp();
  try {
    const startButton = document.querySelector('#start-button');
    const skipButton = document.querySelector('#skip-button');
    const phaseLabel = document.querySelector('#phase-label');
    const statusMessage = document.querySelector('#status-message');

    startButton.click();
    await nextTurn();
    skipButton.click();
    await nextTurn();

    const pauseEvents = audio.events.filter((event) => event.type === 'pause').map((event) => event.src);
    assert.ok(pauseEvents.length >= 1, '跳段時應停止目前正在播放的音訊');
    assert.equal(phaseLabel.textContent, calendar[0].session.phases[1].label);
    assert.equal(statusMessage.textContent, `已切換到 ${calendar[0].session.phases[1].label}。按開始後會先播階段說明，再開始倒數。`);
  } finally {
    restoreDate();
  }
});

test('倒數 heartbeat 延遲後，畫面秒數會用 monotonic clock 正確追上', async () => {
  const { document, timer, audio, restoreDate } = await bootApp();
  try {
    const startButton = document.querySelector('#start-button');
    const timeDisplay = document.querySelector('#time-display');

    startButton.click();
    await nextTurn();
    audio.instances[0].dispatch('ended');
    await nextTurn();
    audio.instances[1].dispatch('ended');
    await nextTurn();

    assert.equal(timeDisplay.textContent, '01:00');
    await timer.advance(3200, { coalesce: true });

    assert.equal(timeDisplay.textContent, '00:57');
  } finally {
    restoreDate();
  }
});

test('今天是 2026-04-28 時，app 會載入正式訓練日的專用語音素材', async () => {
  const { calendar, document, restoreDate } = await bootApp({
    isoString: '2026-04-28T08:00:00Z',
    manifestEntry: 1,
    manifestOptions: {
      audioDurations: {
        'phase-01': 13.56,
        'phase-02': 9.84,
        'phase-03': 12.48,
        'phase-04': 11.72,
        'phase-05': 10.68,
      },
    },
  });
  try {
    const title = document.querySelector('#today-title');
    const phaseLabel = document.querySelector('#phase-label');
    const narrationStatus = document.querySelector('#narration-status');
    const narrationText = document.querySelector('#narration-text');
    const guidanceLive = document.querySelector('#guidance-live');

    assert.equal(title.textContent, '正式訓練日');
    assert.equal(phaseLabel.textContent, calendar[1].session.phases[0].label);
    assert.equal(narrationStatus.textContent, '語音起點：00:00 ｜ 音檔長度：約 13.56 秒');
    assert.match(narrationText.textContent, /現在開始：準備期。這一段約 2 分鐘。呼吸、放鬆與設定今天只做地圖建立。/);
    assert.equal(guidanceLive.textContent, '這一段目前沒有倒數中的教練引導語音。');
  } finally {
    restoreDate();
  }
});
