import type { ArenaPlacement } from '../model/ArenaTypes';

export interface ArenaEncounterDefinition {
  id: string;
  name: string;
  subtitle: string;
  reward: number;
  boss: boolean;
  enemyPlacements: ArenaPlacement[];
  summary: Array<{ label: string; detail: string; warning?: boolean }>;
}

export const ARENA_ENCOUNTERS: ArenaEncounterDefinition[] = [
  {
    id: 'first_contact',
    name: 'FIRST CONTACT',
    subtitle: 'A readable test of frontline and backline.',
    reward: 3,
    boss: false,
    enemyPlacements: [
      { definitionId: 'enemy_melee', col: 2, row: 2 },
      { definitionId: 'enemy_fast', col: 0, row: 1 },
      { definitionId: 'enemy_tank', col: 5, row: 2 },
      { definitionId: 'enemy_ranged', col: 3, row: 0 }
    ],
    summary: [
      { label: '2 FRONTLINE', detail: 'Grunt + Bulwark' },
      { label: '1 RANGED', detail: 'Gloom Spitter' },
      { label: '1 FAST', detail: 'Hunts exposed support', warning: true }
    ]
  },
  {
    id: 'broken_wedge',
    name: 'BROKEN WEDGE',
    subtitle: 'More bodies, two attack angles.',
    reward: 4,
    boss: false,
    enemyPlacements: [
      { definitionId: 'enemy_melee', col: 1, row: 2 },
      { definitionId: 'enemy_melee', col: 5, row: 2 },
      { definitionId: 'enemy_fast', col: 6, row: 1 },
      { definitionId: 'enemy_tank', col: 3, row: 2 },
      { definitionId: 'enemy_ranged', col: 2, row: 0 }
    ],
    summary: [
      { label: '3 FRONTLINE', detail: 'A wide wedge' },
      { label: '1 RANGED', detail: 'Left of center' },
      { label: '1 FAST', detail: 'Approaches from right', warning: true }
    ]
  },
  {
    id: 'red_tide',
    name: 'RED TIDE',
    subtitle: 'A crowd built to punish a thin line.',
    reward: 5,
    boss: false,
    enemyPlacements: [
      { definitionId: 'enemy_melee', col: 1, row: 2 },
      { definitionId: 'enemy_melee', col: 5, row: 2 },
      { definitionId: 'enemy_fast', col: 0, row: 1 },
      { definitionId: 'enemy_tank', col: 3, row: 2 },
      { definitionId: 'enemy_ranged', col: 3, row: 0 }
    ],
    summary: [
      { label: '3 FRONTLINE', detail: 'Centered pressure' },
      { label: '1 RANGED', detail: 'Protected center' },
      { label: '1 FAST', detail: 'Left flank threatens', warning: true }
    ]
  },
  {
    id: 'gloom_throne',
    name: 'GLOOM THRONE',
    subtitle: 'Boss fight. Break the tyrant before the core.',
    reward: 0,
    boss: true,
    enemyPlacements: [
      { definitionId: 'enemy_fast', col: 0, row: 1 },
      { definitionId: 'enemy_boss', col: 3, row: 1 },
      { definitionId: 'enemy_tank', col: 5, row: 2 },
      { definitionId: 'enemy_ranged', col: 3, row: 0 }
    ],
    summary: [
      { label: 'BOSS', detail: 'Gloom Tyrant + splash', warning: true },
      { label: '1 BULWARK', detail: 'Protects the advance' },
      { label: '2 SUPPORT', detail: 'Fast flank + ranged' }
    ]
  }
];

export const arenaEncounter = (fightIndex: number): ArenaEncounterDefinition =>
  ARENA_ENCOUNTERS[Math.max(0, Math.min(ARENA_ENCOUNTERS.length - 1, fightIndex))];
