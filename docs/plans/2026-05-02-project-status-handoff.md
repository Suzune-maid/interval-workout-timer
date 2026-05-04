# 2026-05-02 Project status handoff

> 歷史快照：目前統一追蹤檔已改為 `docs/plans/project-status-handoff.md`；這份保留為 2026-05-02 當次紀錄。
>
> 目的：讓之後的新 session 能在 3～5 分鐘內理解這個 repo 的**目前狀態、最近進度、已知基線、部署方式、驗證流程與實戰經驗**，避免重新踩同一批坑。

## TL;DR

- **主要分支**：`main`
- **測試基線**：`npm test` → **52/52 pass**
- **語音庫**：完整第一週 W1D1～W1D7（2026-04-27～2026-05-03）
- **正式站**：<https://suzune-maid.github.io/interval-workout-timer/>
- **部署方式**：GitHub Pages branch-based，**push 到 `main` 後自動上線**（有 propagation delay）
- repo 內**沒有** `.github/workflows` deploy pipeline
- `audio/today/` 目錄**已自 repo 移除**，不再保留草稿或 runtime 角色
- 語音路由目前已改為 **純 library-based**，不再有 `audio/today` 特例
- 若今天沒有 library manifest，app 會落回文字腳本模式，但仍會播開始 cue

---

## 目前專案現況

### 產品定位
這是一個乾式高潮導向的靜態訓練頁面，核心不是單純計時器，而是：

- 6 週課表顯示與切日
- 依日期自動定位今天課表
- 分 phase 的倒數流程
- phase narration + start cue + countdown guidance + end cue 的音訊流程
- 在只有文字腳本、沒有專用語音素材的日子，也要維持可用的 fallback 體驗

### 目前已完成到哪裡
- timetable / summary / timer 基本功能
- 手動切換任一天課表
- monotonic countdown scheduling
- phase intro / cue / end cue 流程
- 倒數中 guidance 的 `timeline-events-v1` 資料驅動播放
- 完整 W1D1～W1D7 語音庫（2026-04-27～2026-05-03）
- library-only audio routing：**不再有 `audio/today` 特例**，manifest 解析完全依賴 `audio/library/<date>/manifest.json`
- 若今天沒有 library manifest → cue-only narration player stub + 文字腳本 fallback
- 智慧狀態訊息：區分「今天無 library」「歷史日無 library」「今天有 library」
- `audio/today/` 已從 repo 完全移除
- 首頁靜態教育區塊：`興奮度差異與分辨方式`
- GitHub Pages 正式站可直接使用，push-to-main 會更新 live

### 目前沒有卡住的 blocker
- 無未解 blocker
- 無待恢復的半成品修改

---

## 本輪重點變更（相較前次 handoff）

### 1. `audio/today` 目錄已完整移除
- 所有 `audio/today/` 底下的 WAV、文字稿、manifest、source 全部刪除
- `app.js` 中的 `resolveNarrationManifestUrl()` 不再有 `audio/today` fallback
- `audio-player.js` 的 `loadNarrationManifest()` 不再帶預設路徑
- 測試 fixture 改為純 date-based library paths
- `README.md` 已更新
- 對應 commit：`04b99d0 refactor: remove legacy audio/today assets`（已 push）

### 2. 語音路由改為純 library-based，無 fallback
- `resolveNarrationManifestUrl(entry)` 現在純粹從 `audio/library/index.json` 查詢
- 若 selected day 在 library index 中有對應條目，載入該日 manifest
- 若沒有，回傳 null，app 進入 cue-only fallback 模式
- 新增 `createCueOnlyNarrationPlayer()`，不用建立不必要的 `Audio` 實體
- 新增 `getSelectionStatusMessage(entry)`，根據今天與所選日期的關係產生不同 status text

### 3. 完整第一週語音庫已補齊

| 日期 | WxDx | 課表 | 語音策略 | 狀態 |
|------|------|------|---------|:----:|
| 2026-04-27 | W1D1 | 凱格爾普通日 | 原始生成 | ✅ |
| 2026-04-28 | W1D2 | 正式訓練日 | 原始生成 | ✅ |
| 2026-04-29 | W1D3 | 放鬆日 | 原始生成 | ✅ |
| 2026-04-30 | W1D4 | 凱格爾普通日 | 複用 W1D1 | ✅ |
| 2026-05-01 | W1D5 | 正式訓練日 | 混合重用（既有 + 新分數判斷） | ✅ |
| **2026-05-02** | **W1D6** | **凱格爾普通日（可依狀態改放鬆）** | **複用 W1D1** | **✅ 新建** |
| **2026-05-03** | **W1D7** | **休息／輕放鬆日** | **全新生成** | **✅ 新建** |

對應 commit：`7501130 feat: add voice library for W1D6 (kegel adaptive) and W1D7 (rest day)`（已 push）

### 4. 測試基線提升至 52/52
- 新增 regression test：今天若沒有 library manifest，不得抓 `audio/today`
- 新增 regression test：切回今天但無 library 時，狀態文案改成開始音效 fallback 模式
- 新增 `libraryDays` fixture 參數來模擬不同日期是否有 library manifest
- 既有的 `app-flow.test.js` 測試更新為 library-based routing 斷言
- `narration-manifest.test.js` 中的「legacy today」測試改名，改讀 library manifest

### 5. 服務化系統更新
- 新增 skill：`interval-workout-timer-historical-library-audio-loading`
  - 涵蓋 TDD 流程、library-only routing 實作細節、smoke test 建議
- 記憶體更新：移除 `audio/today` 相關事實，更新測試基線為 52/52

---

## 目前產品行為基線

以下是之後重構時**不能隨便破壞**的核心行為：

1. 切換日程時，必須停止舊播放並重設目前 session state
2. 切到已有專用語音素材的日子時，必須改載入對應 `audio/library/<date>/manifest.json`
3. 切到沒有專用語音素材的日子時，UI 要退回文字腳本模式
4. 沒有專用語音素材的日子，開始前也要先播放開始 cue
5. pause 後 resume，只能重播開始 cue，不應重播整段 narration
6. skip 到下一段前，要先取消／停止舊播放
7. 過期或被取消的 async playback，不可以回頭覆寫新的 UI 狀態
8. phase intro 的 promise 必須等實際播完，而不是只等 `audio.play()` resolve
9. countdown 使用 monotonic clock；heartbeat 延遲時要 catch up，不是單純慢一拍
10. 如果使用者要求「phase 一開始就講某件事」，**一定要檢查 timelineEvents，不要只改文案**
11. **不再有 `audio/today` 特例**；manifest 就是 source of truth

建議優先關注的測試檔：
- `tests/app-flow.test.js`
- `tests/timeline-orchestrator.test.js`
- `tests/narration-manifest.test.js`
- `tests/static-page-content.test.js`

---

## 目前程式與資料結構重點

### 核心模組
- `app.js` — 頁面組裝層；負責初始化、事件綁定與把 session / view / orchestrator / audio 串起來
- `dom-refs.js` — 主要 DOM refs 收斂
- `schedule-view.js` — 日程表與摘要 render
- `timer-view.js` — timer、phase plan、narration / guidance 狀態 render
- `session-controller.js` — selected day、fallback narration 與 session state 切換
- `timeline-orchestrator.js` — phase progression、倒數、pause/resume、skip/cancel、monotonic scheduling
- `audio-engine.js` — track-based audio abstraction
- `audio-player.js` — narration / cue / guidance 播放相容 wrapper
- `narration-manifest.js` — `timeline-events-v1` 正規化與 legacy 相容檢視
- `timer-core.js` — 日期、課表、phase、session 等純資料邏輯

### 語音素材結構
```
audio/
├── fx/
│   ├── countdown-start.wav
│   └── countdown-end.wav
├── schema/
│   └── timeline-event.schema.json
├── library/
│   ├── index.json           ← 日期索引（目前已收錄 W1D1～W1D7）
│   ├── 2026-04-27/          ← 凱格爾普通日
│   ├── 2026-04-28/          ← 正式訓練日
│   ├── 2026-04-29/          ← 放鬆日
│   ├── 2026-04-30/          ← 凱格爾普通日（複用 04-27）
│   ├── 2026-05-01/          ← 正式訓練日（混合重用）
│   ├── 2026-05-02/          ← 凱格爾普通日（複用 04-27，manifest 新建）
│   └── 2026-05-03/          ← 休息／輕放鬆日（全新）
```

每個日期資料夾格式：
```
audio/library/<date>/
├── manifest.json         ← phase 文本、檔案路徑、duration、sha256、timelineClips、timelineEvents
├── texts/                ← 文字稿
├── generated/            ← phase narration WAV
└── guidance/             ← 倒數中 guidance 短語音 WAV
```

**`audio/library/2026-05-01/manifest.json`** 值得特別看；它示範了「formal day 混合重用」策略：
- phase narration：沿用 `2026-04-28/generated/*.wav`
- 後段 guidance：沿用 `2026-04-28/guidance/*.wav`
- 每段第一句開場判斷：`2026-05-01` 新生成
- phase 5：原本無 guidance，新增收尾回降提醒

---

## 目前測試與驗證狀態

### 自動測試
```bash
npm test
```
結果：**52/52 pass**

### 本機 smoke test 建議
```bash
cd /home/atmjin/.hermes/archive/github/interval-workout-timer
python3 -m http.server 8124
```
打開：<http://127.0.0.1:8124/>

建議至少驗五種情境：
1. **預設載入（2026-05-02）**：無 library manifest，應顯示文字腳本 fallback
2. **切到 2026-05-01**：正式訓練日，有分數判斷 guidance
3. **切到 2026-05-03**：休息日，1 段單 phase 呼吸放鬆
4. **切回 2026-05-02**：確認狀態訊息變為「開始音效 fallback」
5. **按下開始**：確認 start cue 有播放

若要抓更硬的證據，可 monkeypatch `HTMLMediaElement.play()` 看播放順序。

### Live 驗證現況
- 正式站：<https://suzune-maid.github.io/interval-workout-timer/>
- push 到 `main` 後 GitHub Pages 會更新內容
- 有 propagation delay（10～60 秒），需要等一下再確認

---

## 部署方式與發版事實

### 目前的實際部署方式
```bash
npm test
git push origin main
```
- GitHub Pages branch-based deployment
- 來源分支：`main`
- repo 內**沒有** `.github/workflows` deploy pipeline

### 發版後建議流程
1. 先跑 `npm test`
2. `git push origin main`
3. 稍等 10～60 秒以上
4. 開正式站檢查確定性 marker 是否已更新

---

## 重要經驗與注意事項

### 1. `HTMLMediaElement.play()` resolve 不等於播完
- `await audio.play()` 只表示瀏覽器接受開始播放
- **不表示音檔已完整播放完畢**
- 流程必須等 `ended` / `error`，不能只等 `play()` promise resolve

### 2. narration 與 start cue 是不同層的語意
- narration 是 narration
- cue 是 cue
- fallback day 沒有 narration，不代表不需要 cue

### 3. stale async 很容易覆寫新 UI
這個專案有許多：
- 切日、skip、reset、pause/resume、async 音訊播放等待
- 一定要有 sequence id / cancellation guard

### 4. 內容型首頁區塊適合加小型靜態測試
像 `興奮度差異與分辨方式` 這類 FAQ / 教育內容，適合用小型靜態測試鎖住。

### 5. 以 live code 為準，不要直接相信 handoff / planning 文件
確認當天 session 類型要用：
```js
resolveProgramDay(startDate, targetDate)
buildDailySession(weekNumber, dayNumber)
```

### 6. formal day 若要「一開始就說」，要同時改文案與 timeline
- 改第一句 guidance 文案
- 把第一個 event 秒數拉到 countdown 起始附近
- 必要時新增原本沒有 guidance 的 phase

### 7. 注意複用語音策略的 manifest 更新
當語音重用時（如 2026-05-02 → 2026-04-27），manifest 中所有 `audioFile`/`textFile` 路徑指向原始素材目錄，正確無誤。新 manifest 只改 metadata（date, title, dayNumber 等）。

### 8. 下次新增語音素材日的建議順序
1. 確認該日 session 結構（`timer-core.js`）
2. 比對既有素材，判斷可否複用
3. 若複用：複製 manifest 模板，改 metadata，更新 index
4. 若新生：先寫 manifest + 文字稿，再跑 TTS，最後補 manifest metadata（duration/sha256）
5. 更新 `tests/narration-manifest.test.js`（如有新格式）
6. 驗證：`npm test` → 手動 browser smoke test

---

## 最近關鍵 commit 速查

- `7501130` — `feat: add voice library for W1D6 (kegel adaptive) and W1D7 (rest day)`
- `04b99d0` — `refactor: remove legacy audio/today assets`
- `779f4cd` — `[verified] fix: load library narration on day switch`
- `2af76c0` — `feat: add 2026-05-01 formal day arousal guidance`
- `fdbccf9` — `feat: add 2026-04-30 reused narration manifest`
- `67508e4` — `docs: refresh deployment notes and project handoff`
- `cd24038` — `[verified] feat: add 2026-04-29 relax day narration`

---

## 目前值得知道的檔案入口

### 如果要理解產品目前狀態
- `README.md`
- `docs/plans/2026-05-02-project-status-handoff.md`（這份）

### 如果要改 phase flow / audio 行為
- `app.js`
- `timeline-orchestrator.js`
- `audio-player.js`
- `audio-engine.js`
- `tests/app-flow.test.js`
- `tests/timeline-orchestrator.test.js`

### 如果要改語音素材 / manifest
- `audio/library/index.json`
- `audio/library/2026-05-01/manifest.json`（混合重用參考範例）
- `narration-manifest.js`
- `tests/narration-manifest.test.js`
- `docs/plans/2026-05-02-voice-plan.md`（今天的語音規劃參考）

### 如果要改首頁靜態說明內容
- `index.html`
- `styles.css`
- `tests/static-page-content.test.js`

---

## 之後可能值得做，但目前不是 blocker 的項目

1. 每次影響語音 routing 或新增素材後，都補一次 live site 驗證
2. 若希望 deploy 狀態更可觀察，可考慮改成 GitHub Actions Pages workflow
3. 補更多對 `player 不可用` / cue disabled / 異常中止 的 UI regression tests
4. 若語音庫持續擴充，最好把「新增一天素材需要同步更新哪些檔」整理成固定流程文件或 skill（目前已有 `interval-workout-timer-daily-narration-refresh` skill 可參考）
5. 若首頁靜態教育內容越來越多，可考慮把內容區塊切成更明確的 partial / render 結構

---

## 建議的新 session 起手式

1. 先看這份文件：`docs/plans/2026-05-02-project-status-handoff.md`
2. 再看 `README.md`
3. 跑一次：`npm test`
4. 若是改 flow / audio：先讀
   - `app.js`、`timeline-orchestrator.js`、`audio-player.js`、`tests/app-flow.test.js`
5. 若是改語音素材／manifest：再讀
   - `audio/library/index.json`、`narration-manifest.js`、`tests/narration-manifest.test.js`
6. 若是改首頁說明內容：再讀
   - `index.html`、`styles.css`、`tests/static-page-content.test.js`
7. 若要新增語音素材日，參考 `docs/plans/2026-05-02-voice-plan.md`

照這個順序通常能最快進入可動手的狀態。
