# 語音規劃：2026-05-02（今天）與 2026-05-03（明天）

> 僅規劃，不生成語音。實際生成前需確認策略。

---

## 一、現狀摘要

| 日期 | 星期 | WxDx | 課表類型 | 素材庫狀態 |
|------|------|------|----------|-----------|
| 今天 2026-05-02 | 六 | W1D6 | 凱格爾普通日（可依狀態改放鬆） | ❌ 不存在 |
| 明天 2026-05-03 | 日 | W1D7 | 休息／輕放鬆日 | ❌ 不存在 |

library index 目前只有 W1D1～W1D5（2026-04-27～2026-05-01）。

---

## 二、今天：2026-05-02（W1D6）

### 課表結構

```
build凱格爾Session(week=1, isAdaptiveDay=true)
Phase structure: 準備放鬆(60s) + 慢速凱格爾 10次(90s) + 快速凱格爾 10次(20s) + 反向凱格爾(120s) + 收尾掃描(60s)
```

結構與 W1D1（2026-04-27）、W1D4（2026-04-30）**完全相同**（同為第一週，W1D6 的 `isAdaptiveDay=true` 只影響 session title 與 notes，不影響 phase 結構）。

### 語音策略建議：**直接複用**

因為：
- 所有 phase label、duration、narration text 完全一致
- W1D4（2026-04-30）也複用了 W1D1 的語音檔，這是既有慣例
- `isAdaptiveDay` 差異只在 title 文字，不影響倒數中段的引導語音

### 需要產生的新檔案

不需要新語音。只需要：

1. **新增 manifest**：`audio/library/2026-05-02/manifest.json`
   - 直接基於 2026-04-30 的 manifest 修改 metadata
   - `sourceDate` → `2026-05-02`
   - `sessionTitle` → `"凱格爾普通日（可依狀態改放鬆）"`
   - `dayNumber` → 6
   - `weekdayLabel` → `"六"`
   - **不修改 entries 內的任何 audioFile/textFile 路徑**（全部指向 2026-04-27 的原始檔）

2. **更新 library index**：`audio/library/index.json`
   - 新增 2026-05-02 條目
   - `libraryKey` → `"2026-05-02"`

### 注意事項

- manifest 中的 `sessionTitle` 會影響 UI 顯示的課程名稱
- 但 `countdownGuidance`、`timelineEvents`、`timelineClips` 全部複用，因為引導內容相同

---

## 三、明天：2026-05-03（W1D7）

### 課表結構

```
buildRestSession(week=1)
Phase: 短版呼吸放鬆(180s)
Session title: "休息／輕放鬆日"
Summary: "今天以恢復為主。若想維持節奏，只做短版呼吸放鬆即可。"
Notes: ["不要補做高強度正式訓練。", "如果身體狀態很好，也以休息優先，不把不射當壓力。"]
```

只有 **1 個 phase**，與既有的放鬆日（W1D3，3 phases）不同。

### 語音策略建議：**全部新生**

因為：
- 這是全新的 session 類型，無既有素材可複用
- phase label、duration、text 都與現有素材不同

### 需要產生的新內容

#### 3.1 Phase narration（段落旁白 × 1）

| 項目 | 內容 |
|------|------|
| ID | `phase-01` |
| Label | `短版呼吸放鬆` |
| 時長 | 180s |
| 文字 | `"現在開始：短版呼吸放鬆。這一段約 3 分鐘。用 3 分鐘把骨盆底、臀部與腹部慢慢放鬆。"` |
| 產出 | `audio/library/2026-05-03/generated/phase-01.wav` |
| 文字稿 | `audio/library/2026-05-03/texts/phase-01.txt` |

#### 3.2 Countdown guidance（倒數階段引導）

```
breathPattern: { inhaleSeconds: 4, exhaleSeconds: 6, cycles: 18 }
summary: "4 秒吸氣、6 秒吐氣，共 18 輪"
mode: "timed-breathing"
```

18 輪 × 10s = 180s，剛好填滿整段。

#### 3.3 Guidance clips（倒數中引導語音 × 2 個）

| Clip | 文字 | 檔案路徑 |
|------|------|---------|
| `inhale` | `"吸氣，慢慢放鬆。"` | `audio/library/2026-05-03/guidance/phase-01-guidance-01.wav` |
| `exhale` | `"吐氣，繼續放掉。"` | `audio/library/2026-05-03/guidance/phase-01-guidance-02.wav` |

#### 3.4 Timeline events（36 個事件）

180 秒 ÷ 10s (4+6) = 18 輪 → 每輪 2 個事件 → 36 個 timeline 事件

每輪事件序列範例：
- `startAtSecond: 0` → inhale
- `startAtSecond: 4` → exhale
- `startAtSecond: 10` → inhale
- `startAtSecond: 14` → exhale
- ...依此類推到 176 → exhale

#### 3.5 manifest 與 library index

- 新增：`audio/library/2026-05-03/manifest.json`
- 更新：`audio/library/index.json`（新增 2026-05-03 條目）

---

## 四、總結：所需工作量

### 2026-05-02（凱格爾普通日，可依狀態改放鬆）— 低
- 複用既有語音
- 只新增 manifest + index 更新

### 2026-05-03（休息／輕放鬆日）— 中低
- 新生 1 段旁白 (WAV)
- 新生 2 段引導語音 (WAV)
- 新增 manifest + index 更新 + 36 個事件

---

## 五、開放的決策點

1. **2026-05-02 標題一致性**：manifest 的 `sessionTitle` 要用 `"凱格爾普通日（可依狀態改放鬆）"` 還是簡化為 `"凱格爾普通日"`？前者與 timer-core.js 一致，後者節省 manifest 維護複雜度。
2. **05-03 引導文字**：休息日的引導語音用 `"吸氣，慢慢放鬆。"` / `"吐氣，繼續放掉。"` 是鈴音的建議，主人可以換成其他文字。
3. **執行順序**：要先做 05-02 再做 05-03？還是兩個一起做？
