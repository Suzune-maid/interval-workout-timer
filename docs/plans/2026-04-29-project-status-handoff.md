# 2026-04-29 Project status handoff

> 目的：讓之後的新 session 能在 3～5 分鐘內理解這個 repo 的**目前狀態、最近進度、已知基線、部署方式、驗證流程與實戰經驗**，避免重新踩同一批坑。

## TL;DR

- 目前分支：`main`
- git 狀態：`main...origin/main`
- working tree：乾淨
- 最新 commit：`82ec697` — `[verified] feat: add arousal level guide section`
- 目前測試基線：`npm test` **49/49 pass**
- 已建立的語音庫日期：`2026-04-27`、`2026-04-28`、`2026-04-29`
- 正式站：<https://suzune-maid.github.io/interval-workout-timer/>
- 部署方式：GitHub Pages branch-based deployment，**push 到 `main` 後會自動上線**
- repo 內目前**沒有** `.github/workflows` deploy pipeline
- 目前沒有未完成中的 code change；最近幾輪已把：
  1. fallback narration day 的開始 cue bug 修掉
  2. 2026-04-29 放鬆日整包語音素材補齊
  3. 首頁新增「興奮度差異與分辨方式」區塊

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
截至這份 handoff 更新時，repo 已有：

- timetable / summary / timer 基本功能
- 手動切換任一天課表
- monotonic countdown scheduling
- phase intro / cue / end cue 流程
- 倒數中 guidance 的 `timeline-events-v1` 資料驅動播放
- 2026-04-27、2026-04-28、2026-04-29 三天語音庫
- fallback narration day 的開始 cue 修復與 regression test
- 首頁新增靜態教育區塊：`興奮度差異與分辨方式`
- GitHub Pages 正式站可直接使用，且已驗證 push-to-main 後會更新 live

### 目前沒有卡住的 blocker
- 無未解 blocker
- 無待恢復的半成品修改
- 無本機驗證 server 在跑

---

## 最近完成的重點進度

### 1. fallback narration day 的開始 cue bug 已修復
使用者先前回報：「某些日子倒數開始時沒有播放開始音效。」

根因不是音檔缺失，而是流程判斷把：

- `是否有專用旁白` 與
- `是否需要播放開始 cue`

錯誤綁在一起。

因此像沒有專用旁白、只有文字腳本的日子，會直接跳進倒數，漏掉 `countdown-start.wav`。

目前修正後的產品語意是：

- **有專用旁白**：先播 phase narration，再播開始 cue，再開始倒數
- **沒有專用旁白**：至少先播開始 cue，再開始倒數
- **pause 後 resume**：只重播開始 cue，不重播整段 narration

對應 commit：
- `2c29ec6` — `[verified] fix: play start cue on fallback narration days`

### 2. 2026-04-29 放鬆日整包語音已落地
今天課表已確認是：

- 日期：`2026-04-29`
- week/day：`W1D3`
- session：`放鬆日`

已完成：

- 主旁白文字稿
- countdown guidance 文字稿
- WAV 生成
- `audio/today/*`
- `audio/library/2026-04-29/*`
- `audio/library/index.json`
- `tests/narration-manifest.test.js`
- smoke test 與 live 驗證

對應 commit：
- `cd24038` — `[verified] feat: add 2026-04-29 relax day narration`

### 3. 首頁新增「興奮度差異與分辨方式」區塊
這輪又補了一個靜態說明區塊，讓首頁不只顯示訓練流程，也提供辨識興奮度區間的說明。

新增內容包含：

- `4 分`：可重新開始的暖機區
- `6 分`：可控高原區
- `7 分`：需要立刻停手的邊界
- `8 分`：太晚才停的失守區
- `快速判斷` 清單

這次刻意採**靜態內容區塊**做法，避免碰 timer / audio flow。

對應 commit：
- `82ec697` — `[verified] feat: add arousal level guide section`

### 4. 過時 roadmap 已移除
舊的 audio architecture refactor roadmap 已刪掉，避免新 session 誤判那份文件仍在進行中。

對應 commit：
- `af78a29` — `docs: remove completed refactor roadmap`

---

## 目前產品行為基線

以下是之後重構時**不能隨便破壞**的核心行為：

1. 切換日程時，必須停止舊播放並重設目前 session state
2. 切到沒有專用語音素材的日子時，UI 要退回文字腳本模式
3. 沒有專用語音素材的日子，開始前也要先播放開始 cue
4. pause 後 resume，只能重播開始 cue，不應重播整段 narration
5. skip 到下一段前，要先取消／停止舊播放
6. 過期或被取消的 async playback，不可以回頭覆寫新的 UI 狀態
7. phase intro 的 promise 必須等實際播完，而不是只等 `audio.play()` resolve
8. countdown 使用 monotonic clock；heartbeat 延遲時要 catch up，不是單純慢一拍

建議優先關注的測試檔：

- `tests/app-flow.test.js`
- `tests/timeline-orchestrator.test.js`
- `tests/narration-manifest.test.js`
- `tests/static-page-content.test.js`

---

## 目前程式與資料結構重點

### 核心模組
- `app.js`
  - 頁面組裝層；負責初始化、事件綁定與把 session / view / orchestrator / audio 串起來
- `dom-refs.js`
  - 主要 DOM refs 收斂
- `schedule-view.js`
  - 日程表與摘要 render
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
- `timer-core.js`
  - 日期、課表、phase、session 等純資料邏輯

### 語音素材結構
- `audio/today/narration-manifest.json`
  - 今天頁面直接載入的語音清單
- `audio/today/narration-source.json`
  - today 素材來源描述
- `audio/library/index.json`
  - 日期索引，已收錄 `2026-04-27`、`2026-04-28`、`2026-04-29`
- `audio/library/<date>/manifest.json`
  - 對應日期的 phase 文本、檔案、duration、sha256、`timelineClips`、`timelineEvents`
- `audio/today/guidance/`、`audio/library/<date>/guidance/`
  - 倒數中段 guidance 短語音
- `audio/schema/timeline-event.schema.json`
  - timeline/event schema 定義

### 目前首頁靜態內容補充
- `index.html`
  - 已新增 `興奮度差異與分辨方式` 區塊
- `styles.css`
  - 已補 `.arousal-panel` 相關樣式
- `tests/static-page-content.test.js`
  - 用來鎖住新區塊不要被之後改版不小心刪掉

---

## 目前測試與驗證狀態

### 自動測試
目前實測：

```bash
npm test
```

結果：
- `49/49 pass`

這個數字是本次 handoff 更新時重新實跑確認過的，不是沿用舊文件估值。

### 本機 smoke test 建議
```bash
cd /home/atmjin/.hermes/archive/github/interval-workout-timer
python3 -m http.server 8124
```

打開：<http://127.0.0.1:8124/>

建議至少驗兩種情境：

1. **有專用旁白的日子**（例如 4/28）
   - 先播 phase narration + start cue
   - 再開始倒數
2. **fallback narration day**（例如 4/29 或其他沒有專用旁白日）
   - 先播 start cue
   - 不應直接跳進倒數

若要抓更硬的證據，可 monkeypatch `HTMLMediaElement.play()` 看播放順序。

### live 驗證現況
正式站：
- <https://suzune-maid.github.io/interval-workout-timer/>

已確認：
- live 站可正常開啟
- push 到 `main` 後 GitHub Pages 會更新內容
- 但更新有 propagation delay，需要等一下再查，不是 instant

---

## 部署方式與發版事實

### 現在的實際部署方式
這個 repo 目前是：

- GitHub Pages
- branch-based deployment
- 來源分支：`main`
- repo 內**沒有** `.github/workflows` deploy pipeline

換句話說，現在的實際流程是：

```bash
npm test
git push origin main
```

之後 GitHub Pages 會自動重新發佈正式站。

### 這件事怎麼確認的
目前依據有兩類：

1. **事實**
   - GitHub repo API 回傳 `has_pages = true`
   - repo 內找不到 `.github/workflows`
   - 正式站可存取
2. **實測結果**
   - 先前 push `main` 後，正式站內容確實更新
   - 需要短暫輪詢等待 propagation

### 發版後建議流程
1. 先跑 `npm test`
2. `git push origin main`
3. 稍等 10～60 秒以上
4. 開正式站或用 `curl`/browser 檢查 deterministic marker 是否已更新

不要把「push 成功」誤當成「live 已更新完成」。

---

## 重要經驗與注意事項

### 1. `HTMLMediaElement.play()` resolve 不等於播完
這是這個 repo 非常重要的坑。

- `await audio.play()` 只表示瀏覽器接受開始播放
- **不表示音檔已完整播放完畢**

如果流程語意是：

- 先播 narration
- 再播 cue
- 然後才開始倒數

那邏輯就一定要等 `ended` / `error`，不能只等 `play()` promise resolve。

### 2. narration 與 start cue 是不同層的語意
這次 bug 的核心教訓：

- narration 是 narration
- cue 是 cue
- fallback day 沒有 narration，不代表不需要 cue

所以不要再把 `hasNarrationAudio()` 當成「是否要播開始 cue」的唯一開關。

### 3. stale async 很容易覆寫新 UI
這個專案有很多：

- 切日
- skip
- reset
- pause/resume
- async 音訊播放等待

如果沒有 sequence id / cancellation guard，舊流程很容易在完成後回頭覆蓋新畫面狀態。

### 4. 內容型首頁區塊適合加小型靜態測試
這輪新增「興奮度差異與分辨方式」時，用的是：

- 先補 `tests/static-page-content.test.js`
- 再改 `index.html`
- 最後補 `styles.css`

這種做法很適合 FAQ、說明卡、安全提示、分數口訣這類**靜態教育內容**。

因為就算 JS 測試全綠，純 HTML 區塊還是可能在日後 layout 調整時被不小心刪掉。

### 5. README 很容易半新半舊
這個 repo 最近更新密度高，README 最容易落後的是：

- 測試數量
- 已支援的語音庫日期
- GitHub Pages 發版方式
- 近期功能摘要

只要又補了新測試、新日期素材或改了部署／流程，記得同步 README，不然下一個 session 很容易被舊 baseline 誤導。

### 6. GitHub Pages 驗證不要只看 push 成功
這個 repo 目前不是自訂 CI deploy pipeline，而是直接靠 Pages 發佈。

所以發版驗證的正確心態是：

- `git push` 成功 ≠ live 一定已更新
- 要另外檢查正式站內容
- 必要時用 cache-busting query string 或輪詢 deterministic marker

---

## 最近關鍵 commit 速查

- `82ec697` — `[verified] feat: add arousal level guide section`
- `cd24038` — `[verified] feat: add 2026-04-29 relax day narration`
- `75b032f` — `docs: add project status handoff guide`
- `2c29ec6` — `[verified] fix: play start cue on fallback narration days`
- `af78a29` — `docs: remove completed refactor roadmap`

如果之後要理解最近專案怎麼演進，從這幾個 commit 往下看會最快。

---

## 目前值得知道的檔案入口

### 如果要理解產品目前狀態
- `README.md`
- `docs/plans/2026-04-29-project-status-handoff.md`
- `docs/plans/2026-04-29-arousal-level-guide-section.md`

### 如果要改 phase flow / audio 行為
- `app.js`
- `timeline-orchestrator.js`
- `audio-player.js`
- `audio-engine.js`
- `tests/app-flow.test.js`
- `tests/timeline-orchestrator.test.js`

### 如果要改語音素材 / manifest
- `audio/today/narration-manifest.json`
- `audio/today/narration-source.json`
- `audio/library/index.json`
- `audio/library/2026-04-29/manifest.json`
- `narration-manifest.js`
- `tests/narration-manifest.test.js`

### 如果要改首頁靜態說明內容
- `index.html`
- `styles.css`
- `tests/static-page-content.test.js`

---

## 之後可能值得做，但目前不是 blocker 的項目

1. 若之後希望 deploy 狀態更可觀察，可再考慮改成 GitHub Actions Pages workflow
2. 補更多對 `player 不可用` / cue disabled / 異常中止 的 UI regression tests
3. 若語音庫持續擴充，最好把「新增一天素材需要同步更新哪些檔」整理成固定流程文件或 skill
4. 若首頁靜態教育內容越來越多，可考慮把內容區塊切成更明確的 partial / render 結構，但目前還不急

---

## 建議的新 session 起手式

如果下次是全新 session，要最快接回正確上下文，建議順序：

1. 先看這份文件：`docs/plans/2026-04-29-project-status-handoff.md`
2. 再看 `README.md`
3. 跑一次：`npm test`
4. 若是改 flow / audio：先讀
   - `app.js`
   - `timeline-orchestrator.js`
   - `audio-player.js`
   - `tests/app-flow.test.js`
5. 若是改語音素材／manifest：再讀
   - `audio/today/narration-manifest.json`
   - `audio/library/index.json`
   - `narration-manifest.js`
6. 若是改首頁說明內容：再讀
   - `index.html`
   - `styles.css`
   - `tests/static-page-content.test.js`

照這個順序通常能最快進入可動手的狀態。
