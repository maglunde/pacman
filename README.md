# Pac-Man

Klassisk Pac-Man i nettleseren, bygget med vanilla JavaScript og Canvas API. Støtter manuell spilling, AI-modus med fire personligheter, og 2-spiller ghostkontroll.

## Kom i gang

```bash
npm install
npm run dev      # åpner spillet lokalt
npm run build    # produksjonsbygg til dist/
```

## Spillmodi

| Modus | Beskrivelse |
|---|---|
| Spill selv | Klassisk Pac-Man med piltaster |
| La AI spille | AI-agent med valgbar personlighet |
| 2-spiller ghost | Kontroller én ghost manuelt mens AI styrer de andre |

### AI-personligheter

- **Coward** – flykter tidlig, tar ingen sjanser
- **Balanced** – balansert og effektiv
- **Aggressive** – jakter aktivt på ghosts
- **Greedy** – maksimerer poeng, tar risiko

AI-en bruker BFS-padsøk, trusselmapping og felledeteksjon.

## Kontroller

| Tast | Handling |
|---|---|
| Piltaster | Flytt Pac-Man |
| `P` | Pause |
| `M` | Lyd av/på |
| `,` / `.` | Senk/øk hastighet |
| `Z X C V` | Vis/skjul ghost-stier |
| `B` | Vis/skjul Pac-Man-sti (AI-modus) |
| `I` | Bytt ghost-indikatorstil |
| `Q` | Vis/skjul info-panel |
| `Esc` | Pausemeny / tilbake til meny |
| `Tab` | Velg ghost å kontrollere |
| `Enter` | Ta over valgt ghost |

## Teknisk

- **Bundler:** Vite
- **Språk:** Vanilla JS (ES-moduler), Sass
- **Lyd:** Web Audio API
- **Lagring:** `localStorage` (highscore, volum, hastighet)
