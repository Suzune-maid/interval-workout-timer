# interval-workout-timer

乾式高潮導向訓練儀表板，包含 6 週日程、今日課表計時器，以及可重用的語音引導素材。

## 目前功能

- 依起始日自動推算今天是第幾週第幾天
- 顯示今日訓練摘要、注意事項與完整 6 週日程
- 每段先播放階段說明，再播放開始音效，之後才開始倒數
- 第一階段支援倒數中的教練式呼吸引導，會按 4 秒吸氣、6 秒吐氣節奏播放短語音
- 第二階段支援慢速 Kegel 教練引導，會按 3 秒收、6 秒放的節奏帶 10 次
- 每段倒數結束時播放結束音效，再切到下一段
- 支援開始 / 暫停 / 重設 / 跳到下一段
- 顯示今日語音引導文本、起始時間與音檔長度
- 提供可重用的語音素材清單與歷史音檔索引

## 語音素材結構

- `audio/today/narration-manifest.json`
  - 今日要直接載入的語音清單
  - `phase-01` 與 `phase-02` 目前包含 `countdownGuidance`
  - `phase-01` 記錄吸氣／吐氣 clip 與播放時間點
  - `phase-02` 記錄慢速 Kegel 的收／放 clip 與播放時間點
- `audio/library/index.json`
  - 已建立日期的語音索引
- `audio/library/<date>/manifest.json`
  - 該日期每一段的文本、音檔、長度、sha256 與起始秒數
- `audio/today/guidance/` 與 `audio/library/<date>/guidance/`
  - 倒數中段引導的短語音，目前已實作第 1 階段呼吸節奏與第 2 階段慢速 Kegel 收放節奏

## 本機開發

```bash
python3 -m http.server 8124
```

然後打開 <http://127.0.0.1:8124/>。

## 測試

```bash
npm test
```

## GitHub Pages

網站部署在 GitHub Pages，可直接於手機或桌機瀏覽器使用。
