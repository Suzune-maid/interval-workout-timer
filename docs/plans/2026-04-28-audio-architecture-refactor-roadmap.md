# Audio Architecture Refactor Roadmap

> **For Hermes:** Use subagent-driven-development skill to execute this roadmap phase-by-phase. Keep each phase independently shippable, keep `npm test` green, and avoid migrating the entire UI layer to a frontend framework until the migration triggers in this document are actually met.

**Goal:** 把目前的訓練網站從「單一 `app.js` 協調 DOM、計時器與音訊」整理成可長期擴充的架構，支撐未來「播放時經常同時放語音」的需求，同時維持 GitHub Pages 靜態部署與現有功能穩定。

**Architecture:** 短期不先引入 Vue/React/Svelte，而是先把現有 Vanilla JS 架構拆成 `domain / orchestration / audio / view` 四層。優先重構音訊引擎與時間軸排程，讓多軌播放、優先級、ducking、pause/resume、skip、切日切段等需求可以用資料驅動的方式擴充；等 UI 複雜度真的超出 Vanilla DOM 的維護成本後，再只把 view layer 遷移到 Vue 3。

**Tech Stack:** HTML, CSS, Vanilla JavaScript (ES Modules), Node built-in test runner (`node --test`), GitHub Pages, Web Audio API（作為未來音訊引擎的方向，先以抽象層引入，不要求第一階段立刻全面替換）, 現有 `audio/today/narration-manifest.json` 與 `audio/library/` 素材結構。

---

## Why This Roadmap Exists

目前專案的主要瓶頸不是畫面元件化，而是：

1. `app.js` 同時負責 DOM 更新、計時器狀態、日程切換、phase 流程與音訊播放協調。
2. `audio-player.js` 目前只有 `narration / cue / guidance` 三個固定 `HTMLAudioElement`，其中 guidance 還是單一 channel。
3. 倒數與播放流程目前主要依賴 `setInterval(async () => ...)` 與等待 `ended` 事件；當未來的同播語音、提示音和引導層增加時，會更容易出現 race condition、排程漂移、取消不完整與 pause/resume 恢復不一致。
4. 目前的 manifest 結構偏向 phase intro + countdown guidance event，還不足以描述多軌重疊、優先級、ducking 與 interruption policy。

因此，應先重構**音訊架構與流程分層**，而不是先把整個 UI 改寫成框架。

---

## Non-Goals

這份 roadmap **現在不做**：

- 不一次把整站改成 Vue / React / Svelte。
- 不在第一階段就把所有音訊播放改成複雜 DAW 等級的混音系統。
- 不重寫既有課表與 `timer-core.js` 的純資料邏輯。
- 不改變 GitHub Pages 靜態部署方式。
- 不要求一次補齊所有日期型課表的專用語音素材。

---

## Current Baseline

截至 **2026-04-28（Phase 3 完成後）**，後續工作應以以下狀態作為新基線，而不是以 roadmap 初稿建立時的數字為準：

- `app.js` 約 **325 行**、`audio-engine.js` 約 **186 行**、`audio-player.js` 約 **161 行**、`timeline-orchestrator.js` 約 **334 行**、`timer-core.js` 約 **477 行**。
- `npm test` 全綠（目前 **44/44**）。
- 日程表已支援點選切換日程。
- `phase-01` 到 `phase-05` 的倒數中引導已完成並部署。
- `tests/app-flow.test.js` 已鎖住切日、fallback、pause/resume、skip 與 stale async overwrite guardrails。
- `tests/phase1-modules.test.js` 已鎖住 `dom-refs.js`、`schedule-view.js`、`timer-view.js`、`session-controller.js` 的模組契約。
- `tests/timeline-orchestrator.test.js` 已鎖住 preparing → started、pause/resume、skip 取消舊 sequence、session complete，以及 generic `stopAll()` cancellation 契約。
- `tests/audio-engine.test.js` 已鎖住同 track interrupt、獨立 stopTrack、preload 與 reset 行為。
- 正式站仍以單頁靜態站形式運作，且 Phase 0 / 1 / 2 / 3 都已完成本地 smoke test 與 GitHub Pages live 驗證。
- 對應完成 commit：
  - Phase 0: `a0bd75b` — `test: add phase 0 audio flow guardrails`
  - Phase 1: `19c435a` — `refactor: split app into view and session modules`
  - Phase 2: `a5d9389` — `refactor: extract timeline orchestrator`
  - Phase 3: `refactor: introduce audio engine abstraction`

---

# Phase 0: Baseline Freeze and Guardrails

**Status:** ✅ Completed (`a0bd75b`)

**Objective:** 在開始動架構前，先把目前可工作的行為固定下來，避免後續重構把已驗證的播放流程弄壞。

**Files:**
- Modify: `tests/audio-player.test.js`
- Modify: `tests/timer-core.test.js`
- Modify: `tests/day-selection.test.js`
- Create: `tests/app-flow.test.js`
- Modify: `README.md`

**Deliverables:**
1. 補一批以「使用者行為」為核心的 regression tests：
   - 切日後重設 timer / phase / narration 狀態
   - pause/resume 時 phase intro 與 cue 的預期行為
   - skip phase 時 active playback 是否停止
   - 沒有專用語音素材的日子能否安全退回文字模式
2. 在 README 加上目前行為基線描述，作為重構前後比對依據。
3. 補上 sequence guard，避免被取消的舊 async 語音流程回頭覆寫新的 UI 狀態。

**What shipped in this phase:**
- 新增 `tests/app-flow.test.js`，建立 app-flow regression guardrails。
- `README.md` 新增 **「目前行為基線（Phase 0 guardrails）」** 段落。
- 已修正切日後舊 narration / cue promise 完成時回頭覆寫 UI 的 race condition。

**Verification:**
- `npm test`
- 測試名稱應能讀出目前保證的行為，不只是低階實作細節。

**Exit Criteria:**
- 後續每一階段都能用這批 baseline tests 防回歸。

---

# Phase 1: Split `app.js` into View + Session Controller

**Status:** ✅ Completed (`19c435a`)

**Objective:** 先把 `app.js` 從超大協調檔拆成比較清楚的責任邊界，讓後續音訊重構不必一直碰 UI render 邏輯。

**Files:**
- Create: `session-controller.js`
- Create: `schedule-view.js`
- Create: `timer-view.js`
- Create: `dom-refs.js`
- Create: `tests/phase1-modules.test.js`
- Create: `tests/support/fake-dom.js`
- Modify: `app.js`
- Regression: `tests/app-flow.test.js`

**Target Structure:**
- `dom-refs.js`
  - 只負責收集與輸出 DOM refs
- `schedule-view.js`
  - `renderStaticContent()`
  - `renderSchedule()`
- `timer-view.js`
  - `renderTimer()`
  - `renderPhasePlan()`
  - `renderNarrationInfo()`
  - `renderGuidanceLive()`
- `session-controller.js`
  - 管 selected day / current session / phase state 的高階狀態更新
- `app.js`
  - 只留下組裝、事件綁定與初始化

**Implementation Notes:**
- 不要一開始就導入自製 state management library。
- 先以簡單 factory / module function 把責任切開即可。
- 維持現有資料流名稱，避免第一階段過度 rename 造成 review 成本上升。

**What shipped in this phase:**
- 已抽出 `dom-refs.js`、`schedule-view.js`、`timer-view.js`、`session-controller.js`。
- 新增 `tests/phase1-modules.test.js` 與 `tests/support/fake-dom.js`，鎖住模組介面與 render 契約。
- `app.js` 已縮成較明確的組裝層，讓 view render 與 selected day / session state 脫離主流程檔。

**Verification:**
- `npm test`
- 手動驗證：
  - 正式訓練日可開始、暫停、重設、跳段
  - 點選切日仍會更新畫面與計時器
  - 沒專用語音的日期仍能安全 fallback

**Exit Criteria:**
- `app.js` 明顯縮小，成為組裝層，而不是全能協調器。
- DOM render 函式不再直接混在音訊與 timer loop 裡。

---

# Phase 2: Introduce a Real Timeline Orchestrator

**Status:** ✅ Completed (`a5d9389`)

**Objective:** 把目前散在 `app.js` 中的「倒數、phase 轉換、播放前等待、結束後切段」邏輯整理成單一流程協調器，避免 `setInterval(async () => ...)` 逐步變成難以維護的時序地雷。

**Files:**
- Create: `timeline-orchestrator.js`
- Create: `tests/timeline-orchestrator.test.js`
- Modify: `session-controller.js`
- Modify: `app.js`
- Regression: `tests/app-flow.test.js`
- Regression: `tests/audio-player.test.js`

**Responsibilities of `timeline-orchestrator.js`:**
- 啟動 phase
- 處理 intro / cue / countdown / end cue 的順序
- pause / resume / skip / cancel
- phase 完成後前進或結束
- 對外發送簡單事件 / callback：
  - `onPhasePreparing`
  - `onPhaseStarted`
  - `onTick`
  - `onGuidance`
  - `onPhaseCompleted`
  - `onSessionCompleted`

**Implementation Notes:**
- 先不要直接導入 RxJS 或大型事件框架。
- 先做一個明確的 orchestrator 物件，把流程規則集中。
- 這一層仍可先用 `setInterval`，但應把 timer 與 state transition 從 DOM 層拔出。

**What shipped in this phase:**
- 已新增 `timeline-orchestrator.js`，集中倒數、phase progression、pause/resume、skip/cancel 與 sequence 管理。
- `session-controller.js` 已補上 `advancePhase()` 介面，讓 phase progression 不必再由 `app.js` 直接操縱。
- `app.js` 不再直接持有 `beginPhaseCountdown`、`startCountdownLoop`、`maybePlayCountdownGuidance`、`playPhaseIntroForCurrentPhase`、`playPhaseEndCue`、`cancelActiveTimeline` 等 phase flow 細節。
- 新增 `tests/timeline-orchestrator.test.js`，補足 orchestrator 層的最小單元測試。

**Verification:**
- `npm test`
- `timeline-orchestrator.js` 單元測試已覆蓋：
  - preparing → started 的事件順序
  - pause / resume
  - skip 時取消舊 sequence
  - session complete 流程
- 本地 smoke test 與 GitHub Pages live 驗證皆已完成。

**Exit Criteria:**
- `app.js` 不再直接操作 phase flow 細節。
- 所有 phase progression 規則集中在單一模組。

---

# Phase 3: Upgrade `audio-player.js` into an Audio Engine Abstraction

**Status:** ✅ Completed

**Objective:** 讓音訊層不再綁死「三個固定 Audio 元件」，改成可以逐步支援多軌、優先級與重疊策略的抽象。

**Files:**
- Rename or Create: `audio-engine.js`
- Modify: `audio-player.js`（可保留為相容 wrapper，或逐步退役）
- Modify: `timeline-orchestrator.js`
- Test: `tests/audio-player.test.js`
- Create: `tests/audio-engine.test.js`

**Phase 3 Scope:**
先不求一步到位做完整 Web Audio 混音器，但至少要導入以下抽象：

- `playClip({ track, src, priority, interruptPolicy, duckingGroup })`
- `stopTrack(track)`
- `stopAll()`
- `reset()`
- `preload(clips)`
- `getTrackState(track)`

**Track Suggestions:**
- `narration`
- `cue`
- `guidance-primary`
- `guidance-secondary`（預留）
- `ambient`（預留）

**Implementation Notes:**
- 第一版可先繼續用 `HTMLAudioElement` 實作 engine abstraction。
- 但 API 要先設計成未來能切到 `AudioContext` 而不影響 orchestration 層。
- 把 `playedGuidanceEvents`、`lastPlayedId` 等狀態限制在 engine 內部，不要讓 `app.js` 感知這些細節。

**What shipped in this phase:**
- 已新增 `audio-engine.js`，以 `playClip()` / `stopTrack()` / `stopAll()` / `reset()` / `preload()` / `getTrackState()` 提供抽象音訊層。
- `audio-player.js` 已改為相容 wrapper：保留 `playPhaseIntro()` / `playCountdownGuidance()` / `playPhaseEndCue()` 等既有上層 API，但內部改走 track-based audio engine。
- `timeline-orchestrator.js` 在取消流程時已優先使用 generic `stopAll()`，不再綁死舊的三 audio element 心智模型。
- 新增 `tests/audio-engine.test.js`，並擴充 `tests/audio-player.test.js`、`tests/timeline-orchestrator.test.js`，補齊 audio abstraction 契約。

**Verification:**
- `npm test`（**44/44** 全綠）
- `tests/audio-engine.test.js` 已覆蓋：
  - 同一 track 的 interrupt behavior
  - 不同 track 的獨立 stopTrack
  - preload 去重
  - reset 後狀態清理
- `tests/audio-player.test.js` 已覆蓋 wrapper 的 `getTrackState()` / `stopTrack()` 相容介面。
- `tests/timeline-orchestrator.test.js` 已覆蓋 cancellation 時優先走 generic `stopAll()`。
- 本地 smoke test 與後續 GitHub Pages live 驗證通過。

**Exit Criteria:**
- 上層不再直接假設只有 3 個 Audio 元件。
- 音訊 API 具備未來支援更多 track 的空間。

---

# Phase 4: Move from Phase-Centric Manifest to Timeline/Event Schema

**Objective:** 讓資料層可以表達更複雜的播放規則，不再只靠 JS 寫死 phase intro 與 guidance 事件的關係。

**Files:**
- Modify: `audio/today/narration-manifest.json`
- Modify: `audio/today/narration-source.json`
- Modify: `audio/library/2026-04-27/manifest.json`
- Modify: `audio/library/index.json`
- Create: `audio/schema/timeline-event.schema.json`（可選，但建議）
- Modify: `timer-core.js`
- Modify: `audio-engine.js`
- Modify: `timeline-orchestrator.js`
- Test: `tests/narration-manifest.test.js`

**New Schema Direction:**
每段不只是一個 `countdownGuidance`，而是更清楚的 timeline events，例如：

```json
{
  "track": "guidance-primary",
  "startAtSecond": 12,
  "clipId": "glutes-release",
  "interruptPolicy": "replace-track",
  "duckingGroup": "speech",
  "volume": 1
}
```

**What This Enables:**
- 多層語音
- 不同 track 的重疊規則
- 更明確的 priority / ducking policy
- 未來加入背景節拍、節拍器或 ambience

**Verification:**
- `npm test`
- schema migration test：舊資料如何轉新資料，或新資料如何仍支援既有 phase-01~05 行為

**Exit Criteria:**
- timeline events 成為播放的資料來源，而不是大部分邏輯都寫在 JS 判斷裡。

---

# Phase 5: Introduce Monotonic Time Scheduling

**Objective:** 改善音訊與倒數同步的穩定性，為未來更密集的同播與節拍需求打底。

**Files:**
- Modify: `timeline-orchestrator.js`
- Modify: `audio-engine.js`
- Test: `tests/audio-engine.test.js`
- Test: `tests/app-flow.test.js`

**Implementation Direction:**
- 倒數畫面仍可每秒更新一次，但播放排程不要完全依附 UI tick。
- 優先使用：
  - `performance.now()` 作為 UI/timeline monotonic clock
  - 未來若切到 Web Audio API，可使用 `AudioContext.currentTime`
- 把 event queue 與 UI render queue 分開。

**Verification:**
- 模擬測試：
  - 多事件接近時的順序
  - pause / resume 後的時間恢復
  - skip 後舊事件不可漏播或殘播

**Exit Criteria:**
- 音訊事件觸發不再深度綁死每秒 `setInterval` 的 await 流程。

---

# Phase 6: Optional Migration of View Layer to Vue 3

**Objective:** 只有當 UI 複雜度真的上來時，才把 view layer 遷移到 Vue 3；保留已經穩定的 domain / orchestrator / audio engine。

**Files:**
- Create: `src/`（若要正式遷移）
- Create: `vite.config.js`
- Create: `src/App.vue`
- Create: `src/components/*.vue`
- Create: `src/views/*.vue`
- Preserve: `timer-core.js`, `timeline-orchestrator.js`, `audio-engine.js`

**Migration Trigger (Must Be True Before Starting):**
至少符合其中兩項再開始：
1. 需要多頁/多面板 UI（設定、歷史、課表管理、音軌管理）。
2. 需要大量共享 UI 狀態與複雜表單。
3. View 層開始有大量重複模板與難以維護的 DOM 操作。
4. 需要更強的元件可重用性與開發體驗，而不是只有少量畫面調整。

**Important Rule:**
- 即使遷移 Vue 3，也只遷移 view layer。
- 不要把 `timer-core`、`timeline-orchestrator`、`audio-engine` 又重新寫死在 Vue component 裡。

**Verification:**
- 舊版功能 parity checklist
- `npm test`
- 基本瀏覽器 smoke test

**Exit Criteria:**
- UI 換成 Vue 3，但核心播放與 session 邏輯仍獨立可測。

---

## Recommended Execution Order

依建議順序執行：

1. **Phase 0** — 固定基線測試
2. **Phase 1** — 拆 `app.js`
3. **Phase 2** — 抽 timeline orchestrator
4. **Phase 3** — 建 audio engine abstraction
5. **Phase 4** — 擴 manifest 成 timeline schema
6. **Phase 5** — monotonic scheduling
7. **Phase 6** — 只有達成 migration trigger 才執行

---

## Per-Phase Quality Gates

每一階段都要滿足：

1. `npm test` 全綠
2. 手動 smoke test 通過
3. GitHub Pages 可正常部署
4. commit message 清楚描述單一階段變更
5. 不同階段不要混在同一個超大 commit

---

## Suggested Commit Strategy

- `test: add regression coverage for session and audio flows`
- `refactor: split app view rendering from session logic`
- `refactor: extract timeline orchestrator`
- `refactor: introduce audio engine abstraction`
- `feat: support timeline-driven audio manifest events`
- `refactor: schedule playback with monotonic timing`
- `feat: migrate view layer to vue`（只有真的做 Phase 6 才用）

---

## Immediate Next Step

如果要開始執行，**先從 Phase 0 開始**，不要直接跳到框架遷移。

第一輪最合理的實作任務是：
- 補 baseline regression tests
- 把 `app.js` 先拆成 view + session controller

這兩步做完後，再來動 timeline orchestrator 會安全很多。
