# AGENTS.md — Pac-Man Refaktor

## Hva er dette prosjektet?

Pac-Man implementert i vanilla JS med et React-lag på toppen for UI/overlay.
Under refaktorering fra en gammel monolitt (`src/js/`) til modulær struktur (`src/game/` + `src/react/`).
De gamle filene under `src/js/` er slettet; alt nytt liv bor i `src/game/` og `src/react/`.

## Stack

- **Vite** — dev server og bundler (`npm run dev` / `npm run build`)
- **React 19** — kun for overlay-UI, ikke selve spillet
- **Sass** — stilark under `src/react/styles/`
- **Vanilla JS (ESM)** — all spillogikk i `src/game/`
- Base path: `/pacman/` (konfigurert i `vite.config.js`)
- Versjonsnummer leses fra `package.json` via Vite `define`

## Arkitektur: to lag

### Spillaget (`src/game/`)

Ren canvas-basert game loop. Ingen React. Kommuniserer med omverdenen kun via det globale `state`-objektet.

| Fil | Ansvar |
|---|---|
| `state.js` | Enkelt mutable objekt — aldri erstatt, bare muter properties |
| `constants.js` | Alle magic numbers, kartdefinisjoner (`MAPS[]`), AI-personligheter |
| `game.js` | `mountGame(el)` — entry point, game loop (`update`/`render`) |
| `game-states.js` | State-maskin-overganger: `newGame`, `nextLevel`, `startReady`, `addScore` |
| `ghost.js` | Ghost-logikk, BFS-retur til hus, `ghostLookahead` for trussel-kart |
| `ai.js` | AI-styring av Pac-Man (kan brukes som spiller eller demo) |
| `grid.js` | Vegg-deteksjon (pixel-basert fra sprite sheet), koordinat-hjelpere |
| `collision.js` | Pac-Man ↔ ghost / dot-kollisjoner |
| `dots.js` | Init og tegning av dots/big dots |
| `draw.js` | Hjelpefunksjoner for canvas-rendering |
| `sprite.js` | Sprite-lasting og sprite-objekt-fabrikk |
| `input.js` | Tastatur- og musinnput |
| `audio.js` | Web Audio API — looping music, lydeffekter |
| `hud.js` | Score, liv, speed/volum-slidere (tegnes på canvas) |
| `menu.js` | Meny-logikk (input-siden) |
| `pacman-entity.js` | Pac-Man-entitet (update + draw) |
| `ghost-render.js` | Ghost-rendering separert fra logikk |
| `pathvis.js` | Debug-visualisering av AI-stier |
| `fruit.js` | Frukt-spawning per nivå |

### React-laget (`src/react/`)

Rendrer overlay-UI over canvas. Les aldri fra React-state for spilldata — bruk `useGameSnapshot`.

| Fil / mappe | Ansvar |
|---|---|
| `main.jsx` | React entry, mounter `<App>` |
| `App.jsx` | Shell: `<GameCanvas>` + `<OverlayUi>` |
| `components/GameCanvas.jsx` | Mounter canvas-elementet, kaller `mountGame(el)` |
| `components/OverlayUi.jsx` | Router for alle overlays basert på `snapshot.gameState` |
| `hooks/useGameSnapshot.js` | Poll `state`-objektet hvert frame via `rAF`, returner flatt snapshot |
| `hooks/useFitScale.js` | CSS-skalering for å passe canvas til vinduet |
| `components/*` | Individuelle overlay-komponenter (meny, pause, gameover, innstillinger osv.) |

## Viktige designvalg

- **`state.js` er single source of truth.** Alle spillmoduler importerer og muterer `state` direkte. React leser kun via `useGameSnapshot` — skriver aldri tilbake.
- **Vegg-deteksjon er pixel-basert.** `grid.js` leser pikselbrightness fra det rendrede sprite-arket for å avgjøre om en tile er vegg (`WALL_BRIGHTNESS_THRESHOLD = 80`). Viktig å forstå ved kart-endringer.
- **Kart-konfigurasjon i `MAPS[]`** (`constants.js`). Hvert kart angir sprite-koordinater, start-posisjoner, big-dot-plasseringer og ghost house-bounds. Alle kart bruker samme `DEFAULT_GHOST_LAYOUT`.
- **AI-personligheter** definert i `AI_PERSONALITIES` i `constants.js` — parametere styrer flukt-terskel, lookahead-dybde, klynge-prioriotering osv.
- **Scatter/chase-syklus** styres av `SCATTER_CHASE_PHASES` — alternerende faser, siste er `Infinity`.
- **Spill-hastighet** er en multiplikator (`state.gameSpeed`), lagret i `localStorage`. Alle tidsavhengige operasjoner multipliserer med denne.
- **Canvas er 1800×1200 px** internt, skalert ned til vinduet via CSS (`useFitScale`). Alt spill-rendering bruker `ctx.scale(2, 2)` for kartet.

## Persistens (localStorage)

| Nøkkel | Innhold |
|---|---|
| `pacman-hi` | High score |
| `pacman-vol` | Volum (0–1) |
| `pacman-speed` | Spill-hastighet multiplikator |
| `pacman-muted` | `'1'` hvis muted |

## Ressursfiler

- `res/sheet-2.png` — Pac-Man sprite sheet (kart + sprites)
- `res/mspacmansheet.png` — Ms. Pac-Man sprite sheet

## Spilltilstander (`state.gameState`)

`'menu'` → `'ready'` → `'playing'` → `'dead'` / `'win'` / `'gameover'`

## Bransjestrategi

- `master` — main branch
- `pm-refaktor` — aktiv refaktoreringsgren

## Søking i koden

Begrens alltid filsøk til `src/` — aldri traverser `node_modules`.
