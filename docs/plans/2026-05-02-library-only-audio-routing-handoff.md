# 2026-05-02 library-only audio routing handoff

## TL;DR

- `audio/today/` **不再是 app 執行時來源**。
- app 現在只會透過 `audio/library/index.json` 判斷某一天是否有專用語音。
- 若該日期存在於 library index，載入 `audio/library/<date>/manifest.json`。
- 若該日期不存在於 library index，退回 **文字腳本 + start cue only**。
- 測試基線已更新為 **52/52 pass**。

## 這次為什麼改

原本的 `audio/today` 特例容易出現：

1. 今天日期已往後走，但 `audio/today` 內容還停在昨天
2. app 把 stale manifest 誤當成今天的旁白
3. 切日後容易混入錯誤 ownership 判斷

這次直接把規則簡化成：

- **按日期抓 library**
- **沒有該日期就 fallback**
- **不要再在 runtime 判斷 today 特例**

## 這次改動的核心檔案

- `app.js`
  - 移除 `resolveNarrationManifestUrl()` 內的 `audio/today` fallback
  - `clearNarrationAudio()` 改成清空 manifest ownership，並切回 cue-only player
  - 新增 local `createCueOnlyNarrationPlayer()`，確保無專用旁白日仍能播放 start cue
- `audio-player.js`
  - `loadNarrationManifest()` 不再帶 `audio/today` 預設路徑
- `tests/app-flow.test.js`
  - 測試 fixture 改為 date-based library paths
  - 新增 regression：今天若沒有 library manifest，不得抓 `audio/today`
  - 驗證 fallback day 仍會先播開始音效
- `README.md`
  - 說明改成 library-only runtime routing
  - 測試基線更新為 51/51

## 驗證結果

### Automated

```bash
npm test
```

結果：**52/52 pass**

### Browser smoke test

以本機 `python3 -m http.server 8124` 驗證：

1. 系統日期 `2026-05-02` 開頁
   - 畫面顯示 5/2（週六）
   - `narration-status` 顯示 fallback 文字模式
   - `performance` resource 只看到 `audio/library/index.json`
   - **沒有** `audio/today/narration-manifest.json`
2. 切到 `2026-05-01`
   - 成功載入 `audio/library/2026-05-01/manifest.json`
   - `narration-status` 顯示語音 metadata 與 guidance summary

## 目前 runtime 規則

### 有 library 的日期

- `audio/library/index.json` 有對應項目
- app 載入該日 `manifest.json`
- phase narration / countdown guidance / cue 正常啟用

### 沒有 library 的日期

- app 不嘗試抓 `audio/today`
- narration UI 退回文字腳本模式
- 開始前仍要播放 start cue
- pause / resume / skip 行為仍沿用既有 timeline 規則

## 對後續開發的建議

1. **新增新日期語音時，只更新 library 結構**
   - `audio/library/<date>/manifest.json`
   - `audio/library/<date>/generated/*`
   - `audio/library/<date>/guidance/*`
   - `audio/library/index.json`
2. `audio/today/` 目錄已自 repo 移除，不再保留草稿或 runtime 角色
3. 若後續還看到 `audio/today` 字樣，應視為歷史文件脈絡，而不是目前實作

## 建議下次接手先跑

```bash
git status -sb
git log -1 --oneline
npm test
python3 -m http.server 8124
```

然後手動驗證：

- 一天有 library（例如 5/1）
- 一天沒有 library（例如 5/2）
- 切換後是否仍符合 library-only routing 規則
