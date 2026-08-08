# Compact Arena P0 visual target

Status: approved direction and implemented wide-layout baseline. P0 defines the target and responsive composition; P1 transfers its arena, Core and HUD language into the playable Phaser scene without changing the deterministic battle model.

## Target screens

- Wide 16:9: `public/design/compact-arena-p0-wide.png`
- Compact 4:5: `public/design/compact-arena-p0-compact.png`
- Responsive local preview: `/arena-concept.html`

## Art direction

- Heroic dark fantasy rather than a technical dashboard
- Carved slate, dark wood, aged brass, leather tabs and parchment accents
- Warm gold for primary actions, restrained ember red for danger, moon blue for allied magic
- A luminous crystal core altar is the visual anchor
- The placement grid remains functional but is integrated as carved floor sigils
- Fighter sprites are grounded by shadows, selection rings and the arena lighting
- Panels use strong material frames and hierarchy rather than repeated thin rectangles

## Information hierarchy

1. Arena and formation
2. Fight number, gold and core health
3. Next-fight preview and shop decisions
4. Roster and reserve state
5. One dominant `START BATTLE` action

The permanent rules column is replaced by a compact contextual objective. The shop uses three illustrated offer cards. The roster uses portrait cards with tier, role and explicit field/reserve states.

## Responsive composition

### Wide layout (`aspect-ratio > 4:3`)

- Single compact resource ribbon across the top
- Contextual objective card integrated at the left arena edge
- Arena occupies the center and remains the largest element
- Next fight and shop occupy the right preparation rail
- Roster forms a large bottom card rail
- Start Battle anchors the lower-right corner

### Compact layout (`aspect-ratio <= 4:3`)

- Compact resource header across the top
- Objective collapses into a small arena-edge banner
- Arena occupies the full available width in the upper half
- Next fight and shop move into a preparation drawer below the arena
- Roster becomes a horizontal rail
- Start Battle becomes a sticky full-width bottom action

The production arena page fills the available width and aligns to the top at compact aspect ratios instead of remaining a small centered island. A dedicated portrait/4:5 Phaser reflow remains a later responsive task after first-run onboarding is validated.

## P1 implementation

- Production arena background: `src/assets/arena/compact-arena-floor-p1.png`
- Playable scene and interaction layout: `src/arena/scenes/ArenaScene.ts`
- Shared material panels, fantasy headings and beveled buttons: `src/arena/ui/ArenaTheme.ts`
- Planning HUD, portrait shop, fighter detail, live-combat state and result dialog use the same material language
- Browser verification covers buying a fighter, selecting details, starting battle, switching to 2x speed and reaching victory
- Deterministic `arena:sim` campaign coverage remains green across all four fights

## Non-negotiable constraints

- No black letterboxed presentation as the intended layout
- No spreadsheet rows or generic dashboard panels
- No tiny body text or thin low-contrast outlines
- No loss of visible enemy formation, gold, core health, roster, reserve or speed control
- No changes to the deterministic battle model during the visual redesign
