# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"Fin & Hook" — a single-page browser game (canvas-based) where a fish avoids
swinging fishing hooks. No build step, no package manager, no dependencies,
no test suite: the entire app is `index.html` + `style.css` + `game.js`.

## Running the game

There is no build/lint/test tooling in this repo. To develop or verify a
change, just serve the static files and open them in a browser:

```
python3 -m http.server 8000   # or any static file server
```

Then open `http://localhost:8000`. Opening `index.html` directly via
`file://` also works.

Verify changes manually in-browser (movement, hook collisions, pickups,
pause, game-over/restart) — there are no automated tests to lean on.

## Architecture

Everything lives in the IIFE in `game.js`, driven by a single
`requestAnimationFrame` loop (`loop()` at the bottom of the file) that each
frame calls `game.update(dt)` → `game.draw(ctx)` → `game.renderHud()`.

- **`Game`** — top-level state machine (`running` / `paused` / `gameOver`),
  owns the `Fish`, arrays of `Hook`s and `Pickup`s, elapsed time, score, and
  the `effects` map of active timed buffs/debuffs. `level` is derived
  purely from elapsed time (`1 + floor(elapsed / 15)`), and hook count/speed
  scale with `level` via `targetHookCount()` and `Hook.reset()`.
- **`Fish`** — the player entity. Reads keyboard state (`keys` Set) and/or a
  drag target (`pointerTarget`) each frame in `update(dt, effects)`; applies
  effect modifiers (reversed controls, speed boost/slow) before moving.
- **`Hook`** — obstacles that fall from the top of the screen swinging
  sinusoidally (`anchorX + sin(t*freq+phase)*amplitude`), and `reset()`
  once they pass the bottom. Collision is a simple radius check
  (`collides()`).
- **`Pickup`** — timed power-ups/power-downs defined declaratively in
  `PICKUP_TYPES` (`good`/color/symbol/label). `Game.applyPickup()` maps a
  pickup's `key` to an entry in `EFFECT_DURATIONS`/`effects`; power-downs
  are ignored while `effects.shield > 0`.
- **Effects system** — `Game.effects` is a plain object of countdown timers
  (seconds remaining); `Game.update()` decrements every key each frame.
  Adding a new timed effect means: add a default in `reset()`, a duration
  in `EFFECT_DURATIONS`, the countdown/gating logic wherever it's consumed
  (`Fish.update`, `Game.update`, `Game.draw`), and a label in
  `renderHud()`'s `labels` map.
- **High score** — persisted to `localStorage` under key
  `finAndHook.highScore` via `getHighScore()`/`setHighScore()` at the top of
  `game.js`. This is the only persistence in the app.
- **DOM/canvas split** — HUD, menu, game-over, and pause screens are plain
  DOM overlays in `index.html` (shown/hidden via the `.hidden` class);
  gameplay itself is drawn to `<canvas id="game-canvas">` by `Game.draw()`.
  Keep this split when adding UI: new gameplay visuals go through canvas
  drawing code, new menus/HUD elements go in `index.html` + `style.css`.
