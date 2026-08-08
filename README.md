# Lane Legion

Offline, portrait-first lane-defense autobattler (HTML5 / Phaser 3 / TypeScript / Vite).
No backend, no accounts, no network — fully playable against AI.

## Play in the browser

- **[Play the original Lane Legion](https://emfau88.github.io/LaneLegion/)**
- **[Play the isolated Compact Arena](https://emfau88.github.io/LaneLegion/arena.html)**

Both versions are deployed together on GitHub Pages but use separate entry points
and runtime state. No external editor or preview service is required. On phones,
Compact Arena starts with a landscape/fullscreen handoff; tap a fighter and then
an empty blue tile to place it.

## Compact Arena — playable isolated pivot

Compact Arena is an isolated four-fight autobattler prototype built alongside the
original lane-defense game. It focuses the experience on one readable loop:

1. Inspect the next enemy formation.
2. Start with one Shield Guard, recruit a partner, and grow the field cap from two to five fighters across the run.
3. Start the battle and watch the deterministic simulation resolve automatically.
4. Earn gold, adapt the formation, and defeat the fourth-fight boss.

The pivot has its own entry point (`arena.html`), state, combat model, shop, roster,
four encounters, a progressive 2/3/4/5 team-building curve, and headless smoke simulation under `src/arena/`. The legacy game
remains available through `index.html`; the two modes do not share runtime state.

### Test Compact Arena locally

```bash
npm install
npm run dev
# Open the printed URL with /arena.html, usually:
# http://localhost:5173/arena.html

npm run arena:sim  # deterministic formation and four-fight campaign smoke test
```

Visual direction and implementation status are documented in
[`docs/design/compact-arena-p0.md`](docs/design/compact-arena-p0.md) and
[`docs/compact-arena-roadmap.md`](docs/compact-arena-roadmap.md).

## Run locally

```bash
npm install
npm run dev      # dev server, open the printed URL (works on phone via LAN too)
npm run build    # static web build in dist/
npm run preview  # serve the production build
```

## Headless simulation test

The whole simulation runs without Phaser and can be smoke-tested headlessly
(plays full 1v1/2v2 matches on all difficulties and asserts AI behavior):

```bash
npx -y tsx simcheck.ts
```

## Architecture

- `src/model/` — pure data types (GameState, CombatUnit, definitions). No logic.
- `src/data/` — ALL gameplay values: factions, fighters, waves, mercenaries,
  damage matrix, king upgrades, AI profiles, global config. Tune here.
- `src/systems/` — simulation systems mutating GameState (Phase, Wave, Targeting,
  Movement, Combat, King, Placement, Economy, Send, AI). No Phaser imports.
- `src/core/` — `Simulation` (fixed 20 Hz deterministic tick + human action facade),
  game factory, utilities, seeded RNG.
- `src/scenes/` — Phaser scenes (Boot, MainMenu, FactionSelect, Game, Result).
  Rendering reads GameState and drains visual events; it never contains game rules.
- `src/ui/` — reusable UI components (TopBar, BottomShop, cards, panels).

## Where to tune things

| What | File |
| --- | --- |
| Start gold/workers, king stats, leak rules, grid | `src/data/gameConfig.ts` |
| Factions & passives | `src/data/factions.ts` |
| Fighters (stats, costs, upgrades, auras) | `src/data/fighters.ts` |
| Waves 1–10 (add more for longer matches) | `src/data/waves.ts` |
| Mercenaries (cost, income, stats) | `src/data/mercenaries.ts` |
| Attack-vs-armor multipliers | `src/data/damageMatrix.ts` |
| King upgrade costs/effects | `src/data/kingUpgrades.ts` |
| AI difficulty behavior | `src/data/aiProfiles.ts` |
