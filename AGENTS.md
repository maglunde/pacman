# AGENTS.md

Onboarding guide for AI agents working in this repository.

---

## Prosjektoversikt

Browser-based Pac-Man clone that renders to a `<canvas>` element and runs a `requestAnimationFrame` game loop. No UI frameworks — pure vanilla JavaScript (ES modules), Vite as bundler, and Sass for styling.

**Tech stack:**
- Language: JavaScript (ES2022, native ES modules)
- Bundler: Vite
- Styling: Sass (`.scss`)
- Audio: Web Audio API
- No runtime dependencies beyond Vite/Sass

```
npm run dev      # dev server → http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the dist/ build
```

---

## Arkitekturprinsipper

**Modular Vanilla JS** — the codebase was split from a single monolithic file into focused ES modules. Each module owns one concern and communicates through the shared `state` object.

- **Single shared mutable state** (`state.js`): all mutable game state lives in one object imported by every module. This is the project's central data bus — there is no pub/sub or event system.
- **Entity pattern**: Pac-Man and ghosts are entity objects with `init()`, `update()`, `draw()` methods. Pac-Man's entity is owned by `pacman-entity.js`; ghosts are created by a factory function `makeGhost()` in `ghost.js`.
- **Tile-based movement**: entities move tile-by-tile. Pixel interpolation happens inside `moveTowardTarget()` in `grid.js`. Post-arrival logic (dot eating, collision checks) belongs in the caller after the return value signals arrival.
- **Single BFS entry point**: all AI pathfinding goes through `pacmanBFS(goalFn, opts)` in `ai.js`. There is no second BFS implementation.
- **Constants over magic numbers**: all tunable values (speeds, timers, grid bounds, AI thresholds) live in `constants.js`. Game logic files must never contain bare numeric literals that represent configuration.

---

## Definerte Sannheter

These rules apply in every change, without exception:

1. **Never use magic numbers in game logic** — add named constants to `constants.js` first.
2. **Never replace the `state` object** — mutate its properties in-place. Modules import the same object reference.
3. **No module-level mutable variables** — the only permitted exceptions are `state.pacman` (owned by `pacman-entity.js`) and `bfsDirOrder` in `ai.js`.
4. **`e.key` / `e.code` for all keyboard events** — `e.which` and `e.keyCode` are deprecated; never use them.
5. **`var` is banned** — declare all variables with `const` or `let` at the top of their scope.
6. **All pathfinding goes through `pacmanBFS`** — do not write a new BFS function; extend the existing one via `opts`.
7. **Always run `npm run build` after changes** — verify the project compiles before considering a task done.
8. **No UI frameworks** — this project is intentionally framework-free; do not introduce React, Vue, or similar.

---

## Kritisk Kontekst

All source lives under `src/`:

| Path | What lives here |
|---|---|
| `src/js/main.js` | Entry point — calls `main()` from `game.js` |
| `src/js/constants.js` | All named constants. Add new values here first. |
| `src/js/state.js` | Single mutable `state` object. All runtime game state. |
| `src/js/grid.js` | Wall queries, coordinate helpers (`wrapCol`, `tilePixel`, `ghostTilePixel`), movement primitives (`applyMove`, `moveTowardTarget`) |
| `src/js/sprite.js` | Sprite sheet parsing and `Sprite.draw()`. Read-only after `initSprites()`. |
| `src/js/pacman-entity.js` | Sets `state.pacman`. Entity has `init()`, `update()`, `draw()`. |
| `src/js/ghost.js` | Ghost factory (`makeGhost`), `initGhosts()`, `bfsReturnPath()`, `ghostLookahead()` |
| `src/js/ai.js` | AI decision loop (`aiDecide()`), single BFS entry point `pacmanBFS(goalFn, opts)` |
| `src/js/dots.js` | Dot/big-dot initialisation and drawing |
| `src/js/audio.js` | Web Audio API waka sound |
| `src/js/hud.js` | Score/lives/level drawing, sliders, path-toggle panel |
| `src/js/game.js` | State machine (`menu → ready → playing → dead/gameover/win`), main loop, keyboard input |
| `src/scss/` | Sass stylesheets |
| `src/assets/` | Sprite sheet and other static assets |

**Key state fields:**
- `state.pacman` — Pac-Man entity (col, row, x, y, targetX, targetY, moving, dir)
- `state.ghosts` — array of 4 ghost objects `[blinky, pinky, inky, clyde]`
- `state.gameState` — `'menu' | 'ready' | 'playing' | 'dead' | 'gameover' | 'win'`
- `state.dots[row][col]` — 1 = present, 0 = eaten
- `state.bigDots` — array of `{ col, row, eaten }`
- `state.scaredTimer` — frames remaining; > 0 means ghosts are scared
- `state.gameSpeed` — speed multiplier (0.25–8.0, default 1.0)
- `state.frames` — global frame counter (never reset)

**`dir` enum** (constants.js): `dir.none = -1`, `dir.left = 0`, `dir.up = 1`, `dir.right = 2`, `dir.down = 3`

**AI decision priority** (aiDecide, runs when `state.pacman.moving === false`):
1. Flee if ghost within `cfg.fleeAt` tiles
2. Strategic power pellet (cluster score or trapped path)
3. Hunt scared ghosts (personality-dependent)
4. Cherry
5. Eat nearest safe dot (time-aware BFS)
6. Fallback flee

**Input bindings**: arrow keys move Pac-Man; `P` pause; `M` mute; `,`/`.` speed; `Z X C V` ghost paths; `B` Pac-Man path; `Q` info panel; `Esc` menu.

---

## Game Loop

`window.requestAnimationFrame` drives a single `loop()` function in `game.js` that calls `update()` then `render()` every frame.

**`update()` — executes in this order each frame:**

1. Increment `state.frames`
2. Early-out for non-playing states (`ready`, `dead`, `gameover`, `win`)
3. Decrement `state.ghostEatenFreezeTimer` — the game is paused for all other updates while this is > 0 (brief freeze when a ghost is eaten)
4. Decrement `state.scaredTimer` (counts down after a power pellet is eaten)
5. Advance `state.scatterTimer` / `state.scatterPhase` — the scatter/chase alternation cycle; pauses while `scaredTimer > 0`
6. Age and cull `state.scorePopups`
7. Tick `state.cherry` timer; spawn cherry at `dotsEaten === CHERRY_DOT_THRESHOLD`
8. `aiDecide()` — sets `state.pacman.nextDir` when `state.aiMode` is true
9. `state.pacman.update()` — moves Pac-Man one step toward its tile target, eats dots, triggers scared mode on big dot
10. `state.ghosts.forEach(g => g.update())` — each ghost updates independently; their movement decisions read `state.scatterPhase` to pick scatter corner vs. chase target
11. Ghost collision — if ghost and Pac-Man share a tile: eat ghost (if scared) or lose a life
12. Win check — count remaining dots; transition to `'win'` if zero

**`render()` — executes every frame regardless of game state:**

1. Clear canvas
2. Draw map sprite
3. Draw dots
4. Draw AI path (Pac-Man) and ghost lookahead paths if enabled
5. Draw each ghost (`draw()` picks sprite based on `returning`, `pendingReturn`, `scaredTimer`)
6. Draw Pac-Man
7. Draw cherry, score popups, and state overlays (`READY!`, `PAUSED`, `GAME OVER`, `LEVEL COMPLETE`)
8. Draw HUD (score, lives, level, sliders)

**Scatter/chase cycle** (`state.scatterPhase`, `state.scatterTimer`):
- Even phase index → scatter (ghosts target `g.scatterTarget` corners)
- Odd phase index → chase (ghosts use `g.getTarget()`)
- Phases (frames at 60 fps): `[420, 1200, 420, 1200, 300, 1200, 300, ∞]`
- Timer is frozen while `scaredTimer > 0`

**Key state fields added alongside scatter:**
- `state.scatterPhase` — current phase index (0 = first scatter)
- `state.scatterTimer` — frames remaining in current phase
- `g.scatterTarget` — `{ col, row }` corner target per ghost (Blinky top-right, Pinky top-left, Inky bottom-right, Clyde bottom-left)

---

## Workflow & Commits

**Before starting work:**
- Read the relevant module(s) before modifying them — do not assume structure from module names alone.
- Identify whether the change belongs in a single module or requires coordinating across `state.js` and a game module.

**During work:**
- Run `npm run build` after every non-trivial change to catch bundler/import errors early.
- If adding a tunable value, add it to `constants.js` first, then reference it.
- If extending BFS behaviour, use `opts.blockFn` or `opts.threatMap` — do not duplicate the BFS loop.

**Debugging approach:**
1. Check `state` fields first — most bugs are incorrect state transitions.
2. Check `constants.js` for off-by-one values before touching logic.
3. Use the in-game path-visualisation toggles (`Z X C V B`) to inspect AI paths live.

**Commit message format** (Conventional Commits):
```
<type>: <short imperative summary>

Optional body explaining *why*, not what.
```

Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `chore`, `test`.

Examples:
```
feat: add scatter mode for blinky during level 2+
fix: prevent ghost from re-entering house after reset
refactor: extract dot-count logic into dots.js
```

- Subject line: ≤ 72 characters, imperative mood, no trailing period.
- Body: explain motivation or non-obvious constraints; skip if self-evident.
- No `WIP` commits on `master` — squash or amend locally first.
Do not commit unless user has said so.
