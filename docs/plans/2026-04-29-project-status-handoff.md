# 2026-04-29 Project status handoff（updated 2026-05-01）

> 歷史快照：目前統一追蹤檔已改為 `docs/plans/project-status-handoff.md`；這份保留為較早期的紀錄。
>
> 目的：讓之後的新 session 能在 3～5 分鐘內理解這個 repo 的**目前狀態、最近進度、已知基線、部署方式、驗證流程與實戰經驗**，避免重新踩同一批坑。
>
> 備註：這份 handoff 仍沿用舊檔名，是因為 `README.md` 目前直接引用這個路徑；內容已更新到 2026-05-01 當下的最新狀態。

## TL;DR

- 主要分支：`main`
- 建議先用 `git status -sb` / `git log -1 --oneline` 取得你接手當下的 HEAD 與工作樹狀態
- 目前測試基線：`npm test` **50/50 pass**
- 已建立的語音庫日期：`2026-04-27`、`2026-04-28`、`2026-04-29`、`2026-04-30`、`2026-05-01`
- `audio/today/*` 目前指向：`2026-05-01`（W1D5，正式訓練日）
- 正式站：<https://suzune-maid.github.io/interval-workout-timer/>
- 部署方式：GitHub Pages branch-based deployment，**push 到 `main` 後會自動上線**
- repo 內目前**沒有** `.github/workflows` deploy pipeline
- 本輪關鍵更新：
  1. `2026-05-01` 正式訓練日：phase 開場分數判斷 guidance 版本
  2. 切到任一天時，若已有 `audio/library/<date>/manifest.json`，會自動改載入該日專用語音

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
- `2026-04-27`、`2026-04-28`、`2026-04-29`、`2026-04-30`、`2026-05-01` 五天語音庫
- 切到任一天時，若 `audio/library/<date>/manifest.json` 已存在，會優先載入該日專用語音；否則才退回文字 fallback
- fallback narration day 的開始 cue 修復與 regression test
- 首頁新增靜態教育區塊：`興奮度差異與分辨方式`
- `2026-05-01` 正式訓練日的「phase 開場分數判斷 guidance」版本
- GitHub Pages 正式站可直接使用，且已知 push-to-main 會更新 live（但每次仍要等 propagation）

### 目前沒有卡住的 blocker
- 無未解 blocker
- 無待恢復的半成品修改
- 本機若有驗證用 `http.server` 在跑，視為臨時 smoke test 環境，不屬於產品 blocker

---

## 最近完成的重點進度

### 1. fallback narration day 的開始 cue bug 已修復
先前曾修掉一個重要流程 bug：

- **有專用旁白**：先播 phase narration，再播開始 cue，再開始倒數
- **沒有專用旁白**：至少先播開始 cue，再開始倒數
- **pause 後 resume**：只重播開始 cue，不重播整段 narration

對應 commit：
- `2c29ec6` — `[verified] fix: play start cue on fallback narration days`

### 2. 2026-04-29 放鬆日整包語音已落地
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

### 3. 2026-04-30 凱格爾普通日已用重複課表重用模式補齊
live code 已確認：

- `2026-04-30 = W1D4 = 凱格爾普通日`
- 課表與 `2026-04-27 = W1D1` 完全相同

因此這天沒有重跑 TTS，而是直接建立新日期 manifest，資產沿用：

- `audio/library/2026-04-27/generated/*.wav`
- `audio/library/2026-04-27/guidance/*.wav`

已完成：

- `audio/library/2026-04-30/manifest.json`
- `audio/today/narration-manifest.json`
- `audio/today/narration-source.json`
- `audio/library/index.json`
- `tests/narration-manifest.test.js`

對應 commit：
- `fdbccf9` — `feat: add 2026-04-30 reused narration manifest`

### 4. 首頁新增「興奮度差異與分辨方式」區塊
新增內容包含：

- `4 分`：可重新開始的暖機區
- `6 分`：可控高原區
- `7 分`：需要立刻停手的邊界
- `8 分`：太晚才停的失守區
- `快速判斷` 清單

這次刻意採**靜態內容區塊**做法，避免碰 timer / audio flow。

對應 commit：
- `82ec697` — `[verified] feat: add arousal level guide section`

### 5. 2026-05-01 正式訓練日已升級為 phase 開場分數判斷版本
live code 已確認：

- `2026-05-01 = W1D5 = 正式訓練日`
- 課表與 `2026-04-28 = W1D2` 完全相同

但使用者額外要求：
- 在 **phase 剛開始倒數時**，加入當下目標分數的判斷說明

因此這次不是純重用，而是做成**混合重用模式**：

- **phase narration**：沿用 `2026-04-28/generated/*.wav`
- **原本後段 guidance**：沿用 `2026-04-28/guidance/*.wav`
- **每段第一句 guidance**：改用 `2026-05-01` 新生成的 wav
- **phase 5**：原本沒有 guidance，新增 1 句收尾回降提醒

這次新加的 5 句開場 guidance 分別是：

- phase 1：`4 分暖機區`
- phase 2：`5 分判斷`
- phase 3：`6 分可控高原區`
- phase 4：`7 分邊界`
- phase 5：`回到 4 分以下的收尾提醒`

實際 timeline 調整為：

- 每段第一個 `timelineEvents[0].startAtSecond = 4`
- phase 1 後續事件保留 `25 / 55 / 85`
- phase 2 後續事件保留 `45 / 75 / 105 / 135 / 160`
- phase 3 後續事件保留 `55 / 90 / 130 / 170 / 210`
- phase 4 後續事件保留 `75 / 130 / 190`
- phase 5 為新加的單句 event：`4`

已完成：

- `audio/library/2026-05-01/texts/*.txt`（5 個新開場 guidance 文本）
- `audio/library/2026-05-01/guidance/*.wav`（5 個新開場 guidance wav）
- `audio/library/2026-05-01/manifest.json`
- `audio/today/narration-manifest.json`
- `audio/today/narration-source.json`
- `audio/library/index.json`
- `tests/narration-manifest.test.js`
- 本機 browser smoke test

對應 commit：
- `2af76c0` — `feat: add 2026-05-01 formal day arousal guidance`

### 6. 歷史日期若已有 library manifest，切換後會自動改載入該日語音
這輪修正的是一個影響歷史日體驗的行為差異：

- 先前 app 初始化只會載入一次 `audio/today/narration-manifest.json`
- 切到其他日期時，若剛好 session 結構相近，容易沿用錯誤的 today 語音狀態
- 現在會先讀 `audio/library/index.json`
- 若 selected day 對應日期已有 `audio/library/<date>/manifest.json`，就改載入該日 manifest
- 若沒有 library，才回到文字腳本 fallback，但 cue-only 流程仍保留

這次補上的 regression test 會鎖住兩件事：

- `2026-04-30` 這類 reused day 會進入正確的 library 語音模式
- 沒有 library 的日期仍會退回文字模式，且開始前照樣播開始 cue

---

## 目前產品行為基線

以下是之後重構時**不能隨便破壞**的核心行為：

1. 切換日程時，必須停止舊播放並重設目前 session state
2. 切到已有專用語音素材的日子時，必須改載入對應 `audio/library/<date>/manifest.json`，不能沿用 today 或上一天狀態
3. 切到沒有專用語音素材的日子時，UI 要退回文字腳本模式
4. 沒有專用語音素材的日子，開始前也要先播放開始 cue
5. pause 後 resume，只能重播開始 cue，不應重播整段 narration
6. skip 到下一段前，要先取消／停止舊播放
7. 過期或被取消的 async playback，不可以回頭覆寫新的 UI 狀態
8. phase intro 的 promise 必須等實際播完，而不是只等 `audio.play()` resolve
9. countdown 使用 monotonic clock；heartbeat 延遲時要 catch up，不是單純慢一拍
10. 如果使用者要求「phase 一開始就講某件事」，**一定要檢查 timelineEvents，不要只改文案**
11. `audio/today/` 是否顯示某些檔名不重要；**manifest 才是 source of truth**

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
  - 今日預設載入的語音清單；若 selected day 在 `audio/library/index.json` 有對應條目，app 會改載入該日 library manifest
- `audio/today/narration-source.json`
  - today 素材來源描述；目前指向 `2026-05-01`
- `audio/library/index.json`
  - 日期索引；目前已收錄 `2026-04-27`～`2026-05-01`
- `audio/library/<date>/manifest.json`
  - 對應日期的 phase 文本、檔案、duration、sha256、`timelineClips`、`timelineEvents`
- `audio/library/2026-05-01/manifest.json`
  - 值得特別看；它示範了「formal day 混合重用」策略
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
- `50/50 pass`

這個數字是本次 handoff 更新時重新實跑確認過的，不是沿用舊文件估值。

### 2026-05-01 相關測試重點
`tests/narration-manifest.test.js` 目前會驗：

- today 已切到 `2026-05-01`
- phase 1～5 的第一個 guidance event 都在 `4 秒`
- 新的開場分數判斷 clip 與音檔路徑存在
- `audio/library/index.json` 已含 `2026-05-01`
- guided library 的 legacy normalization 測試仍保留

### 本機 smoke test 建議
```bash
cd /home/atmjin/.hermes/archive/github/interval-workout-timer
python3 -m http.server 8124
```

打開：<http://127.0.0.1:8124/>

建議至少驗四種情境：

1. **2026-04-28 formal day**
   - phase narration
   - start cue
   - 舊版 formal guidance
2. **2026-04-29 relax day**
   - 會從 `audio/library/2026-04-29/manifest.json` 進入語音模式
   - 若 manifest 較大，切日後可多等一小段 async render
3. **2026-04-30 reused day**
   - 使用 `2026-04-27` 資產，但日期/課表身份是 `2026-04-30`
4. **2026-05-01 formal day**
   - phase narration
   - `countdown-start.wav`
   - 4 秒左右播新的分數判斷 guidance

若要抓更硬的證據，可 monkeypatch `HTMLMediaElement.play()` 看播放順序。

### 已知 smoke test 小坑
瀏覽器自動 click 有一次沒有真正進入播放流程，但在 page context 直接執行：

```js
document.querySelector('#start-button').click()
```

後就成功觸發。

如果 snapshot 看起來按鈕存在、console 也沒報錯，但播放狀態沒變，先補做 page-context click 驗證，不要太早判定 app 壞掉。

### live 驗證現況
正式站：
- <https://suzune-maid.github.io/interval-workout-timer/>

已知事實：
- GitHub Pages 正常啟用
- push 到 `main` 後 GitHub Pages 會更新內容
- 但更新有 propagation delay，需要等一下再查，不是 instant

每次只要改到語音素材、manifest routing、或首頁靜態內容，都建議再補一次 cache-busting / asset existence check；不要只因為 `git push` 成功，就直接假設 live 已同步完成。

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
   - `origin` 就是 GitHub repo
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
- `await audio.play()` 只表示瀏覽器接受開始播放
- **不表示音檔已完整播放完畢**

如果流程語意是：
- 先播 narration
- 再播 cue
- 然後才開始倒數

那邏輯就一定要等 `ended` / `error`，不能只等 `play()` promise resolve。

### 2. narration 與 start cue 是不同層的語意
- narration 是 narration
- cue 是 cue
- fallback day 沒有 narration，不代表不需要 cue

所以不要把 `hasNarrationAudio()` 當成「是否要播開始 cue」的唯一開關。

### 3. stale async 很容易覆寫新 UI
這個專案有很多：
- 切日
- skip
- reset
- pause/resume
- async 音訊播放等待

如果沒有 sequence id / cancellation guard，舊流程很容易在完成後回頭覆蓋新畫面狀態。

### 4. 內容型首頁區塊適合加小型靜態測試
像 `興奮度差異與分辨方式` 這類 FAQ / 教育內容，適合用小型靜態測試鎖住，不要只依賴 JS 流程測試。

### 5. 以 live code 為準，不要直接相信 handoff / planning 文件
這個 repo 已實際踩過一次：文件摘要很像定案，但真正課表仍要重新用：

```js
resolveProgramDay(startDate, targetDate)
buildDailySession(weekNumber, dayNumber)
```

驗證，才能確定那天到底是什麼 session。

### 6. formal day 若要「一開始就說」，通常要同時改文案與 timeline
如果使用者要求：
- phase 一開始就講分數判斷
- 一開始就提醒呼吸／身體訊號
- 一開始就插入某句 guidance

那通常要一起做：
- 改第一句 guidance 文案
- 把第一個 event 秒數拉到 countdown 起始附近
- 必要時新增原本沒有 guidance 的 phase event

### 7. 5 分通常不是 repo 內既有靜態定義，要自己補運作型口語說明
repo 目前靜態 guide 中明確寫死的是：
- `4 分`
- `6 分`
- `7 分`
- `8 分`

若 phase 目標需要講 `5 分`，通常要自己補成：
- 介於 4 與 6 之間的運作型說明
- 例如：「感覺很清楚，但一停下來還不會自己暴衝」

### 8. `audio/today` 內容可能殘留舊檔，不要只看目錄表面
要判斷今天實際在用什麼，優先看：
- `audio/today/narration-manifest.json`
- `audio/today/narration-source.json`

不是只看 `audio/today/guidance/` 或 `audio/today/generated/` 內有什麼檔案。

### 9. 不要把 TTS 生成過程檔一起 commit
這次 2026-05-01 製作時曾短暫產生：
- 批次輸入 json
- debug json
- summary json

正式 commit 前已刪除。這類 `tts-batches/` 檔案屬於操作中間產物，不該當成產品素材提交。

### 10. README 很容易半新半舊
這個 repo 最近更新密度高，README 最容易落後的是：
- 測試數量
- 已支援的語音庫日期
- GitHub Pages 發版方式
- 近期功能摘要

只要又補了新測試、新日期素材或改了部署／流程，記得同步 README，不然下一個 session 很容易被舊 baseline 誤導。

---

## 最近關鍵 commit 速查

- `2af76c0` — `feat: add 2026-05-01 formal day arousal guidance`
- `fdbccf9` — `feat: add 2026-04-30 reused narration manifest`
- `67508e4` — `docs: refresh deployment notes and project handoff`
- `82ec697` — `[verified] feat: add arousal level guide section`
- `cd24038` — `[verified] feat: add 2026-04-29 relax day narration`
- `2c29ec6` — `[verified] fix: play start cue on fallback narration days`

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
- `audio/library/2026-05-01/manifest.json`
- `narration-manifest.js`
- `tests/narration-manifest.test.js`

### 如果要改首頁靜態說明內容
- `index.html`
- `styles.css`
- `tests/static-page-content.test.js`

---

## 之後可能值得做，但目前不是 blocker 的項目

1. 每次影響語音 routing 或新增素材後，都補一次 live site 驗證，確認 today 與 historical library asset 都能從正式站取用
2. 若之後希望 deploy 狀態更可觀察，可再考慮改成 GitHub Actions Pages workflow
3. 補更多對 `player 不可用` / cue disabled / 異常中止 的 UI regression tests
4. 若語音庫持續擴充，最好把「新增一天素材需要同步更新哪些檔」整理成固定流程文件或 skill
5. 若首頁靜態教育內容越來越多，可考慮把內容區塊切成更明確的 partial / render 結構，但目前還不急

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
   - `audio/library/2026-05-01/manifest.json`
   - `narration-manifest.js`
6. 若是改首頁說明內容：再讀
   - `index.html`
   - `styles.css`
   - `tests/static-page-content.test.js`

照這個順序通常能最快進入可動手的狀態。
