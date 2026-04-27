# 第 5 階段收尾掃描 guidance 實作計畫

> **For Hermes:** 依 test-driven-development 流程先補 failing test，再生成素材、更新資料、驗證頁面時序。

**Goal:** 讓第 5 階段「收尾掃描」在倒數中有像教練帶領的簡短掃描提示，不用一直看螢幕也能完成放鬆檢查。

**Architecture:** 延用既有 `countdownGuidance` 資料驅動架構，不改 `app.js` / `audio-player.js` 核心播放邏輯。這一輪主要新增 phase-05 的 guidance clip、events、manifest/source/library 記錄與驗證。

**Tech Stack:** HTML、CSS、Vanilla JavaScript、Node `--test`、`uv run gemini-tts`

---

## 本輪採用的第 5 階段節奏

依原始計畫文件 `docs/plans/dry_orgasm_training_plan.md` 的「收尾掃描：1 分鐘」內容，把 5 個檢查點拆成 5 個短 guidance：

1. 第 0 秒：腹部，放鬆
2. 第 12 秒：臀部，不要夾
3. 第 24 秒：大腿，放鬆
4. 第 36 秒：會陰，鬆開
5. 第 48 秒：留意排尿感

設計理由：
- 原始文件本來就有 5 個檢查點
- 60 秒切成每 12 秒一個提示，節奏規律、容易驗證
- 最後保留一小段安靜時間，讓使用者自己感受有沒有殘留緊繃

## 實作步驟

1. 在 `tests/narration-manifest.test.js` 新增 `phase-05` regression test
2. 執行指定測試，確認先失敗
3. 生成第 5 階段 guidance 音檔與文字檔
4. 更新：
   - `audio/today/narration-manifest.json`
   - `audio/today/narration-source.json`
   - `audio/library/2026-04-27/manifest.json`
   - `audio/library/index.json`
   - `audio/today/guidance/phase-05-*.wav`
   - `audio/today/texts/phase-05-*.txt`
   - `audio/library/2026-04-27/guidance/phase-05-*.wav`
   - `audio/library/2026-04-27/texts/phase-05-*.txt`
5. 執行測試，確認由紅轉綠
6. 啟動本機伺服器，用瀏覽器 stub `play()` + 自動 `ended` 驗證第 5 階段 guidance
7. 更新 `README.md`
8. commit / push / 等待 Pages 更新 / 驗證 live
