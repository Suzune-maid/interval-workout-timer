# 2026-05-04 Project status handoff

> 這是 **2026-05-04 當次紀錄快照**。
>
> 之後若要看最新狀態，請以 `docs/plans/project-status-handoff.md` 為主；這份只保留作為本次整理時點的記錄。
>
> Snapshot time: **2026-05-04 16:38 CST**

## TL;DR

- **主要分支**：`main`
- **測試基線**：`npm test` → **54/54 pass**
- **語音庫覆蓋**：第一週 W1D1～W1D7（`2026-04-27`～`2026-05-03`）＋ `2026-05-04`（W2D1）
- **正式站**：<https://suzune-maid.github.io/interval-workout-timer/>
- **部署方式**：GitHub Pages branch-based deployment；push 到 `main` 後自動上線（有 propagation delay）
- repo 內**沒有** `.github/workflows` deploy pipeline
- `audio/today/` 已自 repo 移除
- runtime 語音路由目前是 **library-only**
- 若 selected day 沒有 library manifest，app 會退回 **文字腳本 + start cue** fallback
- 以 live code 確認：**2026-05-04 = W2D1 = 凱格爾普通日**；現已補上對應 library manifest，預設載入會命中 `audio/library/2026-05-04/manifest.json`

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
- repo 在本次整理前已確認 branch 與 `origin/main` 同步、工作樹乾淨

---

## 本次整理確認到的重點

### 1. handoff 改成固定追蹤 + dated 快照

- 新增 `docs/plans/project-status-handoff.md` 作為單一追蹤檔
- 保留 `docs/plans/2026-05-04-project-status-handoff.md` 作為本次紀錄

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

---

## 目前架構重點

### 核心模組

- `app.js`
- `dom-refs.js`
- `schedule-view.js`
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

結果：**54/54 pass**（本快照更新前的既有基線）

### 本機 smoke test 建議

1. **預設載入（2026-05-04）** → 應直接顯示專用語音資訊
2. **切到 2026-05-01** → 正式訓練日，有分數判斷 guidance
3. **切到 2026-05-03** → 單 phase 休息日
4. **切到尚未收錄 library 的日期** → 應回到 fallback 狀態文案
5. **按下開始** → `2026-05-04` 應先播 phase narration，再進 cue / 倒數

---

## 最近關鍵 commit 速查

- `a58fe3e` — `docs: refresh project handoff to 2026-05-02 (library-only routing, W1 full week)`
- `7501130` — `feat: add voice library for W1D6 (kegel adaptive) and W1D7 (rest day)`
- `04b99d0` — `refactor: remove legacy audio/today assets`
- `779f4cd` — `[verified] fix: load library narration on day switch`
- `2af76c0` — `feat: add 2026-05-01 formal day arousal guidance`
- `fdbccf9` — `feat: add 2026-04-30 reused narration manifest`
- `cd24038` — `[verified] feat: add 2026-04-29 relax day narration`

---

## 建議的新 session 起手式

1. 先看 `docs/plans/project-status-handoff.md`
2. 再看 `README.md`
3. 跑一次 `npm test`
4. 依需求再進入 flow / audio / manifest / 靜態內容相關檔案

這份保留作為 2026-05-04 整理時點的快照紀錄。
