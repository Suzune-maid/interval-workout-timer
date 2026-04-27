# interval-workout-timer

乾式高潮導向訓練儀表板，包含 6 週日程、今日課表計時器，以及可重用的語音引導素材。

## 目前功能

- 依起始日自動推算今天是第幾週第幾天
- 顯示今日訓練摘要、注意事項與完整 6 週日程
- 依課表段落做倒數計時
- 支援開始 / 暫停 / 重設 / 跳到下一段
- 顯示今日語音引導文本、起始時間與音檔長度
- 提供可重用的語音素材清單與資產索引

## 語音素材結構

- `audio/today/narration-manifest.json`
  - 今日要直接載入的語音清單
- `audio/library/index.json`
  - 已建立日期的語音索引
- `audio/library/<date>/manifest.json`
  - 該日期每一段的文本、音檔、長度、sha256 與起始秒數

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
