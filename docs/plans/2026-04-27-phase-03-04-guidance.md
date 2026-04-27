# 第 3、4 階段教練引導實作計畫

> **For Hermes:** 依既有 countdownGuidance 結構擴充 phase-03 與 phase-04，先補 failing tests，再生成素材、更新 manifest/source/library，最後做本機與 live 驗證。

**Goal:** 讓第 3 階段「快速 Kegel（10 次）」與第 4 階段「反向 Kegel」也能在倒數中播放教練式引導語音。

**Architecture:** 延用既有 `countdownGuidance` 資料驅動結構，不改動 `app.js` / `audio-player.js` 的核心播放邏輯；這次重點放在 manifest/source/test/TTS 素材。第 3 階段採極短節拍口令，第 4 階段採呼吸＋下沉放鬆節奏。

**Tech Stack:** HTML / CSS / Vanilla JS、Node 內建 test runner、`uv run gemini-tts`、GitHub Pages。

---

## 需求依據

參考 `docs/plans/dry_orgasm_training_plan.md`：

- **5.3 快速 Kegel：10 次**
  - 快速輕收：約 1 秒
  - 立刻完全放掉：1～2 秒
  - 口訣：`點一下，立刻放。`
- **5.4 反向 Kegel／下沉放鬆：2 分鐘**
  - 吸氣時腹部自然膨起
  - 想像骨盆底往下放、往外鬆
  - 吐氣時保持放鬆，不要重新夾緊
  - 8～10 次呼吸
  - 口訣：`吸氣，下沉；吐氣，保持鬆。`

## 實作決策

1. **phase-03 快速 Kegel**
   - 20 秒共 10 次，採 **2 秒一輪**。
   - 事件節奏：`0 收 → 1 放 → 2 收 → 3 放 ... → 18 收 → 19 放`
   - summary：`1 秒點收、1 秒全放，共 10 次`
   - 文案先用超短版，避免擠壓 1 秒收縮窗；生成後再依實測長度微調。

2. **phase-04 反向 Kegel**
   - 120 秒採 **10 輪呼吸**，每輪 12 秒。
   - 事件節奏：`0 吸氣下沉 → 4 吐氣保持鬆 → 12 吸氣下沉 → 16 吐氣保持鬆 ...`
   - summary：`4 秒吸氣下沉、8 秒吐氣保持鬆，共 10 輪`
   - 文案以原始口訣為主，保持簡短且穩定。

3. **資料層**
   - 更新：
     - `audio/today/narration-manifest.json`
     - `audio/today/narration-source.json`
     - `audio/library/2026-04-27/manifest.json`
     - `audio/library/index.json`
   - 新增 phase-03 / phase-04 guidance 音檔與對應文本。

4. **測試**
   - 先在 `tests/narration-manifest.test.js` 新增 phase-03 / phase-04 regression tests，確認節奏與 clips 結構。
   - 如有需要，再補 `tests/audio-player.test.js` 驗證播放器能正確播放新的 clip id。

5. **驗證**
   - `npm test`
   - 本機靜態伺服器 + browser 攔截 `play()` / `setInterval` 驗證：
     - phase-03：第 0 秒收、第 1 秒放、第 2 秒再收
     - phase-04：第 0 秒吸氣下沉、第 4 秒吐氣保持鬆、第 12 秒再吸氣下沉
   - push 後輪詢 GitHub Pages 並做 live smoke test。
