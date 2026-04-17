# AGENTS.md — Pac-Man

## What is this project?

Pac-Man implemented in vanilla JS with a React layer on top for UI/overlays.
Refactored from an old monolith (`src/js/`) to a modular structure (`src/game/` + `src/react/`).
All new code lives in `src/game/` and `src/react/`.

## Stack

- **Vite** — dev server and bundler (`npm run dev` / `npm run build`)
- **React 19** — overlay UI only, not the game itself
- **Sass** — stylesheets under `src/react/styles/`
- **Vanilla JS (ESM)** — all game logic in `src/game/`
- **Supabase** — leaderboard backend (`src/lib/`)
- Base path: `/pacman/` (configured in `vite.config.js`)
- Version number read from `package.json` via Vite `define`

## Architecture: two layers

### Game layer (`src/game/`)

Pure canvas-based game loop. No React. Communicates with the outside world only via the global `state` object.

| File | Responsibility |
|---|---|
| `state.js` | Single mutable object — never replace, only mutate properties |
| `constants.js` | All magic numbers, map definitions (`MAPS[]`), AI personalities |
| `game.js` | `mountGame(el)` — entry point, game loop (`update`/`render`) |
| `game-states.js` | State machine transitions: `newGame`, `nextLevel`, `startReady`, `addScore` |
| `ghost.js` | Ghost logic, BFS return to house, `ghostLookahead` for threat map |
| `ai.js` | AI control of Pac-Man (used as player or demo) |
| `grid.js` | Wall detection (pixel-based from sprite sheet), coordinate helpers |
| `collision.js` | Pac-Man ↔ ghost / dot collisions |
| `dots.js` | Init and drawing of dots/big dots |
| `draw.js` | Canvas rendering helpers |
| `sprite.js` | Sprite loading and sprite object factory |
| `input.js` | Keyboard and mouse input |
| `audio.js` | Web Audio API — looping music, sound effects |
| `hud.js` | Score, lives, speed/volume sliders (drawn on canvas) |
| `menu.js` | Menu logic (input side) |
| `pacman-entity.js` | Pac-Man entity (update + draw) |
| `ghost-render.js` | Ghost rendering separated from logic |
| `pathvis.js` | Debug visualization of AI paths |
| `fruit.js` | Fruit spawning per level |

### React layer (`src/react/`)

Renders overlay UI on top of the canvas. Never read from React state for game data — use `useGameSnapshot`.

| File / folder | Responsibility |
|---|---|
| `main.jsx` | React entry, mounts `<App>` |
| `App.jsx` | Shell: `<GameCanvas>` + `<OverlayUi>` |
| `components/GameCanvas.jsx` | Mounts canvas element, calls `mountGame(el)` |
| `components/OverlayUi.jsx` | Router for all overlays based on `snapshot.gameState` |
| `hooks/useGameSnapshot.js` | Polls `state` object every frame via `rAF`, returns flat snapshot |
| `hooks/useFitScale.js` | CSS scaling to fit canvas to window |
| `components/*` | Individual overlay components (menu, pause, gameover, settings, leaderboard, etc.) |

### Lib layer (`src/lib/`)

| File | Responsibility |
|---|---|
| `supabase.js` | Lazy-initialized Supabase client with env guard — returns `null` if env vars are missing |
| `scores.js` | `submitScore()` and `fetchTopScores()` — writes to `anonymous_scores`, reads from `anonymous_leaderboard` view |

## Key design decisions

- **`state.js` is single source of truth.** All game modules import and mutate `state` directly. React reads only via `useGameSnapshot` — never writes back.
- **Wall detection is pixel-based.** `grid.js` reads pixel brightness from the rendered sprite sheet to determine if a tile is a wall (`WALL_BRIGHTNESS_THRESHOLD = 80`).
- **Map configuration in `MAPS[]`** (`constants.js`). Each map specifies sprite coordinates, start positions, big dot placements and ghost house bounds.
- **AI personalities** defined in `AI_PERSONALITIES` in `constants.js` — parameters control escape threshold, lookahead depth, cluster prioritization, etc.
- **Scatter/chase cycle** controlled by `SCATTER_CHASE_PHASES` — alternating phases, last one is `Infinity`.
- **Game speed** is a user-visible multiplier (`state.gameSpeed`, scale 0.25–8×), stored in `localStorage`. All internal game logic uses `state.effectiveSpeed` (= `gameSpeed * 2`). Never change `gameSpeed` directly in logic — use `effectiveSpeed`.
- **Game loop** uses fixed timestep with accumulator (`TICK_MS = 1000/60`). `update()` runs an integer number of times per `requestAnimationFrame` callback based on actual elapsed time. Max 5 catch-up ticks per frame.
- **Canvas is 1800×1200 px** internally, scaled down to the window via CSS (`useFitScale`). All game rendering uses `ctx.scale(2, 2)` for the map.

## Persistence (localStorage)

| Key | Content |
|---|---|
| `pacman-hi` | High score |
| `pacman-vol` | Volume (0–1) |
| `pacman-speed` | Game speed multiplier |
| `pacman-muted` | `'1'` if muted |
| `pacman-username` | Last used display name for leaderboard submit |

## Supabase / leaderboard

- **`anonymous_scores`** table — writes are locked to `service_role` only (see
  `supabase/migrations/0001_lockdown_scores.sql`). Anon cannot INSERT.
- **`anonymous_leaderboard`** view — deduplicates by `display_name`, returns best score per name, ordered by score desc. Anon SELECT is open.
- **Score submission goes through two edge functions** in `supabase/functions/`:
  - `start-game` — issues an HMAC-signed session token (uses `SESSION_SECRET`)
  - `submit-score` — verifies token freshness, plausibility, one-shot use
    (`used_sessions`) and per-IP rate limit (`submit_rate`), then inserts via
    `service_role`
- Both edge functions enforce an **origin allowlist** (`_shared/origin.ts`).
  Allowed origins are configured via the `ALLOWED_ORIGINS` env var
  (comma-separated); defaults to production + local-dev ports. Requests with
  missing or non-allowlisted `Origin` get `forbidden_origin` (HTTP 403).
- `submit-score` also verifies a **Cloudflare Turnstile** token when
  `TURNSTILE_SECRET` is set (`_shared/turnstile.ts`). The client fetches the
  token via `src/lib/turnstile.js` using `VITE_TURNSTILE_SITE_KEY`. When either
  var is missing (e.g. local dev) captcha is skipped.
- Client calls `startGameSession()` in `newGame()` and passes the resulting
  token to `submitScore()` — see `src/lib/scores.js`
- Supabase env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_TURNSTILE_SITE_KEY`) must be set as GitHub Actions secrets for
  production builds — they are not committed to the repo
- Edge-function secrets (`SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
  `TURNSTILE_SECRET`, optional `ALLOWED_ORIGINS`) must be set via
  `supabase secrets set` or the dashboard — never in the client bundle
- The client is lazy-initialized; if env vars are missing the leaderboard feature degrades silently without crashing the app
- A future `scores` table exists for authenticated users (Google/GitHub OAuth via Supabase Auth) — do not modify it

## Game states (`state.gameState`)

`'menu'` → `'ready'` → `'playing'` → `'dead'` / `'win'` / `'gameover'`

## Menu sub-states (`state.menuSubState`)

`'main'` | `'personality'` | `'settings'` | `'leaderboard'`

## Asset files

- `res/sheet-2.png` — Pac-Man sprite sheet (map + sprites)
- `res/mspacmansheet.png` — Ms. Pac-Man sprite sheet

## Branch strategy

- `master` — main branch

## Searching the codebase

Always limit file searches to `src/` — never traverse `node_modules`.

## Commit messages

All commit messages must be written in English.
