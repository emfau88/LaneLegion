# Compact Arena pivot

This prototype is intentionally isolated from the existing Lane Legion match.

## Entry points

- `index.html` keeps the original game and offers a **Compact Arena** button.
- `arena.html` starts a separate 1280x720 Phaser game.

## Reused foundation

- Phaser 3, TypeScript, and Vite setup
- existing fighter and enemy spritesheets
- existing hit/heal effect sprites
- the small WebAudio SFX layer
- the idea of a deterministic fixed simulation tick

## Deliberately not reused

- `GameState`, `GameScene`, and the original simulation lifecycle
- workers, mythium, income, sends, factions, and shop logic
- lane leaks, teams, multiplayer AI, king combat, and king upgrades
- the original portrait/mobile layout

The arena owns its data, state, battle system, scene, and UI under `src/arena/`.

## Current proof-of-concept scope

- 7x6 arena with three enemy and three player deployment rows
- four starting fighters: Shield Guard, Ranger, Fire Mage, Healer
- four data-driven encounters with visible enemy formations
- a final Gloom Tyrant boss using the existing ogre sheet
- deterministic automatic battle with targeting, movement, separation, ranged attacks, splash, healing, and tank threat
- 100 HP core as the single loss condition
- 1x/2x speed
- victory/defeat plus retry with the same formation or return to formation editing
- gold rewards between fights
- three deterministic shop offers before each fight and one one-gold reroll
- a roster of up to five deployed fighters plus three reserve slots
- direct reserve deployment by selecting a reserve card and clicking an empty player cell
- one purchasable upgrade per fighter; definitions already use an `upgradePaths` array so a later two-path choice does not require a state rewrite
- run completion after the fourth boss fight

The prototype deliberately stops here. Meta progression, factions, workers, sends, lane leaks, multiplayer state, and persistent saves remain outside the isolated arena pivot.

## Verification

`npm run arena:sim` checks the original protected/exposed formation contrast, deterministic replay, shop and reroll rules, one-time upgrades, rewards, and an economically reachable four-fight clear. The prepared campaign currently resolves in roughly 13-18 seconds per battle.

## Run locally

```sh
npm run dev
```

Open `/arena.html`, or enter through the Compact Arena button in the original menu.
