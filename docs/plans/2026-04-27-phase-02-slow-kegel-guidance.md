# 慢速 Kegel（第 2 階段）教練引導 Implementation Plan

> **For Hermes:** 以既有 GitHub Pages 靜態站流程實作此計畫；先用測試釘住 manifest 與播放行為，再補資料、音檔與驗證。

**Goal:** 為第 2 階段「慢速 Kegel（10 次）」加入倒數中的教練式引導語音，讓使用者在不看螢幕時也能依 3 秒收、6 秒放的節奏完成 10 次。

**Architecture:** 沿用既有 `countdownGuidance` 資料模型與 `audio-player.js` / `app.js` 的泛用播放流程，不額外為 phase-02 寫特例。這次主要新增 phase-02 的 guidance clips、events、manifest/source 記錄，以及對應的回歸測試與 live 驗證。

**Tech Stack:** HTML、CSS、Vanilla JavaScript（ES Modules）、Node 內建 test runner、GitHub Pages、`uv run gemini-tts`

---

## 本次採用的引導節奏
- 階段：`phase-02` / `慢速 Kegel（10 次）`
- 總長：90 秒
- 節奏：每輪 9 秒，共 10 輪
  - 第 0 秒：收
  - 第 3 秒：放
  - 第 9 秒：收
  - 第 12 秒：放
  - ……
  - 第 81 秒：收
  - 第 84 秒：放
- 教練短句採「更短、更貼拍的自然短句 + 一點姿勢提示」：
  - 收：`收緊，上提`
  - 放：`放掉，臀腿放鬆`

## Task 1: 用測試釘住 phase-02 guidance 資料
**Objective:** 讓測試先明確要求 phase-02 必須有收／放 guidance 結構與正確節拍。

**Files:**
- Create: `tests/narration-manifest.test.js`
- Modify: `audio/today/narration-manifest.json`
- Modify: `audio/today/narration-source.json`

**Step 1:** 新增測試，讀取 `audio/today/narration-manifest.json`，斷言 `phase-02` 存在 `countdownGuidance`。
**Step 2:** 斷言 summary 為 `3 秒收、6 秒放，共 10 次`。
**Step 3:** 斷言 clips 至少含 `contract` / `release`。
**Step 4:** 斷言 events 為 `[0,3,9,12,18,21,27,30,36,39,45,48,54,57,63,66,72,75,81,84]`。
**Step 5:** 執行 `npm test -- --test-name-pattern='phase-02|countdownGuidance|manifest'`，預期先失敗。

## Task 2: 生成 phase-02 收／放語音並記錄
**Objective:** 產出可重用的短語音素材與文字檔。

**Files:**
- Create: `audio/today/guidance/phase-02-contract.wav`
- Create: `audio/today/guidance/phase-02-release.wav`
- Create: `audio/today/texts/phase-02-contract.txt`
- Create: `audio/today/texts/phase-02-release.txt`
- Modify: `audio/library/2026-04-27/guidance/*`
- Modify: `audio/library/2026-04-27/texts/*`

**Step 1:** 用 `uv run gemini-tts` 產出 `contract` / `release` 音檔。
**Step 2:** 量測音檔秒數與 sha256。
**Step 3:** 複製到 library 歷史可重用區。

## Task 3: 寫回 manifest / source / library metadata
**Objective:** 讓網站與資料庫都能讀到 phase-02 guidance。

**Files:**
- Modify: `audio/today/narration-manifest.json`
- Modify: `audio/today/narration-source.json`
- Modify: `audio/library/2026-04-27/manifest.json`
- Modify: `audio/library/index.json`

**Step 1:** 在 `phase-02` entry 內加入 `countdownGuidance`。
**Step 2:** 記錄 summary / mode / clips / events / sha256 / audioDurationSeconds / ttsStyle。
**Step 3:** source 檔補上 phase-02 guidance 的文案來源。
**Step 4:** 重新跑測試，確認由 fail 轉 pass。

## Task 4: 本機驗證網站行為
**Objective:** 確認 phase-02 在頁面層真的會於正確秒數播放收／放引導。

**Files:**
- No code changes expected unless smoke test reveals a bug

**Step 1:** 啟動本機靜態伺服器。
**Step 2:** 用瀏覽器攔截 `play()` 與 `setInterval`。
**Step 3:** 跳到 phase-02，驗證第 0 秒播放 contract、第 3 秒播放 release。
**Step 4:** 再驗證後續輪次至少一組，例如第 9 秒與第 12 秒。

## Task 5: 文件、提交、部署、live 驗證
**Objective:** 更新 README、push、驗證 GitHub Pages live 站。

**Files:**
- Modify: `README.md`

**Step 1:** README 補上 phase-02 guidance 說明。
**Step 2:** `npm test` 全綠。
**Step 3:** commit / push。
**Step 4:** 輪詢 GitHub Pages 與 manifest / guidance 檔案。
**Step 5:** live 站做手動 tick smoke test。
