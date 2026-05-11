# W3 全週語音製作計畫（2026-05-11～2026-05-17）

> **For Hermes:** Use `interval-workout-timer-daily-narration-refresh` + `test-driven-development` + `requesting-code-review` when executing. Do not call OpenRouter TTS until the user explicitly approves the selected option.

**Goal:** 為第三週 W3D1～W3D7 建立完整 `audio/library` coverage，讓 `2026-05-11`～`2026-05-17` 都不再 fallback。

**Architecture:** 先用 live code 判斷每一天課表，再用「base day + reuse / variation」降低 TTS 成本。W3 的 kegel/formal 設定與 W1/W2 不同，不能做整日 exact reuse；但可大量複用既有 generic guidance clips，並只新增必要 phase narration 與少量高影響 variation。Relax/rest day 可走低成本 reuse。

**Tech Stack:** Vanilla JS static app、Node `node:test`、`audio/library/*.json` manifests、OpenRouter `google/gemini-3.1-flash-tts-preview` / Leda via `uv run gemini-tts`、Groq Whisper ASR verifier。

---

## 0. Live code 驗證結果

執行時間：`2026-05-07 23:36:31 CST (+0800)`

`PROGRAM_START_DATE = 2026-04-27`

目前 library coverage：

- W1D1～W1D7：`2026-04-27`～`2026-05-03`
- W2D1～W2D7：`2026-05-04`～`2026-05-10`
- W3D1：`2026-05-11` 已建立 library entry（全新 W3 kegel base，18 個 WAV；deterministic QA + Groq ASR PASS）
- W3D2～W3D7：尚未建立 library entries

Live code sweep：

| Date | WxDy | Title | Library | Exact reuse |
|---|---:|---|---|---|
| `2026-05-11` | W3D1 | 凱格爾普通日 | done | new W3 kegel base |
| `2026-05-12` | W3D2 | 正式訓練日 | missing | none |
| `2026-05-13` | W3D3 | 放鬆日 | missing | `2026-04-29` |
| `2026-05-14` | W3D4 | 凱格爾普通日 | missing | none |
| `2026-05-15` | W3D5 | 正式訓練日 | missing | none |
| `2026-05-16` | W3D6 | 凱格爾普通日（可依狀態改放鬆） | missing | none |
| `2026-05-17` | W3D7 | 休息／輕放鬆日 | missing | `2026-05-03`, `2026-05-10` |

Important interpretation：

- W3D1 / W3D4 / W3D6 沒有 exact reuse，是因為 week 3 kegel config 變了：
  - slow hold/rest：`5 秒收 / 8 秒放`
  - slow count：`10`
  - quick count：`12`
  - reverse：`150 秒`
- W3D2 / W3D5 沒有 exact reuse，是因為 formal week 3 是「第一次乾式波峰嘗試」：
  - 6 分暖身
  - 6.5 分維持
  - 7 分放鬆觀察
- W3D3 放鬆日結構仍與 W1D3 exact match。
- W3D7 休息日可複用 W1D7；若想保留最新 variation，可優先複用 W2D7 (`2026-05-10`) 的 inhale/exhale clips。

---

## 1. 推薦決策：低成本 hybrid + 一週 variation pack

### 建議採用 B：Hybrid coverage

這是推薦方案：

- **W3D1 kegel base**：已完成。`2026-05-11` 以全新 phase narration + 全新 countdown guidance 建立 W3 kegel base，沒有沿用 W1/W2 節奏資產。
- **W3D4 kegel reuse**：以 W3D1 為 base，新增 1 個開場 variation。
- **W3D6 adaptive kegel reuse**：以 W3D1 為 base，metadata title 保留 adaptive，新增 2 個 adaptive variation cues。
- **W3D2 formal base**：新生 formal week 3 專用 narration + guidance，主軸是「第一次乾式波峰嘗試但不追成功」。
- **W3D5 formal reuse**：以 W3D2 為 base，新增 2～3 個 variation cues。
- **W3D3 relax**：先 exact reuse `2026-04-29`；若主人想更柔和，可加 2 個 breathing variation clips。
- **W3D7 rest**：優先 reuse `2026-05-10`，保留 W2D7 新版 inhale/exhale cue。

### 預估新 WAV 數量

推薦 B 方案預估：

- W3D1：已完成，5 個 phase narration + 13 個 countdown guidance，共 `18` 個新 WAV
- W3D4：1 個 opening variation
- W3D6：2 個 adaptive variation
- W3D2：5 個 phase narration + 約 18～22 個 formal guidance clips
- W3D5：2～3 個 formal variation
- W3D3：0～2 個 relax variation（可選）
- W3D7：0 個，直接 reuse W2D7

合計：

- **最省版**：約 `35～36` 個新 WAV
- **舒適版**：約 `38～40` 個新 WAV

### 不推薦 A：全週 full rebuild

全週 full rebuild 會把 W3 七天全部重錄，可能超過 `100+` 個新 WAV。品質最高，但 API 成本與 review/ASR 時間都會大幅上升，目前不建議。

### 可選 C：manifest-only skeleton

先只寫 manifests / tests / index，不跑 TTS。適合先鎖資料結構，但 W3D1/W3D2 需要新 narration 才能完整避免錯誤文字音訊不一致，所以只適合草稿階段。

---

## 2. 每日製作策略

## 2.1 `2026-05-11` — W3D1 凱格爾普通日

**Status:** 已完成（2026-05-11）：全新 W3 kegel base，18 個 WAV；`npm run audio:qa:date -- 2026-05-11` PASS 0 warnings；Groq ASR transcript 18/18 PASS。
**Session:** 凱格爾普通日
**Exact reuse:** none
**Base strategy:** 新 W3 kegel base manifest，phase narration 與 countdown guidance 都落在 `audio/library/2026-05-11/`。

Phases from live code：

1. `phase-01` 準備放鬆 — 60s
   - text: `現在開始：準備放鬆。這一段約 1 分鐘。腹式呼吸，放鬆腹部、臀部與大腿。`
2. `phase-02` 慢速凱格爾（10 次） — 130s
   - text: `現在開始：慢速凱格爾（10 次）。這一段約 2 分 10 秒。每次收 5 秒、放 8 秒。`
3. `phase-03` 快速凱格爾（12 次） — 24s
   - text: `現在開始：快速凱格爾（12 次）。這一段約 24 秒。輕點一下，立刻完全放掉。`
4. `phase-04` 反向凱格爾 — 150s
   - text: `現在開始：反向凱格爾。這一段約 2 分 30 秒。吸氣下沉，吐氣時保持鬆開。`
5. `phase-05` 收尾掃描 — 60s
   - text: `現在開始：收尾掃描。這一段約 1 分鐘。檢查會陰、臀部、大腿與排尿感是否有緊繃。`

Recommended audio design（已實作）：

- 新生：5 段 phase narration。
- 新生：13 個 W3 base countdown guidance clips。
- 重建：`timelineEvents` 秒數依 W3 5/8、12 quick、150s reverse 生成，沒有直接整段複製 W1D1。

Timeline requirements：

- phase 2 slow kegel：10 cycles，contract at `0, 13, 26, ... 117`，release at `5, 18, 31, ... 122`。
- phase 3 quick kegel：12 cycles，contract/release 每 1 秒交替，總 24s。
- phase 4 reverse：150s，建議沿用 4s inhale / 8s release 的節奏，程式生成 events，避免手算錯。

Manifest metadata（已實作）：

```json
{
  "sourceDate": "2026-05-11",
  "libraryKey": "2026-05-11",
  "weekNumber": 3,
  "dayNumber": 1,
  "weekdayLabel": "一",
  "sessionTitle": "凱格爾普通日"
}
```

Note：本次 W3D1 base 未設定 `assetSourceDay`，因為 phase narration 與 guidance assets 都是全新落在目標日目錄。

---

## 2.2 `2026-05-12` — W3D2 正式訓練日

**Session:** 正式訓練日
**Exact reuse:** none
**Base strategy:** 新生 W3 formal base。

Theme：第一次乾式波峰嘗試，但重點不是硬追成功，而是「7 分停下後不衝到 8～9」。

Phases from live code：

1. `phase-01` 準備期 — 120s
   - `呼吸、放鬆並確認今天不追求硬成功。`
2. `phase-02` 第 1 回：6 分暖身 — 180s
   - `先用可控高原暖身。`
3. `phase-03` 第 2 回：6.5 分維持 — 300s
   - `把高原拉長到 1～2 分鐘。`
4. `phase-04` 第 3 回：7 分放鬆觀察 — 240s
   - `剛出現射精感就停，觀察 30～60 秒。`
5. `phase-05` 收尾放鬆 — 180s
   - `可正常結束並做恢復放鬆。`

Recommended guidance principles：

- 不要挑逗升級；語氣應是控制、觀察、退回。
- guidance 從 `startAtSecond = 4` 起跳，避免和 phase narration / start cue 疊在一起。
- 每個 phase 至少要有一個早期判斷 cue。
- phase 4 是本週核心，guidance 要明確講：停、吐氣、下沉、觀察，不加刺激。

Draft guidance map：

### phase-01 準備期

- `score-map-setup` @4s：`先確認今天的目標：不是硬追成功，而是能在 7 分停得住。`
- `body-scan` @45s：`腹部、臀部和大腿都放軟；身體越鬆，越容易控制。`
- `exit-rule` @90s：`如果會陰緊、排尿怪或有悶痛，今天直接改放鬆。`

### phase-02 第 1 回：6 分暖身

- `six-warmup-start` @4s：`慢慢升到 6 分就好，還能說停就停。`
- `hold-not-chase` @60s：`維持，不追更高；讓身體記得高原不是衝刺。`
- `downshift-check` @130s：`如果開始急，就停手吐氣，讓分數回一點。`

### phase-03 第 2 回：6.5 分維持

- `six-half-boundary` @4s：`這回合停在 6.5 分附近，有熱度，但不要越線。`
- `plateau-breath` @75s：`吐氣時把骨盆底往下鬆，不要用夾緊撐住感覺。`
- `one-to-two-minute` @150s：`把高原拉長，而不是把分數拉高。`
- `pre-seven-warning` @230s：`如果射精感冒頭，先停，不要等它變大。`

### phase-04 第 3 回：7 分放鬆觀察

- `seven-stop-rule` @4s：`接近 7 分就停，今天練的是停下後讓波峰自己滑過。`
- `hands-off-observe` @45s：`停下來，只吐氣，不加刺激，不硬夾。`
- `pelvic-drop` @90s：`吸氣下沉，吐氣維持鬆開，讓反射不要接手。`
- `observe-window` @150s：`觀察 30 到 60 秒；能退回來，就是今天的成功。`
- `no-chase-after-wave` @205s：`就算有波感，也不要追第二下，先保留乾淨控制。`

### phase-05 收尾放鬆

- `clean-finish` @4s：`現在收尾，讓身體從高原慢慢退回安靜。`
- `release-check` @70s：`會陰、臀部、大腿都放掉，不把練習留成緊繃。`
- `success-definition` @135s：`今天成功的標準是停得住、退得回來，而且沒有不適。`

Estimated WAV：

- 5 phase narration
- 18 guidance clips
- total 23 new WAV

This is intentionally lighter than W2D2's 29 guidance clips, but still covers the W3-specific control logic.

---

## 2.3 `2026-05-13` — W3D3 放鬆日

**Session:** 放鬆日
**Exact reuse:** `2026-04-29`
**Base strategy:** low-cost reuse。

Recommended：

- 建立 `audio/library/2026-05-13/manifest.json`
- `sourceDate/libraryKey = 2026-05-13`
- `assetSourceDay = 2026-04-29`
- entries/timeline/audio paths 沿用 `2026-04-29`

Optional variation pack：

如果主人想降低重複感，新增 2 個 clips：

- phase 1 inhale：`吸氣，讓腹部自然往外鬆開。`
- phase 2 exhale：`吐氣，骨盆底不要用力，讓它自己下沉。`

Estimated WAV：

- min：0
- comfort：2

---

## 2.4 `2026-05-14` — W3D4 凱格爾普通日

**Session:** 凱格爾普通日
**Exact reuse:** none, but same structure as W3D1
**Base strategy:** reuse W3D1 manifest structure + one variation。

Recommended：

- 以 `2026-05-11` 為 base。
- `sourceDate/libraryKey = 2026-05-14`
- `assetSourceDay = 2026-05-11`
- 新增 phase-01 opening variation，讓重複感下降。

Opening variation draft：

```text
現在開始：準備放鬆。今天先把節奏放慢，腹部不要撐、臀部不要夾；等呼吸穩定後，再進入第三週的 5 秒收、8 秒放。
```

Estimated WAV：1

---

## 2.5 `2026-05-15` — W3D5 正式訓練日

**Session:** 正式訓練日
**Exact reuse:** none, but same structure as W3D2
**Base strategy:** reuse W3D2 + 2～3 formal variation cues。

Recommended variations：

- phase-01 @4s：`今天仍然練 7 分停下；如果身體比前一次敏感，就提早降回 6 分。`
- phase-03 @150s：`高原可以熱，但不要急；能在 6.5 分停留，才是這週的進步。`
- phase-04 @90s：`一有射精感就停手，吐氣下沉，讓波感自己過去。`

Estimated WAV：2～3

---

## 2.6 `2026-05-16` — W3D6 凱格爾普通日（可依狀態改放鬆）

**Session:** 凱格爾普通日（可依狀態改放鬆）
**Exact reuse:** none, but same phase structure as W3D1
**Base strategy:** reuse W3D1 + adaptive metadata + adaptive variation cues。

Required metadata：

```json
{
  "sourceDate": "2026-05-16",
  "libraryKey": "2026-05-16",
  "weekNumber": 3,
  "dayNumber": 6,
  "weekdayLabel": "六",
  "sessionTitle": "凱格爾普通日（可依狀態改放鬆）",
  "assetSourceDay": "2026-05-11"
}
```

Recommended variations：

- phase-04 @4s：`如果今天偏緊，這一段只做下沉呼吸，不需要追完整反向強度。`
- phase-05 @48s：`身體已經放鬆就停在這裡，不補做、不硬撐，乾淨收尾。`

Estimated WAV：2

---

## 2.7 `2026-05-17` — W3D7 休息／輕放鬆日

**Session:** 休息／輕放鬆日
**Exact reuse:** `2026-05-03`, `2026-05-10`
**Base strategy:** reuse W2D7 (`2026-05-10`)。

Why `2026-05-10` over `2026-05-03`：

- `2026-05-10` 已有新版 inhale/exhale variation。
- 聽感比直接回到 W1D7 更不單調。

Recommended：

- 建立 `audio/library/2026-05-17/manifest.json`
- `sourceDate/libraryKey = 2026-05-17`
- `assetSourceDay = 2026-05-10`
- entries/timeline/audio paths 沿用 `2026-05-10` 或其 base `2026-05-03` 既有設定。

Estimated WAV：0

---

## 3. File plan

### Create

- `audio/library/2026-05-11/manifest.json`
- `audio/library/2026-05-11/texts/*.txt`
- `audio/library/2026-05-11/generated/*.wav`
- `audio/library/2026-05-12/manifest.json`
- `audio/library/2026-05-12/texts/*.txt`
- `audio/library/2026-05-12/generated/*.wav`
- `audio/library/2026-05-12/guidance/*.wav`
- `audio/library/2026-05-13/manifest.json`
- `audio/library/2026-05-14/manifest.json`
- `audio/library/2026-05-14/texts/phase-01.txt`
- `audio/library/2026-05-14/generated/phase-01.wav`
- `audio/library/2026-05-15/manifest.json`
- `audio/library/2026-05-15/texts/*.txt` for variation clips
- `audio/library/2026-05-15/guidance/*.wav` for variation clips
- `audio/library/2026-05-16/manifest.json`
- `audio/library/2026-05-16/texts/*.txt` for adaptive variation clips
- `audio/library/2026-05-16/guidance/*.wav` for adaptive variation clips
- `audio/library/2026-05-17/manifest.json`

### Modify

- `audio/library/index.json`
- `tests/narration-manifest.test.js`
- `docs/plans/project-status-handoff.md` after implementation
- dated handoff after implementation, e.g. `docs/plans/2026-05-xx-w3-library-coverage-project-status-handoff.md`

### Keep local-only / do not stage

- `audio/library/*/tts-reports/*`
- `/tmp/*variation-asr-manifest.json`
- `/tmp/*variation-asr-cache.json`
- `.hermes/plans/*`

---

## 4. Implementation tasks

### Task 1: Add W3 regression tests first

**Objective:** Lock target metadata, reuse expectations, and library index entries before writing production manifests.

**Files:**

- Modify: `tests/narration-manifest.test.js`

Add tests for:

- `2026-05-11`: `sourceDate/libraryKey`, W3D1 metadata, 5 entries, phase 2 duration `130`, phase 3 duration `24`, phase 4 duration `150`.
- `2026-05-12`: W3D2 formal metadata, 5 entries, formal phase labels/durations `[120,180,300,240,180]`.
- `2026-05-13`: reuse day, `assetSourceDay = 2026-04-29`, index entry exists.
- `2026-05-14`: W3D4 metadata, variation override present if selected.
- `2026-05-15`: W3D5 metadata, formal variation override present if selected.
- `2026-05-16`: adaptive title, `assetSourceDay = 2026-05-11`, adaptive variation overrides present.
- `2026-05-17`: rest reuse, `assetSourceDay = 2026-05-10`, one entry.

Run expected RED:

```bash
node --test tests/narration-manifest.test.js
```

Expected: fail because manifests/index entries do not exist yet.

---

### Task 2: Generate W3D1 kegel base manifest and narration assets

**Objective:** Build the base W3 kegel manifest for reuse by W3D4 and W3D6.

**Files:**

- Create: `audio/library/2026-05-11/manifest.json`
- Create: `audio/library/2026-05-11/texts/phase-01.txt` ～ `phase-05.txt`
- Create: `audio/library/2026-05-11/generated/phase-01.wav` ～ `phase-05.wav`

Steps:

1. Write phase text files from live code output.
2. Generate 5 narration WAVs only after user approves TTS.
3. Read WAV duration / sha256.
4. Copy/reuse generic W1D1 guidance clip metadata.
5. Programmatically generate W3-specific timeline events.
6. Add W3D1 to index.
7. Run `node --test tests/narration-manifest.test.js`.

---

### Task 3: Generate W3D2 formal base assets

**Objective:** Create the W3 formal base day for first dry-peak attempt training.

**Files:**

- Create: `audio/library/2026-05-12/manifest.json`
- Create: `audio/library/2026-05-12/texts/phase-*.txt`
- Create: `audio/library/2026-05-12/texts/*guidance*.txt`
- Create: `audio/library/2026-05-12/generated/*.wav`
- Create: `audio/library/2026-05-12/guidance/*.wav`

Steps:

1. Write 5 phase narration texts.
2. Write 18 guidance text files from the draft map.
3. Generate WAVs after TTS approval.
4. Fill durations / sha256.
5. Ensure first guidance in each phase starts at `4` seconds.
6. Add W3D2 to index.
7. Run date QA:

```bash
npm run audio:qa:date -- 2026-05-12
node --test tests/narration-manifest.test.js
```

---

### Task 4: Add W3D3 relax reuse manifest

**Objective:** Cover W3D3 cheaply with exact reuse.

**Files:**

- Create: `audio/library/2026-05-13/manifest.json`
- Modify: `audio/library/index.json`

Steps:

1. Copy `2026-04-29` manifest as base.
2. Update top-level metadata to `2026-05-13`.
3. Set `assetSourceDay = 2026-04-29`.
4. Keep entry file paths pointing to `2026-04-29` unless optional variation is selected.
5. Run manifest tests.

---

### Task 5: Add W3D4 kegel reuse + opening variation

**Objective:** Cover W3D4 using W3D1 as base while reducing repetition.

**Files:**

- Create: `audio/library/2026-05-14/manifest.json`
- Create optional: `audio/library/2026-05-14/texts/phase-01.txt`
- Create optional: `audio/library/2026-05-14/generated/phase-01.wav`
- Modify: `audio/library/index.json`

Steps:

1. Copy W3D1 manifest as base.
2. Update metadata to `2026-05-14`.
3. Set `assetSourceDay = 2026-05-11`.
4. Override phase-01 narration with variation if selected.
5. Run manifest tests.

---

### Task 6: Add W3D5 formal reuse + variation cues

**Objective:** Cover W3D5 using W3D2 as base with a small formal variation pack.

**Files:**

- Create: `audio/library/2026-05-15/manifest.json`
- Create optional variation text/WAV files under `audio/library/2026-05-15/`
- Modify: `audio/library/index.json`

Steps:

1. Copy W3D2 manifest as base.
2. Update metadata to `2026-05-15`.
3. Set `assetSourceDay = 2026-05-12`.
4. Override selected formal guidance clips.
5. Run manifest tests and date QA.

---

### Task 7: Add W3D6 adaptive kegel reuse + adaptive variation cues

**Objective:** Cover adaptive kegel day while preserving title and safety-oriented guidance.

**Files:**

- Create: `audio/library/2026-05-16/manifest.json`
- Create optional variation text/WAV files under `audio/library/2026-05-16/`
- Modify: `audio/library/index.json`

Steps:

1. Copy W3D1 manifest as base.
2. Update metadata to `2026-05-16`.
3. Set session title to `凱格爾普通日（可依狀態改放鬆）`.
4. Set `assetSourceDay = 2026-05-11`.
5. Override phase-04 / phase-05 adaptive cues if selected.
6. Run manifest tests.

---

### Task 8: Add W3D7 rest reuse manifest

**Objective:** Cover W3D7 cheaply using the newest rest-day variation.

**Files:**

- Create: `audio/library/2026-05-17/manifest.json`
- Modify: `audio/library/index.json`

Steps:

1. Copy `2026-05-10` manifest as base.
2. Update metadata to `2026-05-17`.
3. Set `assetSourceDay = 2026-05-10`.
4. Keep 1 entry and 36 timeline events.
5. Run manifest tests.

---

### Task 9: Full verification pipeline

Run after all W3 manifests/assets exist:

```bash
npm test
npm run audio:qa
git diff --check
```

For new WAVs, run targeted ASR manifest instead of rechecking all reused WAVs:

```bash
node scripts/verify-voice-library.mjs \
  --manifest /tmp/interval-workout-timer-w3-new-clips-asr-manifest.json \
  --cache /tmp/interval-workout-timer-w3-new-clips-asr-cache.json \
  --request-delay-ms 3200 \
  --groq-retries 1 \
  --groq-retry-delay-ms 65000
```

Browser smoke targets:

- `2026-05-11`: verify W3D1 loads dedicated manifest and W3 slow kegel cues follow 5s/8s timing.
- `2026-05-12`: verify formal phase intro → start cue → first guidance after ~4s.
- `2026-05-16`: verify adaptive title and dedicated manifest.
- `2026-05-17`: verify rest day loads manifest, no fallback.

---

### Task 10: Docs, review, commit, push

Only after tests and audio QA pass:

1. Update `docs/plans/project-status-handoff.md`.
2. Create dated handoff snapshot for W3 coverage.
3. Run static scan.
4. Request independent review + Codex second-pass review.
5. Commit.
6. Push to `main` only after approval.
7. Verify GitHub Pages can read `audio/library/2026-05-17/manifest.json`.

---

## 5. Acceptance criteria

Implementation is complete only when all are true:

- `audio/library/index.json` includes `2026-05-11`～`2026-05-17`.
- Each new manifest has:
  - `sourceDate` equal target date
  - `libraryKey` equal target date
  - correct `weekNumber/dayNumber/weekdayLabel/sessionTitle`
  - correct `assetSourceDay` when reusing assets
  - `schemaVersion = timeline-events-v1`
  - `timelineSchemaFile = audio/schema/timeline-event.schema.json`
- `npm test` passes.
- `npm run audio:qa` passes with no errors.
- Targeted ASR passes for all newly generated WAVs.
- Browser smoke confirms no W3 day falls back to text-only cue mode.
- No `.hermes/`, `/tmp`, ASR cache, or TTS debug artifacts are staged.

---

## 6. Open decision for owner

Before implementation, choose one:

### A. Full-quality all-new W3

- Highest freshness.
- Highest TTS/API/ASR cost.
- Not recommended unless repetition is unacceptable.

### B. Recommended hybrid W3

- Base new assets where week 3 truly differs.
- Reuse exact relax/rest days.
- Add 5～8 variation clips across the week.
- Best balance of quality and cost.

### C. Manifest-first skeleton

- No TTS yet.
- Useful if we want to lock tests and JSON shape first.
- W3D1/W3D2 will still need audio generation before final release.

Recommended owner choice: **B**.
