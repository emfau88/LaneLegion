# Compact Arena roadmap

Stand: 2026-08-08. This is the active roadmap for the isolated autobattler pivot. The root `ROADMAP.md` documents the legacy lane-defense direction.

## POC milestone - complete

- [x] Isolated `arena.html` entry point and `src/arena/` state
- [x] 7x6 formation board with drag and click placement
- [x] Tank, ranged, splash, healing, and backline-hunting combat roles
- [x] Deterministic fixed-tick automatic battles with 1x/2x speed
- [x] Core loss condition and formation retry loop
- [x] Gold rewards and a four-fight run
- [x] Three shop offers before each fight
- [x] One reroll per fight for one gold
- [x] Five deployed slots and three reserve slots
- [x] Direct purchase into field or reserve according to capacity
- [x] Bench and redeploy controls
- [x] One upgrade per fighter
- [x] Upgrade definitions represented as paths for a later two-path choice
- [x] Visible fourth-fight boss encounter
- [x] Deterministic balance/replay smoke coverage
- [x] Production build and local browser verification

## Explicitly deferred

- [ ] Two mutually exclusive upgrade paths per fighter
- [ ] Persistent progression or saves
- [ ] More fighter archetypes and encounter variants
- [ ] Meta map, factions, workers, mythium, sends, kings, or multiplayer
- [ ] Production telemetry, onboarding, and accessibility pass

These items are not required for the compact four-fight proof of concept. They should only enter scope after playtesting validates the formation-shop-upgrade loop.

## Visual redesign

- [x] P0 wide high-fidelity target mockup
- [x] P0 compact 4:5 responsive target mockup
- [x] P0 art-direction and responsive composition specification
- [x] P0 production canvas fills compact browser width instead of floating centrally
- [x] P1 implement the arena, core and HUD art direction in Phaser
  - [x] Hand-painted red/blue rune arena replaces the technical grid backdrop
  - [x] Crystal altar becomes the central Core-health anchor
  - [x] Permanent rules column becomes a compact contextual oath card
  - [x] Shop rows become portrait recruitment cards
  - [x] Roster becomes a portrait rail with field/reserve and tier states
  - [x] Material panels, brass frames, fantasy typography and primary CTA hierarchy
  - [x] Planning, fighter detail, live combat and result states browser-verified
- [ ] P2 guided first-run onboarding and clearer cause/effect combat feedback
