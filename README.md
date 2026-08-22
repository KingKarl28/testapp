# Fin & Hook

A browser game where a fish has to swim around and avoid fishing hooks. No
build step or dependencies — just open `index.html`, or serve the folder
with any static file server.

## How to play

- Move with **Arrow Keys** / **WASD**, or click-and-drag with the mouse /
  touch.
- Avoid the swinging hooks — touching one ends the run.
- Press **P** to pause/resume.

## Features

- **Increasing difficulty** — every 15 seconds the level goes up, adding
  more hooks and making them swing faster and wider.
- **High score** — persisted in `localStorage` via `getHighScore()` /
  `setHighScore()` in `game.js`, so your best run is remembered between
  visits.
- **Power-ups** (green, good): Shield (temporary invincibility), Slow-Mo
  (slows all hooks), Bonus (instant points), Speed Up (faster swimming).
- **Power-downs** (red, bad): Reversed controls, Weighed Down (slower
  swimming), Inked (vision fogs around the fish). All are blocked while a
  shield is active.

## Files

- `index.html` — page structure and HUD/menu screens
- `style.css` — styling
- `game.js` — game loop, entities, scoring, and high-score persistence
