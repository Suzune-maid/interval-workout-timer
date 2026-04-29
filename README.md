# interval-workout-timer

乾式高潮導向訓練儀表板，包含 6 週日程、今日課表計時器、可重用的語音引導素材，以及以 monotonic clock 支撐的穩定倒數與播放排程。

## 交接文件

如果是新 session 要快速接手目前專案狀態，建議先看：

- `docs/plans/2026-04-29-project-status-handoff.md`

這份文件整理了目前進度、最近完成的工作、關鍵行為基線、驗證方式，以及這個 repo 最近踩過的坑與注意事項。

## 目前功能

- 依起始日自動推算今天是第幾週第幾天
- 顯示目前選取日的訓練摘要、注意事項與完整 6 週日程
- 日程表可直接點選任一天，立即切換課表與計時器內容
- 每段開始前會先播放階段說明（若有）與開始音效，之後才開始倒數
- 第一階段支援倒數中的教練式呼吸引導，會按 4 秒吸氣、6 秒吐氣節奏播放短語音
- 第二階段支援慢速凱格爾教練引導，會按 3 秒收、6 秒放的節奏帶 10 次
- 第三階段支援快速凱格爾節拍引導，會按 1 秒點收、1 秒全放的節奏帶 10 次
- 第四階段支援反向凱格爾呼吸引導，會按 4 秒吸氣下沉、8 秒吐氣保持鬆帶 10 輪
- 第五階段支援收尾掃描引導，會每 12 秒帶一次腹部、臀部、大腿、會陰與排尿感檢查
- 每段倒數結束時播放結束音效，再切到下一段
- 支援開始 / 暫停 / 重設 / 跳到下一段
- 倒數已改用 monotonic clock 追秒；若 heartbeat 延遲，畫面會自動 catch up，不會整段慢半拍
- 顯示今日語音引導文本、起始時間與音檔長度
- 提供可重用的語音素材清單與歷史音檔索引
- 語音資料已升級為 `timeline-events-v1`，以 `timelineClips` / `timelineEvents` 驅動播放資料

## 目前行為基線

以下行為已由 regression tests 鎖住，後續重構不可破壞：

- 切換日程時，會取消目前 active playback、重設 phase 與 timer，並載入新選取日的流程。
- 如果切到沒有專用語音素材的日子，介面必須退回文字腳本模式，不能殘留上一天的語音狀態。
- 沒有專用語音素材的日子，開始前也要先播放開始音效，不能直接跳進倒數。
- 倒數已開始後按暫停，再按開始恢復時，只會重播開始音效，不會把整段 phase narration 從頭再播一次。
- 按「跳到下一段」時，必須先停止目前音訊，再切到下一個 phase。
- 被取消或過期的非同步語音播放流程，不可以在完成後回頭覆寫新的畫面狀態。

## 目前架構

- `app.js`
  - 頁面組裝層，負責初始化、事件綁定與把 orchestrator / view / audio 接起來
- `dom-refs.js`
  - 集中收斂主要 DOM refs
- `schedule-view.js`
  - 日程表與今日摘要 render
- `timer-view.js`
  - timer、phase plan、語音狀態與 guidance 文案 render
- `session-controller.js`
  - selected day、session state 與 phase progression 的高階狀態切換
- `timeline-orchestrator.js`
  - countdown、phase progression、pause / resume / skip / cancel 與 monotonic scheduling
- `audio-engine.js`
  - track-based 音訊抽象層
- `audio-player.js`
  - 相容 wrapper，保留既有播放 API，內部改走 audio engine
- `narration-manifest.js`
  - 將 `timeline-events-v1` manifest 正規化，並提供 legacy 相容檢視
- `timer-core.js`
  - 純資料邏輯與 session / phase helper

## 語音素材結構

- `audio/today/narration-manifest.json`
  - 今日直接載入的語音清單
  - 使用 `schemaVersion: timeline-events-v1`
  - `phase-01` 到 `phase-05` 以 `timelineClips` / `timelineEvents` 描述 phase narration、cue 與倒數中的 guidance
- `audio/today/narration-source.json`
  - 今日語音素材的來源資料，同步使用 `timeline-events-v1`
- `audio/library/index.json`
  - 已建立日期的語音索引，並指向對應 timeline schema
  - 目前收錄 `2026-04-27`、`2026-04-28` 與 `2026-04-29` 三天素材
- `audio/library/<date>/manifest.json`
  - 該日期每一段的文本、音檔、長度、sha256，以及 `timelineClips` / `timelineEvents`
- `audio/schema/timeline-event.schema.json`
  - timeline/event schema 定義
- `audio/today/guidance/` 與 `audio/library/<date>/guidance/`
  - 倒數中段引導的短語音，目前已實作第 1 階段呼吸節奏、第 2 階段慢速凱格爾、第 3 階段快速凱格爾、第 4 階段反向凱格爾呼吸引導，以及第 5 階段收尾掃描引導
- `narration-manifest.js`
  - 若上層仍需要舊介面，會從新 schema 產生 legacy `countdownGuidance` 相容檢視，而不是再把它當成主要資料來源

## 本機開發

```bash
python3 -m http.server 8124
```

然後打開 <http://127.0.0.1:8124/>。

## 測試

目前測試基線為 **49/49 通過**。

```bash
npm test
```

## GitHub Pages

網站部署在 GitHub Pages，可直接於手機或桌機瀏覽器使用。

- 正式站：<https://suzune-maid.github.io/interval-workout-timer/>
- 本 repo **沒有**額外的 `.github/workflows` deploy pipeline
- 目前採用 GitHub Pages 的 branch-based deployment
- 只要 push 到 `main`，GitHub Pages 就會自動重新發佈正式站
- 實際更新通常會有短暫 propagation delay，不是 push 完瞬間就看到新版本

建議發版後至少做兩件事：

1. 先跑一次 `npm test`
2. push 後用正式站網址確認新內容是否已經出現
