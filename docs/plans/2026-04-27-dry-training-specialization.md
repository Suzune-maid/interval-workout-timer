# Dry Training Specialized Site Implementation Plan

> **For Hermes:** 依 `Z 槽 github/dry_orgasm_training_plan.md` 把既有 interval timer 改成專用訓練網站，並以 2026-04-27 作為第一週第一天建立自動日程表。

**Goal:** 把原本通用計時器改成專門訓練網站，能依日期自動切換 6 週課表中的今日內容，並讓今日內容直接載入計時器。

**Architecture:** 保留靜態網站架構，將可測試邏輯集中在 `timer-core.js`。新增「日程解析」與「今日訓練內容建構」函式；`app.js` 專責把今日課表、6 週日程表與計時器畫面接起來。

**Tech Stack:** HTML, CSS, Vanilla JavaScript, Node.js test runner, GitHub Pages

---

## 任務

1. 依文件整理 6 週訓練節奏、每週目標與每週固定星期模板
2. 先寫 failing tests，覆蓋：
   - 日期換算成第幾週第幾天
   - 建立 42 天完整日程表
   - 依當天課表建立計時階段
3. 擴充 `timer-core.js` 支援日期型課表與自訂 phase 陣列
4. 重寫 `index.html` 為專門訓練網站資訊架構：
   - 今日訓練
   - 計時器
   - 6 週日程表
   - 安全與分數口訣
5. 重寫 `app.js`，讓今天自動視為週期起點後的對應天數，並自動載入今日課表
6. 驗證測試、瀏覽器畫面與 GitHub Pages 部署
