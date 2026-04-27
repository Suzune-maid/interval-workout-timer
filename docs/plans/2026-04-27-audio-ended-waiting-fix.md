# 2026-04-27 Audio ended waiting fix

## Problem
使用者回報目前正式站的實際行為仍然是「階段語音與倒數同時開始」，只有額外多了開始／結束音效。這表示先前的 phase audio cue v2 只驗到 `audio.play()` 被呼叫，沒有驗到「倒數要等語音與 cue 真正播完」。

## Root cause
`audio-player.js` 原本的 `playPhaseIntro()` 與 `playPhaseEndCue()` 只 `await audio.play()`。
但 `HTMLMediaElement.play()` resolve 的語意是「瀏覽器接受開始播放」，不是「音訊已播放完畢」。因此 `app.js` 的 `beginPhaseCountdown()` 雖然有 `await narrationPlayer.playPhaseIntro(...)`，仍會在音訊剛開始時就把計時器切進 running。

## Fix strategy
1. 先補 regression tests，要求 phase intro / end cue 一定要等到 `ended` 才 resolve。
2. 將 `audio-player.js` 改成以 controller 包裝 `Audio`，等待 `ended` / `error` 事件，而不是只等 `play()`。
3. reset / 中斷時要能取消等待中的播放 promise，避免卡死或 race condition。
4. 保留原本的 UX：full 模式同段不重播、cue-only 恢復模式只播開始音效。

## Verification plan
1. 跑 `npm test`。
2. 本機開靜態伺服器，用瀏覽器 monkeypatch `HTMLMediaElement.play` 與 `setInterval`，確認在 phase intro 尚未送出 `ended` 前，不會建立倒數 interval。
3. push 後再到 GitHub Pages 做同樣 smoke test，確認 live 版本也等到音訊播完才開始倒數。
