# 2026-04-28 正式訓練日語音生成草稿

## 今日對應訓練
- 日期：`2026-04-28`
- Program start：`2026-04-27`
- 週次／天數：**第 1 週第 2 天**
- session：**正式訓練日**
- week focus：**建立地圖**
- duration：**15～20 分鐘**
- summary：本週先建立 5、6、7 分的地圖，不急著追求乾式波峰。

## 正式訓練 phase 文案草稿
- `phase-01` / **準備期** / 現在開始：準備期。這一段約 2 分鐘。呼吸、放鬆與設定今天只做地圖建立。
- `phase-02` / **第 1 回：到 5 分停** / 現在開始：第 1 回：到 5 分停。這一段約 3 分鐘。穩定上升到 5 分後停止。
- `phase-03` / **第 2 回：到 6 分停** / 現在開始：第 2 回：到 6 分停。這一段約 4 分鐘。感受高原區與可控感。
- `phase-04` / **第 3 回：接近 7 分立刻停** / 現在開始：第 3 回：接近 7 分立刻停。這一段約 4 分鐘。有射精感冒出就停，不強求波峰。
- `phase-05` / **收尾放鬆** / 現在開始：收尾放鬆。這一段約 3 分鐘。可正常結束，最後做呼吸與反向凱格爾。

## 最小可用版：預計要生成的 `audio/today` 檔案
| Phase | 用途標題 | 文字稿 | 語音檔 | 使用位置 |
|---|---|---|---|---|
| phase-01 | 準備期 | `audio/today/texts/phase-01.txt` | `audio/today/generated/phase-01.wav` | 進入 **準備期** 時先播放 phase 旁白，播完後接 `audio/fx/countdown-start.wav`，再開始該段倒數 |
| phase-02 | 第 1 回：到 5 分停 | `audio/today/texts/phase-02.txt` | `audio/today/generated/phase-02.wav` | 進入 **第 1 回：到 5 分停** 時先播放 phase 旁白，播完後接 `audio/fx/countdown-start.wav`，再開始該段倒數 |
| phase-03 | 第 2 回：到 6 分停 | `audio/today/texts/phase-03.txt` | `audio/today/generated/phase-03.wav` | 進入 **第 2 回：到 6 分停** 時先播放 phase 旁白，播完後接 `audio/fx/countdown-start.wav`，再開始該段倒數 |
| phase-04 | 第 3 回：接近 7 分立刻停 | `audio/today/texts/phase-04.txt` | `audio/today/generated/phase-04.wav` | 進入 **第 3 回：接近 7 分立刻停** 時先播放 phase 旁白，播完後接 `audio/fx/countdown-start.wav`，再開始該段倒數 |
| phase-05 | 收尾放鬆 | `audio/today/texts/phase-05.txt` | `audio/today/generated/phase-05.wav` | 進入 **收尾放鬆** 時先播放 phase 旁白，播完後接 `audio/fx/countdown-start.wav`，再開始該段倒數 |

## 建議同步進 library 的對應檔案
| Phase | 文字稿 | 語音檔 | 用途 |
|---|---|---|---|
| phase-01 | `audio/library/2026-04-28/texts/phase-01.txt` | `audio/library/2026-04-28/generated/phase-01.wav` | 對應今天正式訓練日的可重用 library 素材 |
| phase-02 | `audio/library/2026-04-28/texts/phase-02.txt` | `audio/library/2026-04-28/generated/phase-02.wav` | 對應今天正式訓練日的可重用 library 素材 |
| phase-03 | `audio/library/2026-04-28/texts/phase-03.txt` | `audio/library/2026-04-28/generated/phase-03.wav` | 對應今天正式訓練日的可重用 library 素材 |
| phase-04 | `audio/library/2026-04-28/texts/phase-04.txt` | `audio/library/2026-04-28/generated/phase-04.wav` | 對應今天正式訓練日的可重用 library 素材 |
| phase-05 | `audio/library/2026-04-28/texts/phase-05.txt` | `audio/library/2026-04-28/generated/phase-05.wav` | 對應今天正式訓練日的可重用 library 素材 |

## 其他會沿用、但不用重做的音效
| 檔案 | 用途 |
|---|---|
| `audio/fx/countdown-start.wav` | 每段倒數開始前播放 |
| `audio/fx/countdown-end.wav` | 每段倒數結束後播放，再切換到下一段 |

## 建議資料更新點
- 新增或覆寫：`audio/today/texts/phase-01.txt` ~ `phase-05.txt`
- 新增或覆寫：`audio/today/generated/phase-01.wav` ~ `phase-05.wav`
- 更新：`audio/today/narration-source.json`
- 更新：`audio/today/narration-manifest.json`
- 新增：`audio/library/2026-04-28/manifest.json`
- 新增：`audio/library/2026-04-28/texts/phase-01.txt` ~ `phase-05.txt`
- 新增：`audio/library/2026-04-28/generated/phase-01.wav` ~ `phase-05.wav`
- 更新：`audio/library/index.json`

## 判斷
今天這套正式訓練日屬於「感受導向」流程，**先建議只做每段 phase 開場旁白**，不要像凱格爾日那樣先做密集 countdown guidance。等正式訓練日的主旁白版本穩定後，再視需要加少量提醒型 guidance clip。
