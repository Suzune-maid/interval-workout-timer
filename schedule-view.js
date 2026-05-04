function groupByWeek(entries) {
  const groups = [];

  entries.forEach((entry) => {
    const index = entry.weekNumber - 1;
    groups[index] ??= [];
    groups[index].push(entry);
  });

  return groups;
}

function buildWeekTabs({ refs, weeks, visibleWeekNumber, onSelectWeek }) {
  if (!refs.scheduleWeekTabs) {
    return;
  }

  refs.scheduleWeekTabs.innerHTML = '';

  weeks.forEach((weekEntries, index) => {
    const weekNumber = index + 1;
    const weekButton = document.createElement('button');
    weekButton.type = 'button';
    weekButton.className = 'week-tab';
    weekButton.dataset.weekNumber = String(weekNumber);
    weekButton.setAttribute('aria-pressed', String(weekNumber === visibleWeekNumber));

    if (weekNumber === visibleWeekNumber) {
      weekButton.classList.add('active');
    }

    weekButton.innerHTML = `
      <span class="week-tab-label">第 ${weekNumber} 週</span>
      <span class="week-tab-focus">${weekEntries[0]?.session?.weekFocus ?? ''}</span>
    `;

    weekButton.addEventListener('click', () => {
      onSelectWeek?.(weekNumber);
    });

    refs.scheduleWeekTabs.appendChild(weekButton);
  });
}

export function renderStaticContent({ refs, entry, todayInfo, todayEntry, formatDisplayDate }) {
  refs.todayDateElement.textContent = formatDisplayDate(entry.date);
  refs.todayWeekdayElement.textContent = `第 ${entry.weekNumber} 週・第 ${entry.dayNumber} 天（週${entry.weekdayLabel}）`;
  refs.todayFocusElement.textContent = entry.session.weekFocus;
  refs.todaySummaryElement.textContent = entry.session.summary;
  refs.todayTitleElement.textContent = entry.session.title;
  refs.todayDurationElement.textContent = `建議時間：${entry.session.durationLabel}`;

  refs.todayNotesElement.innerHTML = '';
  entry.session.notes.forEach((note) => {
    const item = document.createElement('li');
    item.textContent = note;
    refs.todayNotesElement.appendChild(item);
  });

  if (todayInfo?.isAfterProgram && entry.dayOffset === todayEntry?.dayOffset) {
    refs.statusMessage.textContent = '6 週主計畫已走完，目前先停在最後一天內容，若要再跑一輪可之後改起始日。';
  }
}

export function renderSchedule({ refs, calendar, todayInfo, daySelection, formatDisplayDate, onSelectDay, onSelectWeek }) {
  refs.scheduleGrid.innerHTML = '';

  const weeks = groupByWeek(calendar);
  const visibleWeekNumber = daySelection?.visibleWeekNumber ?? daySelection?.entry?.weekNumber ?? 1;
  const visibleWeekEntries = weeks[visibleWeekNumber - 1] ?? [];

  buildWeekTabs({
    refs,
    weeks,
    visibleWeekNumber,
    onSelectWeek,
  });

  const weekCard = document.createElement('section');
  weekCard.className = 'week-card';

  const heading = document.createElement('div');
  heading.className = 'week-heading';
  heading.innerHTML = `
    <h3>第 ${visibleWeekNumber} 週</h3>
    <p>${visibleWeekEntries[0]?.session?.weekFocus ?? ''}</p>
  `;
  weekCard.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'week-list';

  visibleWeekEntries.forEach((entry) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'day-card day-card-button';
    item.dataset.dayOffset = String(entry.dayOffset);
    item.setAttribute('aria-pressed', String(entry.dayOffset === daySelection.selectedDayOffset));

    if (entry.dayOffset < (todayInfo?.dayOffset ?? 0)) {
      item.classList.add('past');
    }

    if (entry.dayOffset === todayInfo?.dayOffset) {
      item.classList.add('current');
    }

    if (entry.dayOffset === daySelection.selectedDayOffset) {
      item.classList.add('selected');
    }

    item.innerHTML = `
      <p class="day-top">第 ${entry.dayNumber} 天・週${entry.weekdayLabel}</p>
      <h4>${entry.session.title}</h4>
      <p class="day-date">${formatDisplayDate(entry.date)}</p>
      <p class="day-summary">${entry.session.summary}</p>
      <p class="day-duration">${entry.session.durationLabel}</p>
    `;

    item.addEventListener('click', () => {
      onSelectDay?.(entry.dayOffset);
    });

    list.appendChild(item);
  });

  weekCard.appendChild(list);
  refs.scheduleGrid.appendChild(weekCard);
}
