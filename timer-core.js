const PROGRAM_WEEKS = 6;
const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const WEEK_FOCUS = {
  1: '建立地圖',
  2: '高原期訓練',
  3: '第一次乾式波峰嘗試',
  4: '兩次乾式波峰嘗試',
  5: '縮短下降幅度',
  6: '乾式高潮專項回合',
};

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export function buildWorkoutPlan({ trainSeconds, restSeconds, rounds }) {
  const safeTrain = normalizePositiveSeconds(trainSeconds);
  const safeRest = normalizePositiveSeconds(restSeconds);
  const safeRounds = normalizePositiveInteger(rounds);
  const phases = [];

  for (let round = 1; round <= safeRounds; round += 1) {
    phases.push({
      type: 'train',
      label: `訓練 ${round}`,
      seconds: safeTrain,
      round,
    });

    if (round < safeRounds) {
      phases.push({
        type: 'rest',
        label: `放鬆 ${round}`,
        seconds: safeRest,
        round,
      });
    }
  }

  return phases;
}

export function createSessionState(config) {
  return createSessionStateFromPhases(buildWorkoutPlan(config));
}

export function createSessionStateFromPhases(phases) {
  const normalizedPhases = Array.isArray(phases)
    ? phases.map((phase, index) => ({
        ...phase,
        seconds: normalizePositiveSeconds(phase.seconds),
        order: index + 1,
      }))
    : [];

  return {
    phases: normalizedPhases,
    currentPhaseIndex: 0,
    remainingSeconds: normalizedPhases[0]?.seconds ?? 0,
    isRunning: false,
    isComplete: normalizedPhases.length === 0,
  };
}

export function advancePhase(state) {
  const nextPhaseIndex = getNextPhaseIndex(state.currentPhaseIndex, state.phases);

  if (nextPhaseIndex === null) {
    return {
      ...state,
      remainingSeconds: 0,
      isRunning: false,
      isComplete: true,
    };
  }

  return {
    ...state,
    currentPhaseIndex: nextPhaseIndex,
    remainingSeconds: state.phases[nextPhaseIndex].seconds,
    isComplete: false,
  };
}

export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutesPart = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secondsPart = String(seconds % 60).padStart(2, '0');
  return `${minutesPart}:${secondsPart}`;
}

export function getNextPhaseIndex(currentIndex, phases) {
  if (!Array.isArray(phases) || currentIndex >= phases.length - 1) {
    return null;
  }
  return currentIndex + 1;
}

export function resolveProgramDay(startDate, targetDate, totalWeeks = PROGRAM_WEEKS) {
  const safeTotalDays = normalizePositiveInteger(totalWeeks) * DAYS_PER_WEEK;
  const rawOffset = diffDays(startDate, targetDate);
  const dayOffset = clamp(rawOffset, 0, safeTotalDays - 1);
  const weekNumber = Math.floor(dayOffset / DAYS_PER_WEEK) + 1;
  const dayNumber = (dayOffset % DAYS_PER_WEEK) + 1;

  return {
    startDate,
    targetDate,
    rawOffset,
    dayOffset,
    weekNumber,
    dayNumber,
    weekdayLabel: WEEKDAY_LABELS[dayNumber - 1],
    weekFocus: WEEK_FOCUS[weekNumber],
    isBeforeStart: rawOffset < 0,
    isAfterProgram: rawOffset >= safeTotalDays,
  };
}

export function buildProgramCalendar(startDate, totalWeeks = PROGRAM_WEEKS) {
  const safeTotalWeeks = normalizePositiveInteger(totalWeeks);
  const calendar = [];

  for (let offset = 0; offset < safeTotalWeeks * DAYS_PER_WEEK; offset += 1) {
    const date = addDays(startDate, offset);
    const weekNumber = Math.floor(offset / DAYS_PER_WEEK) + 1;
    const dayNumber = (offset % DAYS_PER_WEEK) + 1;

    calendar.push({
      date,
      dayOffset: offset,
      weekNumber,
      dayNumber,
      weekdayLabel: WEEKDAY_LABELS[dayNumber - 1],
      session: buildDailySession(weekNumber, dayNumber),
    });
  }

  return calendar;
}

export function buildDailySession(weekNumber, dayNumber) {
  const safeWeek = clamp(normalizePositiveInteger(weekNumber), 1, PROGRAM_WEEKS);
  const safeDay = clamp(normalizePositiveInteger(dayNumber), 1, DAYS_PER_WEEK);

  if (safeDay === 1 || safeDay === 4) {
    return buildKegelSession(safeWeek, false);
  }

  if (safeDay === 2 || safeDay === 5) {
    return buildFormalSession(safeWeek);
  }

  if (safeDay === 3) {
    return buildRelaxSession(safeWeek);
  }

  if (safeDay === 6) {
    return buildKegelSession(safeWeek, true);
  }

  return buildRestSession(safeWeek);
}

export function buildNarrationEntries(session) {
  const phases = Array.isArray(session?.phases) ? session.phases : [];
  let startsAtSecond = 0;

  return phases.map((phase, phaseIndex) => {
    const durationSeconds = normalizePositiveSeconds(phase.seconds);
    const entry = {
      id: `phase-${String(phaseIndex + 1).padStart(2, '0')}`,
      phaseIndex,
      phaseLabel: phase.label,
      startsAtSecond,
      durationSeconds,
      text: `現在開始：${phase.label}。這一段約 ${formatNarrationDuration(durationSeconds)}。${phase.cue ?? '請保持穩定節奏。'}`,
    };

    startsAtSecond += durationSeconds;
    return entry;
  });
}

export function findNarrationEntryByPhase(entries, phaseIndex) {
  return Array.isArray(entries)
    ? entries.find((entry) => entry.phaseIndex === phaseIndex) ?? null
    : null;
}

function buildKegelSession(weekNumber, isAdaptiveDay) {
  const base = getKegelWeekConfig(weekNumber);
  const phases = [
    makePhase('準備放鬆', 60, '腹式呼吸，放鬆腹部、臀部與大腿。'),
    makePhase(`慢速 Kegel（${base.slowCount} 次）`, base.slowCount * (base.slowHold + base.slowRest), `每次收 ${base.slowHold} 秒、放 ${base.slowRest} 秒。`),
    makePhase(`快速 Kegel（${base.quickCount} 次）`, base.quickCount * 2, '輕點一下，立刻完全放掉。'),
    makePhase('反向 Kegel', base.reverseSeconds, '吸氣下沉，吐氣時保持鬆開。'),
  ];

  if (base.includeWaveSimulation) {
    phases.push(makePhase('波峰模擬（5 回）', 50, '輕收 1 秒後完全放掉，再接一輪下沉呼吸。'));
  }

  phases.push(makePhase('收尾掃描', 60, '檢查會陰、臀部、大腿與排尿感是否有緊繃。'));

  return {
    kind: 'kegel',
    title: isAdaptiveDay ? 'Kegel 普通日（可依狀態改放鬆）' : 'Kegel 普通日',
    durationLabel: base.durationLabel,
    weekFocus: WEEK_FOCUS[weekNumber],
    summary: base.summary,
    notes: [
      '力道只用 30～50%，不要夾屁股、縮腹或憋氣。',
      isAdaptiveDay ? '如果今天會陰偏緊、排尿怪或疲勞，改成純放鬆日。' : '重點是收得起來，也放得下去。',
    ],
    phases,
  };
}

function buildFormalSession(weekNumber) {
  const config = getFormalWeekConfig(weekNumber);

  return {
    kind: 'formal',
    title: '正式訓練日',
    durationLabel: config.durationLabel,
    weekFocus: WEEK_FOCUS[weekNumber],
    summary: config.summary,
    notes: config.notes,
    phases: config.phases,
  };
}

function buildRelaxSession(weekNumber) {
  return {
    kind: 'relax',
    title: '放鬆日',
    durationLabel: '5 分鐘',
    weekFocus: WEEK_FOCUS[weekNumber],
    summary: '把今天當成降張力日，專心腹式呼吸與反向 Kegel，不追求刺激。',
    notes: [
      '若最近會陰緊、尿道怪或正式訓練後悶痛，今天只做放鬆。',
      '重點是吐氣時維持鬆開，不要重新夾緊骨盆底。',
    ],
    phases: [
      makePhase('腹式呼吸', 120, '鼻吸嘴吐，讓腹部自然膨起。'),
      makePhase('反向 Kegel', 180, '吸氣下沉，吐氣保持放鬆。'),
      makePhase('收尾掃描', 60, '確認腹部、臀部與大腿都沒有偷用力。'),
    ],
  };
}

function buildRestSession(weekNumber) {
  return {
    kind: 'rest',
    title: '休息／輕放鬆日',
    durationLabel: '3～5 分鐘',
    weekFocus: WEEK_FOCUS[weekNumber],
    summary: '今天以恢復為主。若想維持節奏，只做短版呼吸放鬆即可。',
    notes: [
      '不要補做高強度正式訓練。',
      '如果身體狀態很好，也以休息優先，不把不射當壓力。',
    ],
    phases: [
      makePhase('短版呼吸放鬆', 180, '用 3 分鐘把骨盆底、臀部與腹部慢慢放鬆。'),
    ],
  };
}

function getKegelWeekConfig(weekNumber) {
  if (weekNumber <= 2) {
    return {
      slowHold: 3,
      slowRest: 6,
      slowCount: 10,
      quickCount: 10,
      reverseSeconds: 120,
      includeWaveSimulation: false,
      durationLabel: '8～10 分鐘',
      summary: '本週先找準肌肉位置，確認每次收完都能完全放掉。',
    };
  }

  if (weekNumber <= 4) {
    return {
      slowHold: 5,
      slowRest: 8,
      slowCount: 10,
      quickCount: 12,
      reverseSeconds: 150,
      includeWaveSimulation: false,
      durationLabel: '8～10 分鐘',
      summary: '本週建立輕收、快放與正式訓練時不不自覺夾緊的控制力。',
    };
  }

  return {
    slowHold: 6,
    slowRest: 10,
    slowCount: 8,
    quickCount: 10,
    reverseSeconds: 180,
    includeWaveSimulation: true,
    durationLabel: '9～12 分鐘',
    summary: '本週把重點放在接近 7 分時的放鬆習慣，而不是越接近越夾緊。',
  };
}

function getFormalWeekConfig(weekNumber) {
  const configs = {
    1: {
      durationLabel: '15～20 分鐘',
      summary: '本週先建立 5、6、7 分的地圖，不急著追求乾式波峰。',
      notes: [
        '第 1 回只到 5 分，第 2 回到 6 分，第 3 回接近 7 分就停。',
        '停止後能退回 4 分、而且沒有疼痛，就是今天的成功。',
      ],
      phases: [
        makePhase('準備期', 120, '呼吸、放鬆與設定今天只做地圖建立。'),
        makePhase('第 1 回：到 5 分停', 180, '穩定上升到 5 分後停止。'),
        makePhase('第 2 回：到 6 分停', 240, '感受高原區與可控感。'),
        makePhase('第 3 回：接近 7 分立刻停', 240, '有射精感冒出就停，不強求波峰。'),
        makePhase('收尾放鬆', 180, '可正常結束，最後做呼吸與反向 Kegel。'),
      ],
    },
    2: {
      durationLabel: '20 分鐘',
      summary: '本週的核心是維持 6～6.5 分，不要一刺激就衝到 7～8。',
      notes: [
        '第 1 回先到 6 分維持 1 分鐘。',
        '第 2 回維持 6～6.5 分 1～2 分鐘，第 3 回接近 7 分就降回 5 分。',
      ],
      phases: [
        makePhase('準備期', 120, '做啟動版呼吸與放鬆掃描。'),
        makePhase('第 1 回：6 分維持 1 分鐘', 240, '先熟悉高原感。'),
        makePhase('第 2 回：6～6.5 分維持', 300, '感受可控高興奮，不急著衝線。'),
        makePhase('第 3 回：接近 7 分停再回 6 分', 300, '練習停下與重新回到高原。'),
        makePhase('收尾放鬆', 180, '若身體放鬆，可正常結束。'),
      ],
    },
    3: {
      durationLabel: '20～25 分鐘',
      summary: '本週開始第一次乾式波峰嘗試：7 分停下，讓波峰自然滑過。',
      notes: [
        '重點不是一定要有波峰，而是停止後不要衝到 8～9。',
        '停止時只做吐氣與骨盆底下沉，不加刺激、不硬夾。',
      ],
      phases: [
        makePhase('準備期', 120, '呼吸、放鬆並確認今天不追求硬成功。'),
        makePhase('第 1 回：6 分暖身', 180, '先用可控高原暖身。'),
        makePhase('第 2 回：6.5 分維持', 300, '把高原拉長到 1～2 分鐘。'),
        makePhase('第 3 回：7 分放鬆觀察', 240, '剛出現射精感就停，觀察 30～60 秒。'),
        makePhase('收尾放鬆', 180, '可正常結束並做恢復放鬆。'),
      ],
    },
    4: {
      durationLabel: '20～25 分鐘',
      summary: '本週嘗試兩次 7 分放鬆，把高潮感與射精反射慢慢拉開。',
      notes: [
        '就算沒有明顯波峰，只要高原控制穩定也算進步。',
        '訓練後若會陰悶痛，下一次要減量。',
      ],
      phases: [
        makePhase('準備期', 120, '呼吸、放鬆與啟動版 Kegel。'),
        makePhase('第 1 回：6 分暖身', 180, '先把身體帶回穩定節奏。'),
        makePhase('第 2 回：第一次 7 分放鬆', 240, '接近 7 分後停下，觀察 30～60 秒。'),
        makePhase('第 3 回：第二次 7 分放鬆', 240, '再做一次同樣流程。'),
        makePhase('收尾放鬆', 180, '視狀態正常結束或降到 3～4 分離場。'),
      ],
    },
    5: {
      durationLabel: '20～25 分鐘',
      summary: '本週練習縮短下降幅度：退到 5 分即可，再重新接近波峰。',
      notes: [
        '如果退到 5 分後一碰就衝 8，表示還是要先降到 4。',
        '今天重點是高原附近的再接近，不是把次數堆滿。',
      ],
      phases: [
        makePhase('準備期', 120, '呼吸與放鬆，提醒自己 7 分就停。'),
        makePhase('第 1 回：到 6.5～7 分停', 240, '剛有射精感就停。'),
        makePhase('退到 5 分穩定', 180, '讓射精感退掉，但不要完全冷卻。'),
        makePhase('第 2 回：再回 6.5～7 分', 240, '練習在高興奮附近重新接近。'),
        makePhase('收尾放鬆', 180, '最後做恢復，不追加高強度衝刺。'),
      ],
    },
    6: {
      durationLabel: '20～25 分鐘',
      summary: '本週進入乾式高潮專項回合，追求更穩的 6～6.5 分與 7 分放鬆。',
      notes: [
        '成功標準不是一定乾式高潮，而是 7 分停下後不衝 8，且訓練後沒有不適。',
        '如果今天狀態不好，可以把第三次嘗試改成直接收尾。',
      ],
      phases: [
        makePhase('呼吸與放鬆', 120, '先把腹部、臀部與骨盆底放鬆。'),
        makePhase('暖身到 5～6 分', 240, '穩定上升，不急著衝線。'),
        makePhase('維持 6～6.5 分', 240, '停在高原區，不追加刺激。'),
        makePhase('第一次 7 分放鬆嘗試', 120, '接近 7 分就停，吐氣下沉。'),
        makePhase('退到 5 分穩定', 180, '讓身體回到可控高興奮。'),
        makePhase('第二次 7 分放鬆嘗試', 120, '再做一次自然過波峰。'),
        makePhase('第三次嘗試或收尾', 180, '視狀態決定是否再做一次。'),
        makePhase('放鬆／正常結束', 180, '收尾後只做放鬆，不再做強化 Kegel。'),
      ],
    },
  };

  return configs[weekNumber];
}

function makePhase(label, seconds, cue) {
  return {
    label,
    seconds: normalizePositiveSeconds(seconds),
    cue,
  };
}

function addDays(dateString, days) {
  const date = parseDateOnly(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnlyString(date);
}

function diffDays(startDate, targetDate) {
  return Math.floor((parseDateOnly(targetDate) - parseDateOnly(startDate)) / MS_PER_DAY);
}

function parseDateOnly(value) {
  return new Date(`${value}T00:00:00Z`);
}

function toDateOnlyString(date) {
  return date.toISOString().slice(0, 10);
}

function normalizePositiveSeconds(value) {
  return Math.max(1, Math.floor(Number(value) || 0));
}

function normalizePositiveInteger(value) {
  return Math.max(1, Math.floor(Number(value) || 0));
}

function formatNarrationDuration(totalSeconds) {
  const seconds = normalizePositiveSeconds(totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;

  if (minutes > 0 && remain > 0) {
    return `${minutes} 分 ${remain} 秒`;
  }

  if (minutes > 0) {
    return `${minutes} 分鐘`;
  }

  return `${remain} 秒`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
