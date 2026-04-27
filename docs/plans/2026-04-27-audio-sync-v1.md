# Audio Sync V1 Implementation Plan

> **For Hermes:** 先做可重用的語音素材與對時骨架，讓今日課表在每段開始時能自動播出對應提示。

**Goal:** 為今日課表建立 TTS 語音素材、播放對時邏輯與可重用的語音資產紀錄。

**Architecture:** 將語音腳本生成規則放進 `timer-core.js`，讓課表與語音內容由同一份資料推導。網站端以 phase start 為對時基準，在切換段落時立即播放對應音檔。音檔與文本、時長、雜湊值統一記錄在 manifest，方便後續復用與去重。

**Tech Stack:** HTML, CSS, Vanilla JavaScript, Node.js test runner, OpenRouter Gemini TTS CLI, GitHub Pages

---

## V1 範圍

1. 依今日課表自動建立每一段的旁白文本
2. 用 Gemini TTS CLI 生成今日測試音檔
3. 記錄每段文本、音檔路徑、音檔時長、開始時間、sha256
4. 網站在每段開始時自動播放該段語音
5. 播放起點對齊 phase 切換時間

## V1 暫不做

1. 句中精準到字級時間戳
2. 邊播邊 ducking 其他背景聲
3. 多語音角色
4. 自動雲端生成新日期語音
