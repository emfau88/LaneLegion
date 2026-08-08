# Compact Arena P0 visual target

Status: historical P0 direction, superseded by the brighter P1.6 arena pivot. The responsive composition remains useful, but the dark-fantasy material language and Core objective are no longer current.

## Target screens

- Wide 16:9: `public/design/compact-arena-p0-wide.png`
- Compact 4:5: `public/design/compact-arena-p0-compact.png`
- Responsive local preview: `/arena-concept.html`

## Art direction

- Friendly sunlit tournament fantasy rather than dark fantasy or a technical dashboard
- Ivory sandstone, painted wood, cloth banners, greenery and restrained honey-gold accents
- Sky blue and turquoise for the player, coral and terracotta for rivals
- The formation itself is the visual anchor; fights end when one team is eliminated
- The placement grid remains functional but is integrated as carved floor sigils
- Fighter sprites are grounded by shadows, selection rings and the arena lighting
- Panels use strong material frames and hierarchy rather than repeated thin rectangles

## Information hierarchy

1. Arena and formation
2. Fight number, gold and rival identity
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

The production arena page uses a safe-area-aware fullscreen landscape shell on coarse-pointer phones instead of shrinking the full desktop HUD into portrait. A dedicated portrait/4:5 Phaser reflow remains a P2 responsive task alongside first-run onboarding.

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
- No loss of visible enemy formation, gold, field/reserve capacity or speed control
- No changes to the deterministic battle model during the visual redesign
