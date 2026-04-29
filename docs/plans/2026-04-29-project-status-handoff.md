# 2026-04-29 Project status handoff

> 目的：讓之後的新 session 能在 3～5 分鐘內理解這個 repo 的目前狀態、最近完成的工作、還沒做的事，以及容易踩到的坑。

## TL;DR

- 目前分支：`main`
- git 狀態：`main...origin/main [ahead 3]`
- working tree：乾淨（本文件建立前）
- 最新 commit：`2c29ec6` — `[verified] fix: play start cue on fallback narration days`
- 目前測試基線：`npm test` **48/48 pass**
- 已建立的語音庫日期：`2026-04-27`、`2026-04-28`
- 目前沒有未完成中的 code change；最近這輪主要是把「沒有專用旁白的日子也要先播開始音效」補齊並鎖進 regression test。

---

## 最近完成的重點進度

### 1. 正式訓練日語音素材已落地
近期已完成 2026-04-28 正式訓練日的正式 guidance 音檔與 manifest 串接，相關基礎已存在於：

- `audio/today/narration-manifest.json`
- `audio/today/narration-source.json`
- `audio/library/2026-04-28/manifest.json`
- `audio/library/index.json`

### 2. 已移除過時 roadmap 文件
已刪除舊的 audio architecture refactor roadmap，避免之後 session 誤以為那份 roadmap 還在進行中。

對應 commit：
- `af78a29` — `docs: remove completed refactor roadmap`

### 3. 已修正 fallback narration day 的開始音效 bug
使用者回報：「倒數開始時沒有播放開始音效」。

根因不是 cue 檔不存在，而是**流程判斷把『有沒有專用旁白』跟『要不要播開始 cue』綁在一起**。因此像放鬆日／只有文字腳本的日子，會直接開始倒數，漏掉 `countdown-start.wav`。

這個問題已修好，並已補 regression test。

對應 commit：
- `2c29ec6` — `[verified] fix: play start cue on fallback narration days`

---

## 目前產品行為摘要

### 已確認正常的核心行為
- 依起始日自動定位今天對應的 6 週課表
- 可從日程表切換到任一天
- 切換日程時，會重設 session state、停止舊播放，避免沿用上一天的狀態
- **有專用旁白的 phase**：先播 phase narration，再播開始音效，之後才開始倒數
- **沒有專用旁白的 phase**：至少還是會先播開始音效，再開始倒數
- 暫停後恢復只會重播開始音效，不會把整段 phase narration 從頭重播
- 每段倒數結束時會播結束音效，再切到下一段
- 倒數使用 monotonic scheduling；heartbeat 延遲時會自動追秒，不會整段節奏越跑越慢
- 倒數中的 guidance 已改由 `timeline-events-v1` 的 `timelineClips` / `timelineEvents` 驅動

### 目前已鎖住的重要 regression 行為
建議未來若再改 flow，優先看這些測試是否仍成立：

- `tests/app-flow.test.js`
- `tests/timeline-orchestrator.test.js`

特別重要的基線：
- 切換到沒有專用語音素材的日子時，UI 要退回文字腳本模式
- 沒有專用語音素材的日子，開始前也要先播開始音效
- 暫停恢復不能重播整段 phase narration
- skip 下一段前要先取消／停止舊播放
- 過期的 async playback 不能回頭覆寫新的 UI 狀態

---

## 目前程式結構重點

### 核心模組
- `app.js`
  - 頁面組裝層；把 DOM、session、timeline、audio 串在一起
- `timeline-orchestrator.js`
  - phase progression、倒數、pause/resume、skip、cancel、monotonic scheduling
- `audio-player.js`
  - narration / cue 播放相容層；內部接 audio engine
- `audio-engine.js`
  - track-based audio abstraction
- `session-controller.js`
  - selected day 與 session state 切換
- `timer-core.js`
  - phase / session 純資料邏輯
- `narration-manifest.js`
  - `timeline-events-v1` 正規化與 legacy 相容檢視

### 主要測試檔
- `tests/app-flow.test.js`
  - fake DOM / fake timer / fake Audio 層級的 app regression tests
- `tests/timeline-orchestrator.test.js`
  - phase flow、skip、pause/resume、monotonic clock 等邏輯

---

## 最近一次 bugfix 的實際修點

### 修改檔案
- `app.js`
- `audio-player.js`
- `timeline-orchestrator.js`
- `tests/app-flow.test.js`

### 修法摘要
1. `timeline-orchestrator.js`
   - 不再用 `hasNarrationAudio()` 直接決定是否播放 phase intro
   - 改成：
     - 有旁白 → `full`
     - 無旁白 → `cue-only`
   - 只要 player 可用，就會先跑 phase intro 流程（至少播開始 cue）

2. `audio-player.js`
   - `playPhaseIntro()` 即使找不到 phase narration entry，也不直接中止 cue-only 路徑
   - `full` 模式只有在 `entry.audioFile` 存在時才播 phase narration
   - cue 可以獨立存在，不該依賴 narration entry 是否存在

3. `app.js`
   - UI 文案改為能區分：
     - 有旁白的開始
     - 無旁白但有 cue 的開始
     - resume 狀態
   - `onPhaseIntroFinished()` 在 fallback day 會用目前 phase label，而不是盲信 entry label

4. `tests/app-flow.test.js`
   - 新增測試：`沒有專用語音的日子開始倒數前，也會先播放開始音效`

---

## 驗證方式（下次要接手時很有用）

### 自動測試
```bash
cd /home/atmjin/.hermes/archive/github/interval-workout-timer
npm test
```

預期：`48/48 pass`

### 本機瀏覽器 smoke test
```bash
cd /home/atmjin/.hermes/archive/github/interval-workout-timer
python3 -m http.server 8124
```

打開：<http://127.0.0.1:8124/>

建議驗證兩種情境：
1. **正式訓練日**（例如 4/28）
   - 應先播階段旁白＋開始 cue，再開始倒數
2. **放鬆日／沒有專用旁白的日子**（例如 4/29）
   - 應先播開始 cue，再開始倒數
   - 不應直接跳進倒數

如果要抓更硬的證據，可在 browser console monkeypatch `HTMLMediaElement.play()`，看實際播放順序。

---

## 經驗與注意事項

### 1. `HTMLMediaElement.play()` resolve 不等於播完
這個專案之前踩過一次很關鍵的坑：

- `await audio.play()` 只代表瀏覽器接受開始播放
- **不代表音訊已播完**

如果邏輯需要「等旁白或 cue 播完再開始倒數」，一定要等 `ended` / `error` 事件，而不是只等 `play()` promise resolve。

### 2. 「沒有專用旁白」不等於「不需要開始 cue」
這次 bug 的核心教訓就是：

- narration 是 narration
- start cue 是 start cue
- 兩者在產品語意上是不同層

不要再用 `hasNarrationAudio()` 當成是否播放開始 cue 的唯一判斷。

### 3. 改 flow 時要小心 stale async UI overwrite
這個專案有很多「先開始一段 async 播放，後來使用者又切日／skip／reset」的情境。

如果沒有 sequence id 或 cancellation guard，舊的 async 完成後很容易把新的畫面狀態覆寫回去。

### 4. app-flow regression tests 很值得先補再改
這個 repo 的 UI / audio / timer 交互很多，肉眼看起來小改，實際常常牽動 phase flow。

如果未來又要改：
- phase start 行為
- pause/resume
- skip
- fallback narration

建議先在 `tests/app-flow.test.js` 補 regression test，再改實作。

### 5. README 容易變成半新半舊
這個 repo 最近變動快，README 的「測試數量」或「行為描述」很容易落後。

如果又新增測試或改變流程，記得同步 README，否則下個 session 很容易被舊 baseline 誤導。

---

## 目前還沒做、但之後可能值得補的事

這些不是 blocker，但可能是下一輪值得考慮的工作：

1. 補一個測試：`player 不可用` 或 `start cue 停用` 時，UI 文案是否仍正確
2. 把 skip / reset / 切日相關的狀態文案，統一改成共用同一個 cue 可用性訊號
3. 若未來要擴充更多日期語音，記得 today / library / index / tests 一起更新
4. 如果未來要做 live 驗證，除了本機 smoke test，也可再補 GitHub Pages 的頁面行為確認

---

## 建議的新 session 起手式

如果下次是全新 session，要快速接手，建議順序：

1. 先看這份文件：`docs/plans/2026-04-29-project-status-handoff.md`
2. 再看 `README.md`
3. 跑一次：`npm test`
4. 如果要改 phase flow / audio 行為，先讀：
   - `app.js`
   - `timeline-orchestrator.js`
   - `audio-player.js`
   - `tests/app-flow.test.js`
5. 如果是語音素材／manifest 問題，再讀：
   - `audio/today/narration-manifest.json`
   - `audio/library/index.json`
   - `narration-manifest.js`

這樣通常可以在最短時間內接回正確上下文。
