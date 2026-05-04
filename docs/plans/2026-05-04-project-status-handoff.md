# 2026-05-04 Project status handoff

> 這是 **2026-05-04 當次紀錄快照**。
>
> 之後若要看最新狀態，請以 `docs/plans/project-status-handoff.md` 為主；這份只保留作為本次整理時點的記錄。
>
> Snapshot time: **2026-05-04 17:22 CST**

## TL;DR

- **主要分支**：`main`
- **測試基線**：`npm test` → **59/59 pass**
- **語音庫覆蓋**：第一週 W1D1～W1D7（`2026-04-27`～`2026-05-03`）＋ `2026-05-04`（W2D1）
- **正式站**：<https://suzune-maid.github.io/interval-workout-timer/>
- **部署方式**：GitHub Pages branch-based deployment；push 到 `main` 後自動上線（有 propagation delay）
- repo 內**沒有** `.github/workflows` deploy pipeline
- `audio/today/` 已自 repo 移除
- runtime 語音路由目前是 **library-only**
- 若 selected day 沒有 library manifest，app 會退回 **文字腳本 + start cue** fallback
- 首頁日程表已改為 **位於今日流程預覽下方的單週切換 UI**
- 以 live code 確認：**2026-05-04 = W2D1 = 凱格爾普通日**；預設載入會命中 `audio/library/2026-05-04/manifest.json`

---

## 這份文件在系統中的角色

這次開始改成：

- `docs/plans/project-status-handoff.md` → 固定追蹤檔
- `docs/plans/2026-05-04-project-status-handoff.md` → 這次的 dated 快照

也就是：

- 要追最新 → 看 canonical
- 要查這次整理當下的描述 → 看這份

---

## 目前專案現況

### 產品定位
這是一個乾式高潮導向的靜態訓練頁面，核心不是單純計時器，而是：

- 6 週課表顯示與切日
- 依日期自動定位今天課表
- 分 phase 的倒數流程
- phase narration + start cue + countdown guidance + end cue 的音訊流程
- 在沒有專用語音素材的日子，也要維持可用的 fallback 體驗

### 已完成到哪裡
目前已完成：

- timetable / summary / timer 基本功能
- 手動切換任一天課表
- 日程表改為位於「今日流程預覽」下方，且支援單週切換瀏覽
- monotonic countdown scheduling
- phase intro / cue / end cue 流程
- 倒數中 guidance 的 `timeline-events-v1` 資料驅動播放
- 完整第一週語音庫（W1D1～W1D7）
- `2026-05-04`（W2D1）library manifest 已建立，沿用 `2026-04-27` 的凱格爾普通日資產
- library-only audio routing：**不再有 `audio/today` 特例**
- `audio/today/` 已從 repo 完全移除
- 首頁靜態教育區塊：`興奮度差異與分辨方式`
- GitHub Pages 正式站可直接使用，push-to-main 會更新 live

### 目前沒有卡住的 blocker

- 無未解 blocker
- 無待恢復的半成品修改
- repo 在這次 commit 前仍處於可測試、可提交狀態

---

## 本次整理確認到的重點

### 1. handoff 維持固定追蹤 + dated 快照

- `docs/plans/project-status-handoff.md` 為單一追蹤檔
- `docs/plans/2026-05-04-project-status-handoff.md` 保留本次快照

### 2. `audio/today` 已經正式退場

目前 runtime 規則：

- app 只透過 `audio/library/index.json` 判斷某日期是否有專用語音
- 有對應條目 → 載入 `audio/library/<date>/manifest.json`
- 沒有對應條目 → 退回 cue-only + 文字腳本 fallback

### 3. 第一週語音庫已完整補齊，W2D1 也已接上 library coverage

目前 `audio/library/index.json` 已收錄：

- `2026-04-27`
- `2026-04-28`
- `2026-04-29`
- `2026-04-30`
- `2026-05-01`
- `2026-05-02`
- `2026-05-03`
- `2026-05-04`

### 4. 目前 live 日期已進入第二週，今天預設已有專用語音

以 `timer-core.js` live 計算確認：

- `2026-05-04` → `W2D1`
- session title：`凱格爾普通日`
- `audio/library/2026-05-04/manifest.json` 已建立
- 預設載入今天時，會直接命中該 manifest，而不是 fallback

### 5. 日程表已改為單週切換 UI

目前首頁的日程表行為是：

- 區塊位置移到 **「今日流程預覽」下方**
- 上方有 **第 1 週～第 6 週**切換按鈕
- 每次只顯示 **當前瀏覽週的 7 天**
- 切換週次 **只改變可見內容，不會立刻切換課表**
- 必須再點選該週某一天，才會真正切換 today summary / timer / narration 狀態

這個 UX 已有單元測試、app-flow 測試與 browser smoke test 鎖住。

---

## 目前產品行為基線

以下行為之後重構時 **不能隨便破壞**：

1. 切換日程時，必須停止舊播放並重設目前 session state
2. 切到已有專用語音素材的日子時，必須改載入對應 `audio/library/<date>/manifest.json`
3. 切到沒有專用語音素材的日子時，UI 要退回文字腳本模式
4. 沒有專用語音素材的日子，開始前也要先播放開始 cue
5. pause 後 resume，只能重播開始 cue，不應重播整段 narration
6. skip 到下一段前，要先取消／停止舊播放
7. 過期或被取消的 async playback，不可以回頭覆寫新的 UI 狀態
8. phase intro 的 promise 必須等實際播完，而不是只等 `audio.play()` resolve
9. countdown 使用 monotonic clock；heartbeat 延遲時要 catch up，不是單純慢一拍
10. 如果使用者要求「phase 一開始就講某件事」，**一定要檢查 `timelineEvents`，不要只改文案**
11. **不再有 `audio/today` 特例**；manifest 才是 source of truth
12. 切換日程表週次時，只能改變 `visibleWeekNumber`，不能直接改掉目前課表
13. 只有點選某一天時，才會切換 `selectedDayOffset` 與整體 session state

---

## 目前架構重點

### 核心模組

- `app.js`
- `dom-refs.js`
- `schedule-view.js`
  - 日程表與摘要 render（含單週切換 tab 與單週 7 天列表）
- `timer-view.js`
- `session-controller.js`
- `timeline-orchestrator.js`
- `audio-engine.js`
- `audio-player.js`
- `narration-manifest.js`
- `timer-core.js`

### 語音素材結構

```text
audio/
├── fx/
├── schema/
└── library/
    ├── index.json
    ├── 2026-04-27/
    ├── 2026-04-28/
    ├── 2026-04-29/
    ├── 2026-04-30/
    ├── 2026-05-01/
    ├── 2026-05-02/
    ├── 2026-05-03/
    └── 2026-05-04/
```

---

## 目前測試與驗證狀態

### 自動測試

```bash
npm test
```

結果：**59/59 pass**

### 這次已做的驗證

1. **日程表位置驗證**
   - `tests/static-page-content.test.js` 確認日程表位於「今日流程預覽」之後
2. **單週切換 render 驗證**
   - `tests/phase1-modules.test.js` 確認只顯示當前瀏覽週的 7 天，且週 tab 狀態正確
3. **app 互動驗證**
   - `tests/app-flow.test.js` 確認切換週次不改課表，點選某一天後才真正切換
4. **browser smoke test**
   - 本機畫面確認第 3 週 tab 只顯示 dayOffset `14~20`
   - 點選第 3 週第 1 天後，today summary 會改為 `第 3 週・第 1 天（週一）`
   - console 無 JS error

---

## 最近關鍵 commit 速查

- `54b37d4` — `feat: add W2D1 narration library manifest`
- `acae419` — `docs: unify handoff tracking flow`
- `a58fe3e` — `docs: refresh project handoff to 2026-05-02 (library-only routing, W1 full week)`
- `7501130` — `feat: add voice library for W1D6 (kegel adaptive) and W1D7 (rest day)`
- `04b99d0` — `refactor: remove legacy audio/today assets`

---

## 建議的新 session 起手式

1. 先看 `docs/plans/project-status-handoff.md`
2. 再看 `README.md`
3. 跑一次 `npm test`
4. 若要改首頁排版／日程表互動，再讀：
   - `index.html`
   - `styles.css`
   - `schedule-view.js`
   - `session-controller.js`
   - `timer-core.js`
   - `tests/app-flow.test.js`
   - `tests/phase1-modules.test.js`
   - `tests/static-page-content.test.js`

這份保留作為 2026-05-04 17:22 CST 的快照紀錄。
