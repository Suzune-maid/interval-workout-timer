# Audio Content Verification Tooling Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a local-first toolchain that verifies generated training audio is not only technically valid, but also speaks the intended transcript without truncation, omission, obvious misreadings, silence, or clipping.

**Architecture:** Add a Node-based manifest/audio validator for deterministic checks, then optionally add an ASR-backed transcript comparison layer for actual spoken-content verification. Keep human review fast with a generated QA report/dashboard, because TTS content correctness cannot be fully proven by hashes alone.

**Tech Stack:** Node built-in test runner, Node scripts, WAV parsing via small dependency or minimal WAV reader, optional local ASR via Whisper/faster-whisper/whisper.cpp, static HTML report for manual review.

---

## Why this is needed

Current validation proves that files exist and are playable-sized WAVs. It does not prove:

- the clip actually says the intended line
- the ending was not truncated
- words were not omitted or replaced
- a fallback/duplicate clip was intentional
- the audio is not mostly silence
- the volume is usable on phone speakers
- cadence clips fit their timing windows

For this project, the practical goal is a **tiered QA pipeline**: cheap checks always run in tests; deeper ASR/human review runs after new audio generation.

---

## Proposed verification levels

### Level 0 — Manifest / file integrity, always in `npm test`

This is deterministic and cheap.

Checks:

- every `audioFile` in manifest exists
- every referenced `.txt` transcript exists if the manifest points to a text source
- manifest sha256 matches the actual file
- WAV header is valid
- `durationSeconds > 0`
- actual WAV duration approximately matches manifest `audioDurationSeconds`
- no untracked `tts-*` artifacts are needed for app runtime

Recommended tolerance:

- duration metadata mismatch: warn at `> 0.15s`, fail at `> 0.5s`
- zero frame / 44-byte header-only WAV: fail

### Level 1 — Signal health, always in audio QA script

This confirms the audio is a real, usable signal.

Checks:

- not mostly silence
- no excessive leading silence
- no excessive trailing silence
- no severe clipping
- RMS / peak level is inside expected range
- clip duration fits timing slot when the manifest has a precise cue window

Suggested thresholds:

- leading silence warning: `> 500ms`
- trailing silence warning: `> 700ms`
- mostly silence failure: voiced/signal ratio below `20%`
- clipping warning: `> 0.1%` samples near full scale
- timing overrun failure for cadence cues: actual duration exceeds available window by `> 150ms`

### Level 2 — ASR transcript comparison, run after TTS generation

This is the first layer that checks actual spoken content.

Pipeline:

1. Read expected text from `audio/library/YYYY-MM-DD/texts/*.txt` or manifest `text` fields.
2. Transcribe each WAV with local ASR.
3. Normalize both expected and ASR text:
   - Traditional/Simplified normalization if needed
   - remove punctuation and whitespace
   - normalize digits: `4` ↔ `四`
   - normalize common variants: `秒鐘` ↔ `秒`, `吸一口氣` ↔ `吸氣`
4. Compare with fuzzy similarity and keyword coverage.
5. Specifically compare the **tail phrase** to catch truncation.
6. Write JSON + Markdown reports.

Suggested status model:

- `pass`: similarity high and tail phrase present
- `review`: similarity medium, ASR uncertain, or minor wording difference
- `fail`: very low similarity, missing key phrase, missing tail phrase, or empty ASR
- `intentional-fallback`: manifest explicitly marks fallback/duplicate and reason is present

Suggested thresholds:

- full normalized similarity pass: `>= 0.82`
- keyword coverage pass: `>= 0.85`
- tail phrase required: last 4-8 meaningful characters must appear or be semantically close
- short cue exception: single-word or ultra-short cue can use keyword-only rules

Important limitation:

ASR is not ground truth. It can mishear quiet/soft Suzune-style TTS. Treat ASR as a triage filter, not as an automatic final judge.

### Level 3 — Human review dashboard, run before commit/push of new audio day

Generate a local static report like:

`audio/library/YYYY-MM-DD/review/index.html` or `reports/audio-review/YYYY-MM-DD.html`

For each clip show:

- phase / clip id
- expected text
- ASR transcript
- similarity score
- waveform summary / silence markers
- audio player
- manifest duration vs actual duration
- status badge: pass / review / fail / fallback
- notes field or generated Markdown checklist

Keyboard-friendly review:

- `Space`: play/pause current clip
- `J/K`: next/previous clip
- `1`: mark pass
- `2`: mark needs regeneration
- `3`: mark intentional fallback

For repo simplicity, the first version can be report-only without persistent UI writes; reviewer decisions can be kept in a Markdown checklist.

### Level 4 — Regeneration decision helper

For failed/review clips, generate a retry plan:

- transcript mismatch → regenerate with complete-sentence style
- tail missing → regenerate with explicit no-truncation style
- too long for cue window → shorten text and regenerate
- silence/empty → retry with short/minimal style
- repeated empty payload → fallback TTS or duplicate nearby compatible clip, but mark in manifest

---

## Proposed CLI commands

### Deterministic local QA

```bash
node scripts/verify-audio-library.mjs --date 2026-05-05
```

Outputs:

- exit `0` if deterministic checks pass
- exit non-zero if missing/hash/header/duration/signal hard failures occur
- writes `audio/library/2026-05-05/audio-qa.json` only if requested with `--write-report`

### ASR content QA

```bash
node scripts/verify-audio-content.mjs --date 2026-05-05 --asr faster-whisper --write-report
```

Outputs:

- `reports/audio-content/2026-05-05.json`
- `reports/audio-content/2026-05-05.md`
- optional HTML dashboard

### CI-friendly mode

```bash
node scripts/verify-audio-library.mjs --all --strict
```

CI mode should avoid ASR by default because ASR dependencies are heavy and may be nondeterministic.

---

## File layout

Create:

- `scripts/verify-audio-library.mjs`
  - manifest/file/hash/WAV/signal checks
- `scripts/verify-audio-content.mjs`
  - ASR transcript comparison wrapper
- `scripts/lib/wav-info.mjs`
  - minimal WAV parser: sample rate, channels, bits, frame count, duration, peak/RMS/silence stats
- `scripts/lib/text-normalize.mjs`
  - Chinese/Taiwan Mandarin transcript normalization and fuzzy scoring helpers
- `tests/audio-library-validation.test.js`
  - deterministic tests against fixtures and current library manifests
- `docs/plans/2026-05-05-audio-content-verification-plan.md`
  - this plan

Optional later:

- `reports/audio-content/` ignored by git
- `audio/library/*/review/` ignored by git unless we decide reports are public artifacts

---

## TDD implementation tasks

### Task 1: Add deterministic WAV metadata reader

**Objective:** Read WAV duration and basic signal stats without external services.

**Files:**

- Create: `scripts/lib/wav-info.mjs`
- Test: `tests/audio-library-validation.test.js`

**Test first:**

- valid WAV fixture returns `durationSeconds > 0`
- 44-byte header-only WAV fails with `frameCount === 0`
- file with no RIFF/WAVE header throws a clear error

**Verification:**

```bash
node --test tests/audio-library-validation.test.js
```

### Task 2: Add manifest reference collector

**Objective:** Enumerate every narration and guidance clip referenced by a library manifest.

**Files:**

- Modify/Create: `scripts/verify-audio-library.mjs`
- Test: `tests/audio-library-validation.test.js`

**Checks:**

- phase narration clips
- timeline/guidance clips
- fallback clips
- transcript files if source path exists

### Task 3: Validate sha256 and duration metadata

**Objective:** Fail when manifest metadata does not match the real file.

**Files:**

- Modify: `scripts/verify-audio-library.mjs`
- Test: `tests/audio-library-validation.test.js`

**Rules:**

- missing file: fail
- sha256 mismatch: fail
- duration mismatch > 0.5s: fail
- duration mismatch > 0.15s: warning

### Task 4: Add signal-health checks

**Objective:** Detect silent, clipped, or suspicious clips.

**Files:**

- Modify: `scripts/lib/wav-info.mjs`
- Modify: `scripts/verify-audio-library.mjs`
- Test: `tests/audio-library-validation.test.js`

**Rules:**

- frame count zero: fail
- mostly silence: fail
- clipping above threshold: warn/fail depending severity
- leading/trailing silence: warn

### Task 5: Add transcript normalization helpers

**Objective:** Normalize expected text and ASR text before comparison.

**Files:**

- Create: `scripts/lib/text-normalize.mjs`
- Test: `tests/audio-content-normalize.test.js`

**Cases:**

- punctuation removed
- Arabic digits and Chinese numerals normalized for common small numbers
- whitespace ignored
- common Mandarin variants tolerated

### Task 6: Add ASR adapter interface

**Objective:** Keep ASR optional and swappable.

**Files:**

- Create: `scripts/lib/asr-adapter.mjs`
- Create: `scripts/verify-audio-content.mjs`
- Test: `tests/audio-content-validation.test.js`

**Initial adapters:**

- `--asr none`: reads precomputed transcript JSON for tests
- later: `--asr faster-whisper` or `--asr whisper-cpp`

### Task 7: Add content comparison report

**Objective:** Produce actionable JSON/Markdown showing which clips need review.

**Files:**

- Modify: `scripts/verify-audio-content.mjs`
- Test: `tests/audio-content-validation.test.js`

**Report fields:**

- `id`
- `audioFile`
- `expectedText`
- `asrText`
- `similarity`
- `keywordCoverage`
- `tailPhrasePresent`
- `status`
- `reason`

### Task 8: Add local human review dashboard

**Objective:** Make owner review faster than opening files one by one.

**Files:**

- Create: `scripts/render-audio-review.mjs`
- Create: `scripts/templates/audio-review.html`

**First version:**

- static HTML with audio players and statuses
- no write-back required

### Task 9: Integrate into project workflow docs

**Objective:** Document when to run each level.

**Files:**

- Modify: `README.md`
- Modify: `docs/plans/project-status-handoff.md`

**Recommended workflow:**

1. Generate audio.
2. Run deterministic audio library QA.
3. Run ASR content QA.
4. Review only `review/fail` clips manually.
5. Regenerate bad clips.
6. Run `npm test`.
7. Commit production assets only.

---

## Recommended first version scope

Implement first:

1. `verify-audio-library.mjs`
2. WAV duration/hash/silence/clipping checks
3. JSON/Markdown report
4. `.gitignore` for generated reports

Defer:

- full ASR installation
- HTML dashboard
- keyboard-driven review UI

Reason: deterministic QA catches the most dangerous technical failures immediately, while ASR dependency choice needs one small spike first.

---

## ASR dependency options

### Option A: faster-whisper via Python/uv

Pros:

- good quality
- local
- can batch files

Cons:

- heavier dependency
- model download required
- GPU/CPU performance varies

### Option B: whisper.cpp CLI

Pros:

- predictable CLI
- local and scriptable
- good for WSL if binary/model is available

Cons:

- setup required
- model file management

### Option C: cloud ASR

Pros:

- likely high accuracy

Cons:

- privacy/API cost
- network dependency
- less ideal for personal/private audio workflow

Recommendation: start with **ASR adapter abstraction**, then spike Option A vs Option B using 5-10 known clips.

---

## Acceptance criteria

The first complete version is done when:

- `node scripts/verify-audio-library.mjs --date 2026-05-05` validates all W2D2 production clips
- script fails on a deliberately corrupted/header-only WAV fixture
- script detects a manifest sha256 mismatch fixture
- script reports duration mismatch clearly
- `npm test` passes
- generated debug/review reports are not accidentally committed unless explicitly intended

The ASR version is done when:

- at least one known-good clip passes transcript comparison
- one truncated/mismatched fixture is flagged as `fail`
- one short cue can pass using keyword-only rules
- report lets the owner review only suspicious clips instead of all clips
