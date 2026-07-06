# Lane Legion

Offline, portrait-first lane-defense autobattler (HTML5 / Phaser 3 / TypeScript / Vite).
No backend, no accounts, no network — fully playable against AI.

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
