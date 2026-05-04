# 語音規劃：2026-05-04（今天）

> 已於 **2026-05-04 16:26 CST** 完成實作：建立 `audio/library/2026-05-04/manifest.json`、更新 `audio/library/index.json`，並讓今天預設載入改為命中專用 library manifest。
>
> 已於 **2026-05-04 16:38 CST** 完成驗證：`npm test` 為 **54/54 pass**，且本機 browser smoke test 已確認 `2026-05-04` 的播放順序是 phase narration → countdown-start cue → phase guidance。
>
> 這份文件保留作為本次規劃與實作前判斷依據；其中「尚未存在」「仍走 fallback」等敘述屬於實作前狀態，請以 handoff 與目前程式碼為準。
>
> 規劃時間：**2026-05-04 15:51 CST**

---

## 一、現狀摘要

| 日期 | 星期 | WxDx | 課表類型 | 目前素材庫狀態 |
|------|------|------|----------|----------------|
| 今天 2026-05-04 | 一 | W2D1 | 凱格爾普通日 | ❌ 尚未存在 |

目前 `audio/library/index.json` 只覆蓋第一週：
- `2026-04-27` — W1D1 — 凱格爾普通日
- `2026-04-28` — W1D2 — 正式訓練日
- `2026-04-29` — W1D3 — 放鬆日
- `2026-04-30` — W1D4 — 凱格爾普通日
- `2026-05-01` — W1D5 — 正式訓練日
- `2026-05-02` — W1D6 — 凱格爾普通日（可依狀態改放鬆）
- `2026-05-03` — W1D7 — 休息／輕放鬆日

因此目前 live 預設載入 `2026-05-04` 時，仍會走 **文字腳本 + start cue fallback**。

---

## 二、live code 驗證結果

### 1. 今天的課表定位

以 live code 驗證：

```js
resolveProgramDay('2026-04-27', '2026-05-04')
// -> weekNumber: 2, dayNumber: 1, weekdayLabel: '一'

buildDailySession(2, 1)
// -> kind: 'kegel'
// -> title: '凱格爾普通日'
```

### 2. 今天的 phase 結構

```text
準備放鬆                60s
慢速凱格爾（10 次）      90s
快速凱格爾（10 次）      20s
反向凱格爾             120s
收尾掃描                60s
```

對應的 narration text 也用 live code 比對過，與既有 `2026-04-27` / `2026-04-30` / `2026-05-02` manifest entries 完全一致。

### 3. 為什麼第二週第一天仍可複用第一週素材

`timer-core.js` 內的 `get凱格爾WeekConfig(weekNumber)` 對 **week 1 與 week 2** 使用同一組設定：

- `slowHold = 3`
- `slowRest = 6`
- `slowCount = 10`
- `quickCount = 10`
- `reverseSeconds = 120`
- `includeWaveSimulation = false`
- `durationLabel = '8～10 分鐘'`
- `summary = '本週先找準肌肉位置，確認每次收完都能完全放掉。'`

也就是說，**W2D1 的實際 phase 結構與 W1D1 / W1D4 相同**，不是只有「看起來像」。

---

## 三、可複用來源比對

### A. `2026-04-27`（W1D1）
- `sessionTitle`：`凱格爾普通日`
- phase labels：完全一致
- phase durations：完全一致
- narration text：完全一致
- guidance 結構：完全一致
- **適合直接當主複用來源**

### B. `2026-04-30`（W1D4）
- `sessionTitle`：`凱格爾普通日`
- phase labels / durations / text：完全一致
- 但其 entries 內實際檔案路徑本來就已指向 `2026-04-27`
- **可作為次要參考，但不必再多繞一層**

### C. `2026-05-02`（W1D6）
- phase labels / durations / text：完全一致
- **但 `sessionTitle` 是 `凱格爾普通日（可依狀態改放鬆）`**
- 所以它可證明結構相同，**但不建議拿它當 metadata 模板**，避免把 adaptive title 帶進今天的 manifest

### 結論

**最佳策略：直接複用 `2026-04-27` 資產。**

---

## 四、今天的語音策略建議

## 建議：**直接複用，不重跑 TTS**

理由：
- 今天是 `W2D1 = 凱格爾普通日`
- live code 與既有 manifest 比對後，phase labels / durations / narration text 全部一致
- 既有 `2026-04-27` 已有完整的 phase narration、countdown guidance、timeline events、guidance clips
- 本次需求是補齊今天的 library coverage，不是改語氣或改內容

這代表：
- **不需要新文字稿**
- **不需要新 WAV**
- **不需要跑 gemini-tts**
- 只需要補資料層對應

---

## 五、實作時要新增／修改的檔案

### 1. 新增 manifest

建立：

```text
audio/library/2026-05-04/manifest.json
```

建議直接以 `audio/library/2026-04-27/manifest.json` 為骨架，調整以下 metadata：

- `generatedAt` → 實作當下時間
- `sourceDate` → `2026-05-04`
- `weekNumber` → `2`
- `dayNumber` → `1`
- `weekdayLabel` → `一`
- `sessionTitle` → `凱格爾普通日`

**保留不變的部分：**
- `voiceTool`
- `entries[*].text`
- `entries[*].countdownGuidance`
- `entries[*].timelineClips`
- `entries[*].timelineEvents`
- `entries[*].audioSha256`
- `entries[*].audioDurationSeconds`

### 2. entries 路徑策略

`entries[*]` 內的下列路徑，建議**全部維持指向 `2026-04-27`**：

- `textFile`
- `audioFile`
- `timelineClips[*].textFile`
- `timelineClips[*].audioFile`

也就是 manifest 身份屬於 `2026-05-04`，但實際資產來源沿用：

```text
audio/library/2026-04-27/texts/*
audio/library/2026-04-27/generated/*
audio/library/2026-04-27/guidance/*
```

### 3. 更新 library index

修改：

```text
audio/library/index.json
```

新增一筆：

```json
{
  "libraryKey": "2026-05-04",
  "sourceDate": "2026-05-04",
  "weekNumber": 2,
  "dayNumber": 1,
  "sessionTitle": "凱格爾普通日",
  "manifestFile": "audio/library/2026-05-04/manifest.json",
  "entryCount": 5,
  "schemaVersion": "timeline-events-v1",
  "timelineSchemaFile": "audio/schema/timeline-event.schema.json"
}
```

---

## 六、預期效果

完成後，產品行為應從：
- `2026-05-04` 預設載入 → **fallback**

變成：
- `2026-05-04` 預設載入 → **直接命中 `audio/library/2026-05-04/manifest.json`**
- 開始播放時可走完整：
  1. phase narration
  2. `audio/fx/countdown-start.wav`
  3. phase guidance
  4. `audio/fx/countdown-end.wav`

---

## 七、實作後驗證清單

至少要跑：

```bash
node --test tests/narration-manifest.test.js
npm test
git diff --check
```

再做一次本機 smoke test：

1. 開頁面，確認預設日是 `2026-05-04`
2. 確認 UI 不再顯示 fallback 狀態
3. 按下開始
4. 確認實際播放順序是：
   - phase narration
   - `countdown-start.wav`
   - guidance clips
5. 切去 `2026-05-03` 再切回 `2026-05-04`
   - 確認切日後仍能正確載入專用 manifest

---

## 八、風險與注意事項

1. **不要把 `2026-05-02` 直接複製過來不改 title**
   - 否則會把 `凱格爾普通日（可依狀態改放鬆）` 錯帶到今天

2. **不要重生新的文字稿或 WAV**
   - 這次不是內容差異，而是 coverage 補齊問題
   - 重跑 TTS 只會增加成本與不必要差異

3. **manifest 的身份與資產來源可以分離**
   - `sourceDate = 2026-05-04`
   - 但 `audioFile` / `textFile` 指向 `2026-04-27` 是合理且符合既有做法的

4. **實作完成後，handoff 要同步更新**
   - 因為完成後，`2026-05-04` 就不再是 fallback，而是已有專用 library coverage
   - `docs/plans/project-status-handoff.md` 的「今天應走 fallback」敘述屆時就會過期

---

## 九、建議的下一步

若要直接接著做，建議順序是：

1. 建 `audio/library/2026-05-04/manifest.json`
2. 更新 `audio/library/index.json`
3. 補或調整 `tests/narration-manifest.test.js`（若目前 assertions 將 2026-05-04 視為 fallback）
4. 跑 `npm test`
5. smoke test 預設載入 `2026-05-04`
6. 成功後再更新 handoff
