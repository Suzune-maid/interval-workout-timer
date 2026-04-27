# 第一階段倒數中引導語音實作計畫

## 目標
在第 1 階段「準備放鬆」的 60 秒倒數中，加入像教練帶領一樣的吸氣／吐氣中段引導語音，先做第一階段驗證效果。

## 本次範圍
- 只實作第 1 階段
- 使用 4 秒吸氣、6 秒吐氣的呼吸節奏
- 在倒數進行中播放短語音，不影響原本的階段旁白、開始音效、結束音效
- 將新語音的文本、音檔、長度、sha256 與時間點記錄進 manifest，方便後續擴充到其他階段

## 資料格式
在 `audio/today/narration-manifest.json` 與歷史 library manifest 的 `phase-01` 內新增 `countdownGuidance`：
- `summary`：例如「4 秒吸氣、6 秒吐氣，共 6 輪」
- `clips`：吸氣／吐氣音檔與文字
- `events`：每個時間點要播哪個 clip，例如 `0, 4, 10, 14...`

## 技術策略
1. 先在 `tests/audio-player.test.js` 補測試，定義：
   - 指定 phase + elapsedSecond 時會播對應 guidance clip
   - 同一個 guidance event 不會重播
   - `reset()` 後可重新播放
   - `stopActivePlayback()` 可中止當前 guidance clip，但不清空已播放紀錄
2. 在 `audio-player.js` 新增 guidance audio channel 與 guidance event 狀態管理。
3. 在 `app.js` 讓倒數開始時觸發 elapsed 0 的 guidance，之後每秒 tick 依 elapsedSecond 檢查是否要播 guidance。
4. 用 `uv run gemini-tts` 生成第 1 階段的吸氣／吐氣短語音。
5. 本機用瀏覽器攔截 `play()` 驗證：
   - phase intro 完成後才開始倒數
   - 倒數進行中會在指定秒數播放吸氣／吐氣
6. push 後再驗證 GitHub Pages live 版本。

## 本次預設節奏
- 吸氣：elapsed `0, 10, 20, 30, 40, 50`
- 吐氣：elapsed `4, 14, 24, 34, 44, 54`

## 先不做
- 其他階段的中段引導
- 根據不同剩餘秒數自動變化語句
- 多聲道混音或背景音
- 更複雜的 3、2、1 倒數口令
