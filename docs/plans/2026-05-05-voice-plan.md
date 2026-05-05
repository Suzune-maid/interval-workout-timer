# 2026-05-05 W2D2 Voice Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 建立 `2026-05-05`（W2D2 正式訓練日）的 library 語音素材，讓今天載入時有完整 phase narration 與倒數中 guidance。

**Architecture:** 不使用 `audio/today/`。所有素材與 manifest 都放在 `audio/library/2026-05-05/`。今天和既有 library 沒有 exact reuse，因此採「新生 phase narration + 新生 W2D2 專用 guidance」策略；可選擇性沿用少量既有正式日的氛圍類短句，但本計畫預設全新生，以確保文案貼合 W2D2 的 6～6.5 分高原訓練。

**Tech Stack:** Vanilla JS static app, Node test runner, `gemini-tts-cli` OpenRouter TTS (`google/gemini-3.1-flash-tts-preview`, voice `Leda`), WAV validation via size/duration/hash.

---

## Implementation status — 2026-05-05 15:26 CST

Completed in repo:

- Created `audio/library/2026-05-05/texts/` with 34 final text files.
- Generated and validated 34 playable WAV files: 5 phase narration clips + 29 countdown guidance clips.
- Created `audio/library/2026-05-05/manifest.json` using `timeline-events-v1`.
- Updated `audio/library/index.json` with `2026-05-05` W2D2 coverage.
- Added regression tests for W2D2 manifest/index and app-flow loading.
- Verification: `npm test` → 69/69 pass; `git diff --check` pass; local browser smoke confirms `phase-01.wav` → `countdown-start.wav` → `phase-01-guidance-01.wav`.

Generation notes:

- Most files were generated with `gemini-tts-cli` / OpenRouter / `google/gemini-3.1-flash-tts-preview` / voice `Leda`.
- For stability, some successful clips used shortened `ttsActualStyle` values while retaining the canonical `ttsStyle` in manifest.
- User review found `phase-01-guidance-02` was truncated and `phase-01-guidance-04` failed; both were regenerated with Gemini / Leda and replaced.
- One controlled fallback remains recorded in manifest:
  - `phase-03` / `finish-controlled`: duplicated from `phase-03-guidance-06.wav` after repeated empty-payload failures; text file was synchronized to match the reused audio.

## Current facts verified from live code

- Live date checked: `2026-05-05 14:17:16 CST`
- `PROGRAM_START_DATE`: `2026-04-27`
- Target date: `2026-05-05`
- Program day: W2D2
- Session title: `正式訓練日`
- Summary: `本週的核心是維持 6～6.5 分，不要一刺激就衝到 7～8。`
- Existing library index originally did **not** contain `2026-05-05`; implementation now adds it.
- Exact reuse against existing manifests: none.
- Existing formal day references:
  - `2026-04-28`: W1D2, shorter formal day, first guidance timings were later except phase 1.
  - `2026-05-01`: W1D5, hybrid formal day; added opening score guidance at 4s and reused older atmosphere clips.

## Target phases

1. `準備期` — 120s
   - Cue: `做啟動版呼吸與放鬆掃描。`
   - Generated phase text from live code:
     - `現在開始：準備期。這一段約 2 分鐘。做啟動版呼吸與放鬆掃描。`
2. `第 1 回：6 分維持 1 分鐘` — 240s
   - Cue: `先熟悉高原感。`
   - Generated phase text:
     - `現在開始：第 1 回：6 分維持 1 分鐘。這一段約 4 分鐘。先熟悉高原感。`
3. `第 2 回：6～6.5 分維持` — 300s
   - Cue: `感受可控高興奮，不急著衝線。`
   - Generated phase text:
     - `現在開始：第 2 回：6～6.5 分維持。這一段約 5 分鐘。感受可控高興奮，不急著衝線。`
4. `第 3 回：接近 7 分停再回 6 分` — 300s
   - Cue: `練習停下與重新回到高原。`
   - Generated phase text:
     - `現在開始：第 3 回：接近 7 分停再回 6 分。這一段約 5 分鐘。練習停下與重新回到高原。`
5. `收尾放鬆` — 180s
   - Cue: `若身體放鬆，可正常結束。`
   - Generated phase text:
     - `現在開始：收尾放鬆。這一段約 3 分鐘。若身體放鬆，可正常結束。`

## Audio profile and tone settings

Gemini TTS accepts richer `--style` direction than a short one-line voice note. Use the following profile as the canonical direction for W2D2. It is inspired by Gemini's example audio-profile format, but adapted away from radio hype and toward intimate, controlled training guidance.

# AUDIO PROFILE: Suzune W2D2
## "Controlled Plateau Companion"

## THE SCENE: The quiet training room
It is late evening in a small, dim, tidy room. The lights are soft blue-violet, not theatrical. Suzune is close enough to be heard clearly without projection, sitting beside the trainee rather than speaking from a stage. There is no crowd, no broadcast energy, no performance grin. The atmosphere is private, steady, and focused: a calm training cockpit for learning control at 6～6.5 points of arousal without being pulled into 7～8.

Suzune's role is not to push excitement higher. She is a reliable companion-guide who helps the body notice thresholds, soften urgency, and return to control. The voice should feel warm, near, and reassuring, but never frantic, never exaggerated, and never explicit.

### DIRECTOR'S NOTES

Style:
- **Close companion tone:** soft, warm, near-field Taiwanese Mandarin; feels like Suzune is beside the listener, not announcing to a room.
- **Controlled intimacy:** gentle and slightly breathy for guidance clips, but still clear and intelligible. Intimacy comes from closeness and pacing, not from explicit wording or overacting.
- **Calm authority:** when saying control words such as `停`、`慢`、`放鬆`、`退回 6 分`, the consonants should become a little firmer and the intonation should settle downward. The listener should feel safely guided, not scolded.
- **No hype:** do not use radio DJ energy, shouting, smiling projection, sales-pitch cadence, or comedic exaggeration. This is the opposite of "The Morning Hype" style.
- **Taiwan Mandarin:** use natural Taiwan Mandarin pronunciation and rhythm. Avoid Mainland Chinese broadcast accent, overly formal newsreader tone, or simplified-Chinese phrasing habits.

Dynamics:
- Phase narration: medium-low volume, clear and stable, like a calm coach starting a new interval.
- Guidance clips: slightly lower, closer, more private; keep enough clarity that short phrases remain understandable on phone speakers.
- Boundary reminders: subtly firmer and slower, especially near `7 分`, `停`, `放慢`, `放軟骨盆底`.
- Never shout. Never whisper so quietly that words disappear.

Pace:
- Phase narration: calm medium pace, with short clean pauses between sentences. Do not drag.
- Guidance clips: medium-slow, controlled, with micro-pauses around score targets and action verbs.
- Avoid long dead air inside a single clip; the app timeline already controls spacing between clips.
- Use punctuation intentionally: `：` introduces the target, `；` creates a controlled pivot, `。` ends cleanly.

Accent:
- Native Taiwan Mandarin.
- Soft, modern, companion-app style.
- No English accent, no radio host accent, no dramatic anime acting.

### SAMPLE CONTEXT

This profile is for W2D2 formal training in `interval-workout-timer`. The training goal is to find and maintain the 6～6.5 arousal plateau, then detect the approach to 7 early enough to stop, breathe down, soften the pelvic floor, and return to 6.

Use this profile for:
- phase start narration
- score-check guidance
- plateau-maintenance guidance
- boundary / stop / reset guidance
- cooldown guidance

Do not use it for:
- energetic ads
- ASMR whisper-only output
- erotic performance voice
- medical lecture voice
- bright assistant announcement voice

#### TRANSCRIPT SAMPLE — phase narration
[calm, clear, steady] 現在開始：第 2 回：6～6.5 分維持。這一段約 5 分鐘。感受可控高興奮，不急著衝線。

#### TRANSCRIPT SAMPLE — guidance
[near, soft, controlled] 這一回停在 6 到 6.5 分：清楚、有熱度，但還不到必須停的邊界。

[slightly firmer, grounding] 檢查一下，有沒有出現「再一下就好」的急迫感？有的話就先降一點。

[soft downward cadence] 吐氣時把分數往下帶半分，讓身體重新聽你的。

## Style strings for `gemini-tts-cli`

Use these exact style strings unless the reviewed plan changes them.

### Phase narration style

```text
AUDIO PROFILE: Suzune W2D2 — Controlled Plateau Companion. Scene: late evening, quiet private training room, soft blue-violet light, close companion beside the listener. Speak in natural Taiwan Mandarin with a calm, clear, stable medium-low voice, like a reliable training guide starting a new interval. No radio DJ energy, no shouting, no sales pitch, no dramatic anime acting. Pace is calm medium, with short clean pauses between sentences; do not drag. Tone is warm and reassuring, focused on control and safety.
```

### Guidance clip style

```text
AUDIO PROFILE: Suzune W2D2 — Controlled Plateau Companion. Scene: quiet private training room, close beside the listener. Speak in natural Taiwan Mandarin, low and near-field, warm, slightly breathy but always clear enough for phone speakers. Controlled intimacy, not explicit performance. Medium-slow pace with micro-pauses around score targets and action verbs. When saying control words like 停、慢、放鬆、退回 6 分, become subtly firmer with a downward, grounding cadence. Never shout, never overact, never become too quiet.
```

### Boundary / reset guidance style

Use this variant for clips in Phase 4 and any sentence centered on `接近 7 分`、`停`、`退回 6 分`:

```text
AUDIO PROFILE: Suzune W2D2 — Controlled Plateau Companion, boundary reset mode. Natural Taiwan Mandarin, close companion tone. Start soft and steady, then use calm authority on boundary words. The listener should feel safely stopped before 7, not pushed higher. Slightly slower than normal guidance, clear consonants on 停、放慢、放鬆、退回. Warm, grounded, non-judgmental. No hype, no whisper-only delivery, no erotic exaggeration.
```

### Cooldown style

Use this variant for Phase 5 clips:

```text
AUDIO PROFILE: Suzune W2D2 — Controlled Plateau Companion, cooldown mode. Natural Taiwan Mandarin, warm and soft, slower and more spacious than training guidance. The goal is to lower arousal below 4, release pelvic floor tension, and end cleanly. Gentle downward intonation, relaxed breathing feel, no stimulation, no teasing, no urgency. Keep words clear and audible.
```

## TTS style assignment

- `generated/phase-01.wav` ～ `generated/phase-05.wav`: use **Phase narration style**.
- Phase 1 guidance: use **Guidance clip style**.
- Phase 2 guidance: use **Guidance clip style**.
- Phase 3 guidance: use **Guidance clip style**.
- Phase 4 guidance: use **Boundary / reset guidance style**.
- Phase 5 guidance: use **Cooldown style**.

These full style strings should also be stored in each manifest entry / timeline clip as `ttsStyle`, so future regeneration knows the exact tone target.

## Recommended guidance design

Principle:
- 第 0 秒 guidance 已由 app 層延後約 300ms，但 formal day guidance 仍建議從 `startAtSecond = 4` 開始，避免和 start cue / countdown 起點黏在一起。
- Guidance 要短、明確、以分數判斷與回降操作為主。
- W2D2 的核心不是挑逗推高，而是「進入 6～6.5 分後維持，不讓刺激衝到 7～8」。
- 文案保留親近感，但比 W1D2 / W1D5 更偏控制與訓練。

### Phase 1 guidance — 準備期，120s

Summary: `啟動前掃描與 4 分以下暖機，共 4 句`

Events:
- 4s `score-under-four-check`
  - Text: `先確認現在還在 4 分以下：有感覺可以，但身體要能立刻放鬆下來。`
- 35s `breath-scan-soften`
  - Text: `吸氣時掃描骨盆底，吐氣時把多餘的緊繃放掉。`
- 70s `no-rushing-start`
  - Text: `今天不要急著衝高，先把可控感準備好。`
- 100s `ready-for-six`
  - Planned text: `等一下只到 6 分附近，感覺清楚，但仍然由你控制。`
  - Final text: `等一下只到 6 分附近，節奏清楚，但仍然由你控制。`
  - Note: Originally used Hermes edge fallback due empty payload; after user review, regenerated successfully with Gemini / Leda using a shorter complete-reading style.

### Phase 2 guidance — 第 1 回：6 分維持 1 分鐘，240s

Summary: `6 分定位與 1 分鐘高原維持，共 7 句`

Events:
- 4s `score-six-target`
  - Text: `這一回找 6 分：快感明顯、穩定，但你還能說慢就慢、說停就停。`
- 40s `build-gradually`
  - Text: `慢慢靠近，不要一下子把刺激推太滿。`
- 80s `hold-at-six`
  - Text: `如果已經接近 6 分，就先維持，不要再加速。`
- 115s `one-minute-plateau-start`
  - Text: `從現在開始練習高原維持，讓感覺留在 6 分附近。`
- 150s `soften-edges`
  - Text: `一有往 7 分衝的感覺，就先放慢呼吸、放軟骨盆底。`
- 190s `stay-with-control`
  - Text: `很好，重點是穩，不是更強。`
- 220s `prepare-reset`
  - Text: `準備收回一點，讓下一回還有空間。`

### Phase 3 guidance — 第 2 回：6～6.5 分維持，300s

Summary: `6～6.5 分高原維持與防暴衝，共 7 句`

Events:
- 4s `score-six-half-zone`
  - Text: `這一回停在 6 到 6.5 分：清楚、有熱度，但還不到必須停的邊界。`
- 55s `plateau-not-peak`
  - Text: `把它當成高原，不是波峰；維持住就好。`
- 95s `check-urgency`
  - Text: `檢查一下，有沒有出現「再一下就好」的急迫感？有的話就先降一點。`
- 135s `breathe-down-small`
  - Text: `吐氣時把分數往下帶半分，讓身體重新聽你的。`
- 180s `return-six-half`
  - Text: `可以再回到 6 分多一點，但不要越過邊界。`
- 225s `stable-not-hard`
  - Text: `保持穩定，不需要更用力；越急，越容易失控。`
- 270s `finish-controlled`
  - Planned text: `最後這段維持可控，讓自己知道高興奮也可以停住。`
  - Final text: `保持穩定，不需要更用力；越急，越容易失控。`
  - Note: Gemini and edge both returned empty audio for the original/further neutralized line; final WAV duplicates `phase-03-guidance-06.wav` and text was synchronized.

### Phase 4 guidance — 第 3 回：接近 7 分停再回 6 分，300s

Summary: `接近 7 分辨識、停止、回到 6 分，共 7 句`

Events:
- 4s `score-seven-boundary`
  - Text: `這一回練邊界：接近 7 分就停，不等到 8 分才補救。`
- 45s `approach-carefully`
  - Text: `慢慢靠近邊界，注意身體是不是開始想自己接手。`
- 90s `stop-on-urgency`
  - Text: `如果急迫感出現，現在就停，手停、呼吸放慢、骨盆底放鬆。`
- 135s `drop-to-six`
  - Text: `讓分數退回 6 分附近，確認你還能控制節奏。`
- 180s `restart-gently`
  - Text: `可以重新開始，但只用小一點的刺激回到高原。`
- 225s `do-not-chase`
  - Text: `不要追那個快要爆開的感覺；今天練的是停得住。`
- 270s `last-boundary-check`
  - Text: `最後一次檢查：接近 7 分就收回來，留在可控區。`

### Phase 5 guidance — 收尾放鬆，180s

Summary: `回降到 4 分以下與收尾放鬆，共 4 句`

Events:
- 4s `settle-below-four`
  - Text: `現在不是往上走，是往下退；讓分數慢慢回到 4 分以下。`
- 45s `release-pelvic-floor`
  - Text: `吐氣，把骨盆底完全放掉，不要再偷偷用力。`
- 90s `body-safe-finish`
  - Text: `如果身體還有殘留興奮，只要呼吸，不需要再刺激。`
- 135s `finish-cleanly`
  - Text: `很好，今天到這裡就可以收尾，讓身體乾淨地結束。`

## TTS workload estimate

Default full-quality plan:
- Phase narration: 5 WAV files
- Guidance clips: 29 WAV files
  - phase 1: 4
  - phase 2: 7
  - phase 3: 7
  - phase 4: 7
  - phase 5: 4
- Total new WAV files: 34

Lower-cost fallback option:
- New phase narration: 5
- New opening score guidance only: 5
- Reuse existing W1D5 atmosphere clips where timing still fits
- Total new WAV files: 10

Recommendation for today:
- Use full-quality plan if API quota/time is acceptable.
- Use lower-cost fallback only if TTS starts failing or generation takes too long.

## File layout

Create:
- `audio/library/2026-05-05/texts/phase-01.txt` ～ `phase-05.txt`
- `audio/library/2026-05-05/texts/phase-01-guidance-01.txt` etc.
- `audio/library/2026-05-05/generated/phase-01.wav` ～ `phase-05.wav`
- `audio/library/2026-05-05/guidance/*.wav`
- `audio/library/2026-05-05/manifest.json`

Modify:
- `audio/library/index.json`
- `tests/narration-manifest.test.js`
- `tests/app-flow.test.js` if adding a today-loading assertion for `2026-05-05`
- `README.md`
- `docs/plans/project-status-handoff.md`
- `docs/plans/2026-05-05-project-status-handoff.md`

## Implementation tasks

### Task 1: Add failing manifest tests

**Objective:** Lock expected W2D2 manifest metadata, phase labels, event timing, and index entry before generating files.

**Files:**
- Modify: `tests/narration-manifest.test.js`

**Test assertions:**
- `audio/library/2026-05-05/manifest.json` exists.
- `sourceDate === '2026-05-05'`
- `weekNumber === 2`
- `dayNumber === 2`
- `weekdayLabel === '二'`
- `sessionTitle === '正式訓練日'`
- entries length is 5.
- phase labels / durations match live code.
- first guidance event for every phase starts at `4` seconds.
- expected event second arrays:
  - phase 1: `[4, 35, 70, 100]`
  - phase 2: `[4, 40, 80, 115, 150, 190, 220]`
  - phase 3: `[4, 55, 95, 135, 180, 225, 270]`
  - phase 4: `[4, 45, 90, 135, 180, 225, 270]`
  - phase 5: `[4, 45, 90, 135]`
- `audio/library/index.json` contains a `2026-05-05` item.

**Run:**

```bash
node --test tests/narration-manifest.test.js --test-name-pattern='2026-05-05'
```

Expected: FAIL because files do not exist yet.

### Task 2: Write text scripts

**Objective:** Save phase narration and guidance text files before generating audio.

**Files:**
- Create under `audio/library/2026-05-05/texts/`

**Verification:**

```bash
python3 - <<'PY'
from pathlib import Path
root = Path('audio/library/2026-05-05/texts')
files = sorted(root.glob('*.txt'))
print(len(files))
assert len(files) == 34
assert all(p.read_text(encoding='utf-8').strip() for p in files)
PY
```

### Task 3: Generate WAV files with gemini-tts-cli

**Objective:** Generate all 34 WAV files with fixed `Leda` voice.

**Command shape:**

```bash
cd /home/atmjin/.hermes/archive/github/gemini-tts-cli
uv run gemini-tts \
  --text-file /home/atmjin/.hermes/archive/github/interval-workout-timer/audio/library/2026-05-05/texts/phase-01.txt \
  --api-key-file .env \
  --style "AUDIO PROFILE: Suzune W2D2 — Controlled Plateau Companion. Scene: late evening, quiet private training room, soft blue-violet light, close companion beside the listener. Speak in natural Taiwan Mandarin with a calm, clear, stable medium-low voice, like a reliable training guide starting a new interval. No radio DJ energy, no shouting, no sales pitch, no dramatic anime acting. Pace is calm medium, with short clean pauses between sentences; do not drag. Tone is warm and reassuring, focused on control and safety." \
  --retry 2 \
  --retry-on-invalid-audio \
  --output /home/atmjin/.hermes/archive/github/interval-workout-timer/audio/library/2026-05-05/generated/phase-01.wav
```

Guidance style:

Use the full **Guidance clip style** / **Boundary reset style** / **Cooldown style** from the `Audio profile and tone settings` section above, not the old one-line style.

For batch JSONL, include the chosen full style string per item if the CLI input format supports per-item style; otherwise batch by style group:
- batch 1: 5 phase narration files
- batch 2: phase 1～3 guidance files
- batch 3: phase 4 boundary / reset guidance files
- batch 4: phase 5 cooldown files

If generation is slow, use batch JSONL from `gemini-tts-cli` rather than 34 one-off invocations.

### Task 4: Validate generated WAV files

**Objective:** Reject header-only / empty WAV files before writing manifest metadata.

**Checks:**
- size > 44 bytes
- duration > 0
- sha256 recorded

**Run:**

```bash
python3 - <<'PY'
from pathlib import Path
import wave, hashlib
root = Path('audio/library/2026-05-05')
for path in sorted(root.glob('**/*.wav')):
    size = path.stat().st_size
    with wave.open(str(path), 'rb') as wf:
        frames = wf.getnframes()
        duration = frames / wf.getframerate()
    assert size > 44, path
    assert duration > 0, path
    print(path, size, round(duration, 2), hashlib.sha256(path.read_bytes()).hexdigest())
PY
```

### Task 5: Build manifest and index entry

**Objective:** Create `audio/library/2026-05-05/manifest.json` and add a library index item.

**Manifest rules:**
- `schemaVersion: timeline-events-v1`
- `sourceDate: 2026-05-05`
- `programStartDate: 2026-04-27`
- `weekNumber: 2`
- `dayNumber: 2`
- `weekdayLabel: 二`
- `sessionTitle: 正式訓練日`
- entries match live code phase labels / durations / start offsets.
- all new files point to `audio/library/2026-05-05/...`.

**Index item:**

```json
{
  "libraryKey": "2026-05-05",
  "sourceDate": "2026-05-05",
  "weekNumber": 2,
  "dayNumber": 2,
  "sessionTitle": "正式訓練日",
  "manifestFile": "audio/library/2026-05-05/manifest.json",
  "entryCount": 5,
  "schemaVersion": "timeline-events-v1",
  "timelineSchemaFile": "audio/schema/timeline-event.schema.json"
}
```

### Task 6: Add app-flow today-loading assertion

**Objective:** Ensure fake today `2026-05-05` loads the new W2D2 library manifest.

**Files:**
- Modify: `tests/app-flow.test.js`

**Suggested assertion:**
- fake date: `2026-05-05T08:00:00Z`
- libraryDays: `[8]`
- title: `正式訓練日`
- phase label: `準備期`
- fetch includes `./audio/library/2026-05-05/manifest.json`
- guidance live summary reflects phase 1 W2D2 guidance.

### Task 7: Run full tests

```bash
node --test tests/narration-manifest.test.js
node --test tests/app-flow.test.js
npm test
git diff --check
```

Expected:
- all tests pass
- baseline increases if new tests are added.

### Task 8: Browser smoke test

**Objective:** Verify actual page orchestration.

1. Start server:

```bash
python3 -m http.server 8136
```

2. Open:

```text
http://127.0.0.1:8136/?debug=2026-05-05-voice&t=1
```

3. Instrument `HTMLMediaElement.prototype.play` and choose / load 2026-05-05.
4. Expected sequence:
   - `audio/library/2026-05-05/generated/phase-01.wav`
   - `audio/fx/countdown-start.wav`
   - after cue + short delay / at first guidance timing: `audio/library/2026-05-05/guidance/phase-01-guidance-01.wav`

### Task 9: Update docs / handoff

Update:
- `README.md` test baseline and coverage
- `docs/plans/project-status-handoff.md`
- `docs/plans/2026-05-05-project-status-handoff.md`

Mention:
- library coverage now includes `2026-05-05` W2D2
- W2D2 has full formal-day guidance plan / generated assets
- `npm test` result

### Task 10: Commit strategy

Current branch is ahead 2. Because this work is a new content batch, prefer a new commit:

```bash
git add audio/library/2026-05-05 audio/library/index.json tests/narration-manifest.test.js tests/app-flow.test.js README.md docs/plans/project-status-handoff.md docs/plans/2026-05-05-project-status-handoff.md docs/plans/2026-05-05-voice-plan.md
git commit -m "feat: add 2026-05-05 formal day narration"
```

Do not push unless explicitly approved.

## Acceptance criteria

- `audio/library/index.json` contains `2026-05-05`.
- `audio/library/2026-05-05/manifest.json` exists and validates via tests.
- All 34 WAV files exist, size > 44 bytes, duration > 0.
- `npm test` passes.
- Browser smoke test confirms phase narration → start cue → W2D2 guidance.
- No `audio/today/` usage is introduced.
- No secrets or API keys are copied into interval-workout-timer.
