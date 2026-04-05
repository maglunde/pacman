# AGENTS.md

## Project

Browser-based Pac-Man clone. Vite + Sass, no frameworks. The game renders to a `<canvas>` element and runs a `requestAnimationFrame` loop.

```
npm run dev      # dev server (http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # preview the dist/ build
```

Always run `npm run build` after making changes to verify the project compiles.

---

## Module map

All source lives in `src/js/`. Modules are ES modules loaded via `src/js/main.js`.

| File | Responsibility |
|---|---|
| `constants.js` | All named constants (speeds, timers, grid bounds, AI tuning). Add new constants here — never use magic numbers in game logic. |
| `state.js` | Single mutable `state` object shared across all modules. All mutable game state lives here. Never replace the object; mutate properties in-place. |
| `grid.js` | Wall queries, coordinate helpers (`wrapCol`, `tilePixel`, `ghostTilePixel`), movement primitives (`applyMove`, `moveTowardTarget`). |
| `sprite.js` | Sprite sheet parsing and `Sprite.draw()`. Read-only after `initSprites()`. |
| `pacman-entity.js` | Sets `state.pacman` at module load. The entity object has `init()`, `update()`, `draw()`. |
| `ghost.js` | Ghost factory (`makeGhost`), `initGhosts()`, `bfsReturnPath()`, `ghostLookahead()`. Ghost state is stored on each ghost object inside `state.ghosts`. |
| `ai.js` | AI decision loop (`aiDecide()`). Single BFS entry point: `pacmanBFS(goalFn, opts)` where `opts` accepts `blockFn` and/or `threatMap`. Four selectable personalities in `constants.js`. |
| `dots.js` | Dot/big-dot initialisation and drawing. |
| `audio.js` | Web Audio API waka sound. |
| `hud.js` | Score/lives/level drawing, volume and speed sliders, path-toggle panel. Slider event handlers share `sliderMouseDown()` and `drawSliderTrack()` helpers. |
| `game.js` | Game state machine (`menu → ready → playing → dead/gameover/win`), main `update()` + `render()` loop, keyboard input. |
| `main.js` | Entry point — calls `main()` from `game.js`. |

---

## Key data structures

### `state` (state.js)
All mutable fields. Important ones:
- `state.pacman` — the Pac-Man entity (set by pacman-entity.js at module load)
- `state.ghosts` — array of 4 ghost objects [blinky, pinky, inky, clyde]
- `state.gameState` — `'menu' | 'ready' | 'playing' | 'dead' | 'gameover' | 'win'`
- `state.dots[row][col]` — 1 = dot present, 0 = eaten
- `state.bigDots` — array of `{ col, row, eaten }`
- `state.scaredTimer` — frames remaining; > 0 means ghosts are scared
- `state.gameSpeed` — speed multiplier (0.25–8.0, default 1.0)
- `state.frames` — global frame counter (never reset)

### Entity shape (pacman + each ghost)
Both share: `col`, `row`, `x`, `y`, `targetX`, `targetY`, `moving`, `dir`.
Ghosts additionally: `exited`, `returning`, `pendingReturn`, `immune`, `releaseFrame`, `bounceDir`, `returnPath`.

### `dir` enum (constants.js)
`dir.none = -1`, `dir.left = 0`, `dir.up = 1`, `dir.right = 2`, `dir.down = 3`

---

## Movement model

Entities move tile-by-tile. `applyMove(entity, dc, dr)` sets the next tile target; `moveTowardTarget(entity, spd)` interpolates pixel-by-pixel each frame, sets `entity.moving = false` and returns `true` on arrival. Post-arrival logic (dot eating, exit detection) belongs in the caller after checking the return value.

---

## AI

`aiDecide()` runs once per frame when `state.pacman.moving === false`. Decision priority:
1. Flee (BFS flee scoring) if ghost within `cfg.fleeAt` tiles
2. Strategic power pellet if cluster score threshold met or path is trapped
3. Hunt scared ghosts (if personality allows)
4. Cherry
5. Eat nearest safe dot (time-aware BFS)
6. Fallback flee

`pacmanBFS(goalFn, opts)` — shared BFS from Pac-Man's position. Pass `opts.threatMap` for time-aware ghost avoidance, `opts.blockFn` to treat certain tiles as impassable. Returns first direction toward goal and writes full path to `state.aiPath`.

---

## Conventions

- **No magic numbers in logic code** — all tunable values belong in `constants.js`.
- **No `var` hoisting bugs** — all variables are declared at the top of their scope.
- **State mutation only through `state.*`** — no module-level mutable variables except `state.pacman` (owned by pacman-entity.js) and the internal `bfsDirOrder` in ai.js.
- **`e.key` / `e.code` for keyboard events** — `e.which` is deprecated and must not be used.
- Input: arrow keys move Pac-Man; `P` pause; `M` mute; `,`/`.` speed; `Z X C V` ghost paths; `B` Pac-Man path; `Q` info panel; `Esc` menu.
