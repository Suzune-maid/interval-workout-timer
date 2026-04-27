# Interval Workout Timer V1 Foundation Implementation Plan

> **For Hermes:** 先做可上線的第一版靜態網站，重點是訓練 / 放鬆週期框架可操作、可驗證、可再擴充。

**Goal:** 建立一個可部署到 GitHub Pages 的鍛鍊計時網站第一版，提供訓練 / 放鬆週期設定、基本倒數顯示、控制按鈕與流程預覽。

**Architecture:** 採純前端靜態網站。核心計時邏輯放在可測試的 `timer-core.js`，畫面互動由 `app.js` 處理，避免一開始就把邏輯與 DOM 綁死。測試使用 Node 內建 test runner 驗證核心邏輯。

**Tech Stack:** HTML, CSS, Vanilla JavaScript, Node.js built-in test runner, GitHub Pages

---

## V1 範圍

1. 可設定訓練秒數
2. 可設定放鬆秒數
3. 可設定回合數
4. 顯示目前階段、目前回合、剩餘時間
5. 提供開始 / 暫停 / 重設 / 跳到下一階段
6. 顯示本次流程預覽
7. GitHub Pages 可直接打開使用

## V1 暫不做

1. 音效
2. 背景執行保活
3. 自訂多種訓練動作名稱
4. 歷史紀錄
5. 使用者帳號
