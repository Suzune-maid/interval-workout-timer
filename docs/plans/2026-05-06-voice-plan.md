# 2026-05-06 W2D3 放鬆日語音全新重做計畫

> **For Hermes:** Use test-driven-development + interval-workout-timer-daily-narration-refresh. 先寫測試與 manifest/text 草稿，再產生 WAV，最後跑 deterministic QA → ASR fuzzy QA → npm test。不要直接複用 2026-04-29 的音檔。

**Goal:** 為明天 `2026-05-06`（W2D3，放鬆日）建立一整套全新 library 語音素材，使用剛完成的三層語音驗證流程驗收。

**Architecture:** `2026-05-06` 與既有 `2026-04-29` 在課表結構上完全同構，但這次主人指定「新的流程全部重做」，所以只把 `2026-04-29` 當 timeline 結構參考，不沿用任何 `audioFile` / `textFile`。所有 production assets 都落在 `audio/library/2026-05-06/`。

**Tech Stack:** Vanilla JS static app、Node `node:test`、`uv run gemini-tts`（OpenRouter `google/gemini-3.1-flash-tts-preview` / Leda）、Groq Whisper ASR verifier。

---

## 0. Live code 驗證結果

執行時間：`2026-05-05 19:25:35 CST`

`PROGRAM_START_DATE = 2026-04-27`

目標日期：`2026-05-06`

程式推導：

```json
{
  "sourceDate": "2026-05-06",
  "weekNumber": 2,
  "dayNumber": 3,
  "weekdayLabel": "三",
  "weekFocus": "高原期訓練",
  "sessionTitle": "放鬆日",
  "sessionSummary": "把今天當成降張力日，專心腹式呼吸與反向凱格爾，不追求刺激。"
}
```

`audio/library/index.json` 目前尚無 `2026-05-06`。  
同構 reuse candidate：`2026-04-29`，但本輪不走 reuse。

---

## 1. 語音製作策略

### 決策

採用 **full rebuild / full-quality**：

- 新 `texts/*.txt`
- 新 `generated/*.wav`
- 新 `guidance/*.wav`
- 新 `manifest.json`
- 新 `audio/library/index.json` 條目
- 新 manifest regression test
- 完整 voice verification pipeline 驗收

### 不做

- 不指向 `2026-04-29` 的任何 production asset
- 不把 `assetSourceDay` 設成 `2026-04-29`
- 不把 local-only cache / debug report 放進 git
- 未確認 TTS 前，不 commit / push

---

## 2. Audio profile

建議統一 profile：

```text
AUDIO PROFILE: Suzune W2D3 — Recovery Breath Companion. Scene: quiet evening recovery room, soft blue-violet light, close but calm companion beside the listener. Speak in natural Taiwan Mandarin with a warm, steady, clear medium-low voice. This is a recovery / down-regulation day: no teasing escalation, no dramatic acting, no hype, no whisper-only delivery. Keep the pace calm medium-slow with clean pauses. Prioritize relaxation, breath rhythm, pelvic-floor release, and safety. The voice should be audible on phone speakers and gently grounding.
```

短 guidance 可用簡化版，避免空 payload 或截斷：

```text
Natural Taiwan Mandarin. Read the complete sentence exactly once, clearly and calmly. Warm recovery training guidance, medium-slow pace, no omission, no truncation. Keep it audible on phone speakers.
```

---

## 3. Planned manifest structure

### WAV 數量估算

- Phase narration：3 個
- Unique guidance clips：9 個
  - phase 1：2 個
  - phase 2：2 個
  - phase 3：5 個
- Total production WAV：12 個
- Timeline events：59 筆
  - phase 1：24 筆
  - phase 2：30 筆
  - phase 3：5 筆

### Phase 1：腹式呼吸（120 秒）

Narration text：

```text
現在開始：腹式呼吸。這一段約 2 分鐘。鼻吸嘴吐，讓腹部自然膨起。
```

Guidance design：4 秒吸氣、6 秒吐氣，共 12 輪。

Clips：

```json
{
  "soft-belly-inhale": "吸氣，讓腹部自然鼓起。",
  "long-exhale-release": "吐氣，肩膀和骨盆底一起放掉。"
}
```

Timeline pattern：

- inhale at `0, 10, 20, ... 110`
- exhale at `4, 14, 24, ... 114`

### Phase 2：反向凱格爾（180 秒）

Narration text：

```text
現在開始：反向凱格爾。這一段約 3 分鐘。吸氣下沉，吐氣保持放鬆。
```

Guidance design：4 秒吸氣下沉、8 秒吐氣保持鬆，共 15 輪。

Clips：

```json
{
  "inhale-drop": "吸氣，骨盆底往下鬆。",
  "exhale-open": "吐氣，保持打開，不要用力。"
}
```

Timeline pattern：

- inhale-drop at `0, 12, 24, ... 168`
- exhale-open at `4, 16, 28, ... 172`

### Phase 3：收尾掃描（60 秒）

Narration text：

```text
現在開始：收尾掃描。這一段約 1 分鐘。確認腹部、臀部與大腿都沒有偷用力。
```

Guidance design：每 12 秒一個檢查點，共 5 個。

Clips：

```json
{
  "jaw-soft": "額頭和下顎，放鬆。",
  "belly-soft": "腹部，保持柔軟。",
  "legs-release": "臀部和大腿，不要夾。",
  "pelvic-floor-release": "會陰，往下鬆開。",
  "clean-finish": "排尿感正常，就乾淨結束。"
}
```

Timeline：

- `0`: jaw-soft
- `12`: belly-soft
- `24`: legs-release
- `36`: pelvic-floor-release
- `48`: clean-finish

---

## 4. Implementation tasks

### Task 1：新增 manifest regression test（RED）

**Objective:** 鎖定 `2026-05-06` 必須是全新生，不可沿用 `2026-04-29` assets。

**Files:**

- Modify: `tests/narration-manifest.test.js`
- Future create: `audio/library/2026-05-06/manifest.json`

**Test assertions:**

新增常數：

```js
const W2D3_LIBRARY_MANIFEST_PATH = new URL('../audio/library/2026-05-06/manifest.json', import.meta.url);
```

新增測試：

```js
test('2026-05-06 library manifest 會以全新 W2D3 放鬆日素材落在自己的日期目錄', async () => {
  const [raw, libraryIndex] = await Promise.all([
    readJson(W2D3_LIBRARY_MANIFEST_PATH),
    readJson(LIBRARY_INDEX_PATH),
  ]);
  const phase01 = findEntry(raw, 'phase-01');
  const phase02 = findEntry(raw, 'phase-02');
  const phase03 = findEntry(raw, 'phase-03');
  const libraryItem = libraryIndex.items.find((item) => item.libraryKey === '2026-05-06');

  assert.equal(raw.schemaVersion, 'timeline-events-v1');
  assert.equal(raw.sourceDate, '2026-05-06');
  assert.equal(raw.programStartDate, '2026-04-27');
  assert.equal(raw.weekNumber, 2);
  assert.equal(raw.dayNumber, 3);
  assert.equal(raw.weekdayLabel, '三');
  assert.equal(raw.sessionTitle, '放鬆日');
  assert.equal(raw.assetSourceDay, undefined);
  assert.equal(raw.entries.length, 3);

  assert.deepEqual(raw.entries.map((item) => item.phaseLabel), ['腹式呼吸', '反向凱格爾', '收尾掃描']);
  assert.deepEqual(raw.entries.map((item) => item.durationSeconds), [120, 180, 60]);

  for (const entry of raw.entries) {
    assert.match(entry.textFile, /^audio\/library\/2026-05-06\/texts\//);
    assert.match(entry.audioFile, /^audio\/library\/2026-05-06\/generated\//);
    for (const clip of Object.values(entry.timelineClips ?? {})) {
      assert.match(clip.textFile, /^audio\/library\/2026-05-06\/texts\//);
      assert.match(clip.audioFile, /^audio\/library\/2026-05-06\/guidance\//);
    }
  }

  assert.equal(Object.keys(phase01.timelineClips).length, 2);
  assert.equal(Object.keys(phase02.timelineClips).length, 2);
  assert.equal(Object.keys(phase03.timelineClips).length, 5);
  assert.equal(phase01.timelineEvents.length, 24);
  assert.equal(phase02.timelineEvents.length, 30);
  assert.equal(phase03.timelineEvents.length, 5);

  assert.deepEqual(phase01.timelineEvents.map((item) => item.startAtSecond).slice(0, 8), [0, 4, 10, 14, 20, 24, 30, 34]);
  assert.deepEqual(phase02.timelineEvents.map((item) => item.startAtSecond).slice(0, 8), [0, 4, 12, 16, 24, 28, 36, 40]);
  assert.deepEqual(phase03.timelineEvents.map((item) => item.startAtSecond), [0, 12, 24, 36, 48]);

  assert.equal(phase01.timelineClips['soft-belly-inhale']?.text, '吸氣，讓腹部自然鼓起。');
  assert.equal(phase01.timelineClips['long-exhale-release']?.text, '吐氣，肩膀和骨盆底一起放掉。');
  assert.equal(phase02.timelineClips['inhale-drop']?.text, '吸氣，骨盆底往下鬆。');
  assert.equal(phase02.timelineClips['exhale-open']?.text, '吐氣，保持打開，不要用力。');
  assert.equal(phase03.timelineClips['clean-finish']?.text, '排尿感正常，就乾淨結束。');

  assert.equal(phase01.countdownGuidance?.summary, '4 秒吸氣、6 秒吐氣，共 12 輪');
  assert.equal(phase02.countdownGuidance?.summary, '4 秒吸氣下沉、8 秒吐氣保持鬆，共 15 輪');
  assert.equal(phase03.countdownGuidance?.summary, '每 12 秒帶一次放鬆檢查，共 5 個提示');

  assert.ok(libraryItem, 'library index 應包含 2026-05-06 條目');
  assert.equal(libraryItem.sourceDate, '2026-05-06');
  assert.equal(libraryItem.weekNumber, 2);
  assert.equal(libraryItem.dayNumber, 3);
  assert.equal(libraryItem.sessionTitle, '放鬆日');
  assert.equal(libraryItem.manifestFile, 'audio/library/2026-05-06/manifest.json');
  assert.equal(libraryItem.entryCount, 3);
});
```

**Run:**

```bash
node --test tests/narration-manifest.test.js --test-name-pattern='2026-05-06'
```

**Expected:** FAIL，因為 manifest 尚未存在。

---

### Task 2：建立 texts 與 manifest skeleton（GREEN draft）

**Objective:** 先建立可被測試讀到的 `texts/*.txt` 與 manifest skeleton，尚未填 WAV metadata。

**Files:**

- Create: `audio/library/2026-05-06/texts/phase-01.txt`
- Create: `audio/library/2026-05-06/texts/phase-02.txt`
- Create: `audio/library/2026-05-06/texts/phase-03.txt`
- Create: `audio/library/2026-05-06/texts/phase-01-guidance-01.txt`
- Create: `audio/library/2026-05-06/texts/phase-01-guidance-02.txt`
- Create: `audio/library/2026-05-06/texts/phase-02-guidance-01.txt`
- Create: `audio/library/2026-05-06/texts/phase-02-guidance-02.txt`
- Create: `audio/library/2026-05-06/texts/phase-03-guidance-01.txt` ... `phase-03-guidance-05.txt`
- Create: `audio/library/2026-05-06/manifest.json`

**Implementation notes:**

- timeline events 用程式生成，不手刻 59 筆。
- 初始 manifest 可先讓 audio metadata 留 `null` 或暫不填；但最終 QA 前必須全部補齊。
- 測試若要求 `audioSha256` / `audioDurationSeconds`，等 Task 5 再補強。

**Run:**

```bash
node --test tests/narration-manifest.test.js --test-name-pattern='2026-05-06'
```

**Expected:** PASS for structure-only assertions。

---

### Task 3：OpenRouter TTS preflight

**Objective:** 真實生成前確認 TTS tool 與 key 可用，不洩漏 secret。

**Commands:**

```bash
cd /home/atmjin/.hermes/archive/github/gemini-tts-cli
uv run gemini-tts --help
python3 - <<'PY'
from pathlib import Path
p = Path('.env')
print('env_exists', p.exists())
key = None
if p.exists():
    for line in p.read_text(encoding='utf-8', errors='replace').splitlines():
        s = line.strip()
        if s.startswith('OPENROUTER_API_KEY='):
            key = s.split('=', 1)[1].strip().strip('"\'')
            break
print('OPENROUTER_API_KEY_present', bool(key), 'len', len(key) if key else 0, 'prefix', (key[:8] + '...') if key else '')
PY
```

可選：呼叫 `/auth/key`，但輸出必須 redact。

---

### Task 4：批次生成 12 個 WAV 到正式路徑

**Objective:** 用新文字與新 style 生成 production WAV。

**Files:**

- Create: `audio/library/2026-05-06/generated/phase-01.wav`
- Create: `audio/library/2026-05-06/generated/phase-02.wav`
- Create: `audio/library/2026-05-06/generated/phase-03.wav`
- Create: `audio/library/2026-05-06/guidance/phase-01-guidance-01.wav`
- Create: `audio/library/2026-05-06/guidance/phase-01-guidance-02.wav`
- Create: `audio/library/2026-05-06/guidance/phase-02-guidance-01.wav`
- Create: `audio/library/2026-05-06/guidance/phase-02-guidance-02.wav`
- Create: `audio/library/2026-05-06/guidance/phase-03-guidance-01.wav` ... `phase-03-guidance-05.wav`

**Preferred command shape:**

```bash
cd /home/atmjin/.hermes/archive/github/gemini-tts-cli
uv run gemini-tts \
  --text-file /home/atmjin/.hermes/archive/github/interval-workout-timer/audio/library/2026-05-06/texts/phase-01.txt \
  --api-key-file .env \
  --style "$PHASE_STYLE" \
  --retry 2 --retry-on-invalid-audio \
  --output /home/atmjin/.hermes/archive/github/interval-workout-timer/audio/library/2026-05-06/generated/phase-01.wav
```

**Validation immediately after each file:**

- size `> 44`
- WAV frame count `> 0`
- duration `> 0`
- no header-only WAV

If a single short clip returns empty payload or clipped content：

1. Retry only that clip。
2. Use simplified style。
3. If still bad, minimally shorten text and update both text file + manifest。

---

### Task 5：回填 manifest metadata + index

**Objective:** 把每個 WAV 的 duration / sha256 / model / voice / style 寫回 manifest，並把新日期加入 index。

**Files:**

- Modify: `audio/library/2026-05-06/manifest.json`
- Modify: `audio/library/index.json`

**Required fields per entry / clip:**

```json
{
  "audioDurationSeconds": 0,
  "audioSha256": "...",
  "ttsModel": "google/gemini-3.1-flash-tts-preview",
  "ttsVoice": "Leda",
  "ttsStyle": "...",
  "ttsActualStyle": "... optional if simplified retry used"
}
```

**Index entry:**

```json
{
  "libraryKey": "2026-05-06",
  "sourceDate": "2026-05-06",
  "weekNumber": 2,
  "dayNumber": 3,
  "sessionTitle": "放鬆日",
  "manifestFile": "audio/library/2026-05-06/manifest.json",
  "entryCount": 3,
  "schemaVersion": "timeline-events-v1",
  "timelineSchemaFile": "audio/schema/timeline-event.schema.json"
}
```

---

### Task 6：完整 QA / ASR 驗證

**Objective:** 用新 pipeline 確認 audio physical quality + real speech content。

**Commands:**

```bash
npm run audio:qa:date -- 2026-05-06
npm run audio:verify:date -- 2026-05-06 --limit 6 --cache audio/library/2026-05-06/tts-reports/groq-asr-smoke.json --request-delay-ms 0 --groq-retries 0
npm run audio:verify:date -- 2026-05-06
npm test
git diff --check
```

**Expected:**

- deterministic errors = 0
- ASR errors = 0
- `npm test` pass
- `git diff --check` pass

**Notes:**

- 完整 `audio:verify:date` 若沒有完整 cache，保留預設 pacing，不要強行 `--request-delay-ms 0`，避免 Groq 20 RPM。
- `audio/library/2026-05-06/tts-reports/` 是 local-only，不進 git。

---

### Task 7：Runtime smoke test

**Objective:** 確認實際播放順序與 UI 狀態，而不只驗 JSON。

**Local server:**

```bash
python3 -m http.server 4173
```

**Browser checks:**

- 切到 `2026-05-06`
- 確認 narration 狀態不是 fallback
- 按開始後順序：phase narration → `countdown-start.wav` → guidance clips
- phase 1 在 0/4/10/14 秒節奏觸發 guidance
- console 無 JS error

---

## 5. Commit / push policy

等以下全部通過後再 commit：

```bash
npm run audio:verify:date -- 2026-05-06
npm test
git diff --check
```

建議 commit message：

```text
feat: add 2026-05-06 relax day narration
```

Commit 前 staging 檢查：

```bash
git diff --cached --name-only | grep -E 'tts-|debug|reports|experiments|batches|\.env$' || true
```

不可 stage：

- `.env`
- `audio/library/*/tts-reports/`
- TTS debug JSON
- retry scratch files

---

## 6. Approval boundary

這份計畫目前只規劃，不呼叫 TTS。

下一步若主人確認「開始做」，才可以進入：

1. 寫 failing test。
2. 建 texts + manifest skeleton。
3. OpenRouter preflight。
4. 生成 12 個 WAV。
5. 跑完整 pipeline。
6. 視結果 repair 單檔。
