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
- [x] P1.5 direct mobile delivery and landscape touch hardening
  - [x] Separate GitHub Pages links for legacy and Compact Arena; no external preview dependency
  - [x] Portrait handoff into fullscreen landscape play with manual-rotation fallback
  - [x] Safe-area viewport handling and scroll/overscroll containment
  - [x] Larger coarse-pointer hit areas and tap-first placement guidance
- [ ] P2 guided first-run onboarding and clearer cause/effect combat feedback
  - [ ] Guided four-step first run: recruit, select, place, start battle
  - [ ] Explicit target/reach/threat visualization while a fighter is selected
  - [ ] Short post-fight explanation of decisive events and formation weaknesses
  - [ ] Dedicated 4:5 Phaser reflow instead of landscape gating

  **Exit criterion:** a first-time mobile player can finish fight one without external explanation and can name why the formation won or lost.

- [ ] P3 production-level visual and game-feel pass
  - [ ] Replace remaining programmatic rectangles with one coherent carved-stone/brass UI atlas
  - [ ] Give every fighter a production portrait/card illustration and a stronger role silhouette
  - [ ] Establish one icon language for role, tier, field/reserve, gold, health and threat
  - [ ] Add selection, placement, attack, heal, death and Core-hit VFX with restrained camera response
  - [ ] Add transition choreography between planning, combat and results instead of hard state swaps
  - [ ] Normalize typography, contrast, spacing and minimum readable size across desktop and phone

  **Exit criterion:** planning, combat and result screenshots read as the same authored fantasy product, not as a styled prototype.

- [ ] P4 strategic depth and replayability
  - [ ] Two mutually exclusive upgrade paths per fighter
  - [ ] Additional archetypes and encounter traits that force different formations
  - [ ] Shop odds, reroll economy and rewards balanced over repeated seeded runs
  - [ ] Run summary with roster, decisive choices and completion time

  **Exit criterion:** at least three meaningfully different winning builds exist and repeat runs create new decisions.

- [ ] P5 release hardening
  - [ ] Persistent settings and optional local run/progression save
  - [ ] Accessibility pass: reduced motion, contrast, scalable copy and non-drag controls
  - [ ] PWA/offline packaging, loading-state polish and low-end phone performance budget
  - [ ] Cross-browser device matrix for iOS Safari, Android Chrome and embedded browsers

  **Exit criterion:** the GitHub Pages build is installable, recoverable and stable for a public mobile playtest.
