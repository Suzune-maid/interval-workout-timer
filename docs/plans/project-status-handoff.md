# Project status handoff

> 這是目前的 **單一追蹤 handoff**。之後若要更新專案現況，請優先更新這份檔案。
>
> Last updated: **2026-05-05 15:26 CST**
>
> 本次 dated 記錄：`docs/plans/2026-05-05-project-status-handoff.md`

## TL;DR

- **主要分支**：`main`
- **測試基線**：`npm test` → **69/69 pass**
- **語音庫覆蓋**：第一週 W1D1～W1D7（`2026-04-27`～`2026-05-03`）＋ W2D1～W2D2（`2026-05-04`～`2026-05-05`）
- **正式站**：<https://suzune-maid.github.io/interval-workout-timer/>
- **部署方式**：GitHub Pages branch-based deployment；push 到 `main` 後自動上線（有 propagation delay）
- repo 內**沒有** `.github/workflows` deploy pipeline
- `audio/today/` 已自 repo 移除
- runtime 語音路由目前是 **library-only**
- 若 selected day 沒有 library manifest，app 會退回 **文字腳本 + start cue** fallback
- 以 live code 確認：**2026-05-05 = W2D2 = 正式訓練日**；現已補上完整 W2D2 library manifest，預設載入會命中 `audio/library/2026-05-05/manifest.json`

---

## 這份文件的定位

從這次開始，handoff 改成兩層：

1. **固定追蹤檔**：`docs/plans/project-status-handoff.md`
   - 持續覆蓋更新
   - 給之後的新 session 當主入口
2. **當次紀錄檔**：`docs/plans/YYYY-MM-DD-project-status-handoff.md`
   - 保留該次更新時點的快照
   - 不作為長期主入口

簡單說：
- **要看最新狀態** → 看這份
- **要回頭查某次快照** → 看 dated 記錄檔

## handoff 維護規則（固定流程）

不要靠「記得」；之後每次整理 handoff，都照這個固定流程做：

1. 先複製或另存一份 dated 快照：`docs/plans/YYYY-MM-DD-project-status-handoff.md`
2. 再更新這份 `docs/plans/project-status-handoff.md`
3. `README.md` 不需要跟著改；它永遠只指向 canonical handoff
4. dated 快照是歷史紀錄，不作為主入口

如果某次只改 dated 檔、沒同步更新 canonical，視為流程不完整。

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
- full intro 模式的 start cue 與第 0 秒 countdown guidance 已錯開約 300ms，避免手機上聽感太擠或互相蓋住
- 倒數中 guidance 的 `timeline-events-v1` 資料驅動播放
- 完整第一週語音庫（W1D1～W1D7）
- `2026-05-04`（W2D1）library manifest 已建立，沿用 `2026-04-27` 的凱格爾普通日資產
- `2026-05-05`（W2D2）正式訓練日 library manifest 已建立：5 段 phase narration + 29 句 countdown guidance，共 34 個 WAV
- mobile screen wake lock：訓練開始時會要求 `navigator.wakeLock`，暫停、重設、切日或完成時會釋放
- library-only audio routing：**不再有 `audio/today` 特例**
- `audio/today/` 已從 repo 完全移除
- 首頁靜態教育區塊：`興奮度差異與分辨方式`
- GitHub Pages 正式站可直接使用，push-to-main 會更新 live

### 目前沒有卡住的 blocker

- 無未解 blocker
- 無待恢復的半成品修改
- repo 在本次整理前已確認 branch 與 `origin/main` 同步、工作樹乾淨

---

## 目前最重要的狀態變更

### 1. handoff 文件改成固定追蹤 + dated 快照
這次整理後：

- `docs/plans/project-status-handoff.md` → 單一追蹤檔
- `docs/plans/2026-05-05-project-status-handoff.md`
- `docs/plans/2026-05-04-project-status-handoff.md` → 本次紀錄快照

之後不要再把新的專案總覽 handoff 分散成多份互相接棒的主文件。

### 2. `audio/today` 已經正式退場
目前 runtime 規則是：

- app 只透過 `audio/library/index.json` 判斷某日期是否有專用語音
- 有對應條目 → 載入 `audio/library/<date>/manifest.json`
- 沒有對應條目 → 退回 cue-only + 文字腳本 fallback

也就是：
- `audio/today/` 已不是來源
- 若文件還提到 `audio/today`，應視為歷史脈絡，不是目前實作

### 3. 第一週語音庫已完整補齊，W2D1～W2D2 也已接上 library coverage
目前 `audio/library/index.json` 已收錄：

- `2026-04-27` — W1D1 — 凱格爾普通日
- `2026-04-28` — W1D2 — 正式訓練日
- `2026-04-29` — W1D3 — 放鬆日
- `2026-04-30` — W1D4 — 凱格爾普通日（複用 W1D1）
- `2026-05-01` — W1D5 — 正式訓練日（混合重用）
- `2026-05-02` — W1D6 — 凱格爾普通日（可依狀態改放鬆，複用 W1D1）
- `2026-05-03` — W1D7 — 休息／輕放鬆日（全新生成）
- `2026-05-04` — W2D1 — 凱格爾普通日（metadata 屬於該日，資產沿用 `2026-04-27`）
- `2026-05-05` — W2D2 — 正式訓練日（新生 W2D2 高原維持語音，5 段 narration + 29 句 guidance）

### 4. 目前 live 日期已進入 W2D2，今天預設已有正式訓練日專用語音
以 `timer-core.js` live 計算確認：

- `2026-05-05` → `W2D2`
- session title：`正式訓練日`
- `audio/library/2026-05-05/manifest.json` 已建立
- 預設載入今天時，會直接命中該 manifest，而不是 fallback

這點會影響 smoke test 與後續語音素材規劃：

- **預設載入（2026-05-05）現在應顯示 W2D2 專用語音資訊**
- fallback 驗證需改用其他尚未收錄的日期，不要再把 5/4 或 5/5 當成 fallback 範例

### 5. 日程表已改為單週切換 UI
目前首頁的日程表行為是：

- 區塊位置移到 **「今日流程預覽」下方**
- 上方有 **第 1 週～第 6 週**切換按鈕
- 每次只顯示 **當前瀏覽週的 7 天**
- 切換週次 **只改變可見內容，不會立刻切換課表**
- 必須再點選該週某一天，才會真正切換 today summary / timer / narration 狀態

這個 UX 已有單元測試、app-flow 測試與 browser smoke test 鎖住。

### 6. W2D2 正式訓練日語音已完成，但有 2 個 fallback 產物
`2026-05-05` 的語音素材已補齊：

- 5 個 phase narration WAV
- 29 個 countdown guidance WAV
- 合計 34 個 WAV，總長約 241.62 秒
- `audio/library/index.json` 已新增 `2026-05-05`
- `audio/library/2026-05-05/manifest.json` 記錄 `ttsStyle` / `ttsActualStyle` / hash / duration

生成時 `google/gemini-3.1-flash-tts-preview` 對少數短句曾回 empty payload；使用者 review 後，`phase-01-guidance-02` 與 `phase-01-guidance-04` 已重新生成並替換：

- `phase-01` / `breath-scan-soften`：重新生成完整句，避免尾端截斷
- `phase-01` / `ready-for-six`：重新生成為 Gemini / Leda 版本，不再使用 Hermes edge fallback
- `phase-03` / `finish-controlled`：仍複用同 phase 前一句 `phase-03-guidance-06.wav`，文字稿同步為同一句

目前 manifest 只剩 1 個受控 fallback：`phase-03` / `finish-controlled`。若之後要追求語氣一致，可再單獨重生這一句。

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
12. mobile 使用時，開始訓練必須取得 screen wake lock；暫停、重設、切日或完成時必須釋放

建議優先關注的測試檔：

- `tests/app-flow.test.js`
- `tests/timeline-orchestrator.test.js`
- `tests/narration-manifest.test.js`
- `tests/screen-wake-lock.test.js`
- `tests/static-page-content.test.js`

---

## 目前架構重點

### 核心模組

- `app.js`
  - 頁面組裝層；負責初始化、事件綁定與把 session / view / orchestrator / audio 串起來
- `dom-refs.js`
  - 主要 DOM refs 收斂
- `schedule-view.js`
  - 日程表與摘要 render（含單週切換 tab 與單週 7 天列表）
- `timer-view.js`
  - timer、phase plan、narration / guidance 狀態 render
- `session-controller.js`
  - selected day、fallback narration 與 session state 切換
- `timeline-orchestrator.js`
  - phase progression、倒數、pause/resume、skip/cancel、monotonic scheduling
- `audio-engine.js`
  - track-based audio abstraction
- `audio-player.js`
  - narration / cue / guidance 播放相容 wrapper
- `narration-manifest.js`
  - `timeline-events-v1` 正規化與 legacy 相容檢視
- `screen-wake-lock.js`
  - `navigator.wakeLock` controller；訓練中保持螢幕喚醒、暫停／重設／切日／完成時釋放，頁面回可見時可重取
- `timer-core.js`
  - 日期、課表、phase、session 等純資料邏輯

### 語音素材結構

```text
audio/
├── fx/
│   ├── countdown-start.wav
│   └── countdown-end.wav
├── schema/
│   └── timeline-event.schema.json
└── library/
    ├── index.json
    ├── 2026-04-27/
    ├── 2026-04-28/
    ├── 2026-04-29/
    ├── 2026-04-30/
    ├── 2026-05-01/
    ├── 2026-05-02/
    ├── 2026-05-03/
    ├── 2026-05-04/
    └── 2026-05-05/
```

每個日期資料夾格式：

```text
audio/library/<date>/
├── manifest.json
├── texts/
├── generated/
└── guidance/
```

值得特別看的素材範例：

- `audio/library/2026-05-01/manifest.json`
  - formal day 混合重用範例
- `audio/library/2026-05-03/manifest.json`
  - 單 phase 休息／輕放鬆日範例
- `audio/library/index.json`
  - app 的日期 → manifest source of truth
  - 目前已收錄 `2026-04-27`～`2026-05-05`

---

## 目前測試與驗證狀態

### 自動測試

```bash
npm test
```

結果：**69/69 pass**

### 本機 smoke test 建議

```bash
cd /home/atmjin/.hermes/archive/github/interval-workout-timer
python3 -m http.server 8124
```

打開：<http://127.0.0.1:8124/>

建議至少驗這五種情境：

1. **預設載入（2026-05-05）**
   - 今天是 W2D2，應直接載入 `audio/library/2026-05-05/manifest.json`
   - UI 應顯示 W2D2 正式訓練日專用語音資訊，而不是 fallback 文案
2. **切換日程表週次**
   - 切到第 3 週後，日程表只應顯示該週 7 天
   - today summary / timer 不應立刻改變
3. **在切換後的週次中點某一天**
   - 確認 today summary / timer / narration 狀態才真正切換到該日
4. **切到 2026-05-01**
   - 正式訓練日，有分數判斷 guidance
5. **切到 2026-05-03**
   - 休息日，單 phase 呼吸放鬆
6. **切到尚未收錄 library 的日期**
   - 確認會退回開始音效 + 文字腳本 fallback 模式
7. **按下開始**
   - 確認 `2026-05-05` 會先播 W2D2 phase narration，再進 start cue / 倒數 guidance
8. **手機螢幕喚醒**
   - 支援 Wake Lock API 的瀏覽器中，按開始後應呼叫 `navigator.wakeLock.request('screen')`
   - 暫停、重設、切日或完成時應釋放 wake lock

若要抓更硬的證據，可 monkeypatch `HTMLMediaElement.play()` 觀察播放順序，或 monkeypatch `navigator.wakeLock` 觀察 request / release。

### Live 驗證現況

- 正式站：<https://suzune-maid.github.io/interval-workout-timer/>
- push 到 `main` 後 GitHub Pages 會更新內容
- 有 propagation delay（通常 10～60 秒以上）

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
4. 開正式站檢查 marker / 行為是否已更新

---

## 重要經驗與注意事項

### 1. `HTMLMediaElement.play()` resolve 不等於播完

- `await audio.play()` 只表示瀏覽器接受開始播放
- **不表示音檔已完整播放完畢**
- 流程必須等 `ended` / `error`

### 2. narration 與 start cue 是不同層的語意

- narration 是 narration
- cue 是 cue
- fallback day 沒有 narration，不代表不需要 cue

### 3. stale async 很容易覆寫新 UI

這個專案有許多：

- 切日
- skip
- reset
- pause / resume
- async 音訊播放等待

一定要有 sequence id / cancellation guard。

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

當語音重用時（如 `2026-05-02` → `2026-04-27`），manifest 中所有 `audioFile` / `textFile` 路徑指向原始素材目錄是正確的；新 manifest 主要改 metadata。

### 8. 第二週之後的日期要重新看 library 覆蓋範圍

目前已補到：

- `2026-05-04`（W2D1）已有 library manifest
- `2026-05-05`（W2D2）已有完整正式訓練日 library manifest
- 之後的第二週日期是否已有 coverage，仍要先查 `audio/library/index.json`

所以：

- 不要把「第二週都還沒有 library」當成前提
- 但也不要直接假設後續日期已全補齊
- 新增第二週素材前，先查 `audio/library/index.json`

### 9. 日程表互動現在分成「瀏覽週次」與「切換日期」兩層

目前 `session-controller` / `timer-core` 將日程表狀態拆成：

- `visibleWeekNumber`：只控制日程表目前顯示哪一週
- `selectedDayOffset`：真正決定 today summary / timer / narration 的選取日

這代表：

- 切換週次 tab 時，不應順手改掉目前課表
- 只有點選某一天時，才會切換 session state
- 後續若調整 schedule UX，不能把這兩層狀態重新混在一起

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

## 目前值得知道的檔案入口

### 如果要理解產品目前狀態

- `README.md`
- `docs/plans/project-status-handoff.md`（這份，固定追蹤）
- `docs/plans/2026-05-05-project-status-handoff.md`（本次快照）
- `index.html`（首頁日程表區塊位置與週切換 UI）

### 如果要改 phase flow / audio 行為

- `app.js`
- `timeline-orchestrator.js`
- `audio-player.js`
- `audio-engine.js`
- `tests/app-flow.test.js`
- `tests/timeline-orchestrator.test.js`

### 如果要改語音素材 / manifest

- `audio/library/index.json`
- `audio/library/2026-05-05/manifest.json`（W2D2 正式訓練日完整高原維持語音參考）
- `audio/library/2026-05-01/manifest.json`（混合重用參考）
- `audio/library/2026-05-03/manifest.json`（單 phase 休息日參考）
- `narration-manifest.js`
- `tests/narration-manifest.test.js`
- `docs/plans/2026-05-02-voice-plan.md`（歷史規劃參考，不是目前狀態主文件）

### 如果要改首頁靜態說明內容

- `index.html`
- `styles.css`
- `tests/static-page-content.test.js`

---

## 歷史紀錄檔

以下檔案保留作為歷史快照：

- `docs/plans/2026-05-05-project-status-handoff.md`
- `docs/plans/2026-05-04-project-status-handoff.md`
- `docs/plans/2026-05-02-project-status-handoff.md`
- `docs/plans/2026-04-29-project-status-handoff.md`

之後若再整理 handoff：

- 更新 **這份 canonical file**
- 另外再存一份新的 dated snapshot

---

## 建議的新 session 起手式

1. 先看這份文件：`docs/plans/project-status-handoff.md`
2. 再看 `README.md`
3. 跑一次：`npm test`
4. 若是改 flow / audio：先讀
   - `app.js`
   - `timeline-orchestrator.js`
   - `audio-player.js`
   - `tests/app-flow.test.js`
5. 若是改語音素材／manifest：再讀
   - `audio/library/index.json`
   - `narration-manifest.js`
   - `tests/narration-manifest.test.js`
6. 若是改首頁說明內容：再讀
   - `index.html`
   - `styles.css`
   - `tests/static-page-content.test.js`
7. 若要回看某次整理當下的狀態，再找對應 dated handoff

照這個順序通常能最快進入可動手的狀態。
