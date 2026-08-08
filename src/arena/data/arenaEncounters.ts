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
    subtitle: 'Build your first duo and learn the formation line.',
    reward: 4,
    boss: false,
    enemyPlacements: [
      { definitionId: 'enemy_melee', col: 2, row: 2 },
      { definitionId: 'enemy_melee', col: 5, row: 2 }
    ],
    summary: [
      { label: '2 FRONTLINE', detail: 'A readable first line' },
      { label: 'NO BACKLINE', detail: 'Learn basic positioning' },
      { label: 'TEAM CAP 2', detail: 'Recruit your first partner' }
    ]
  },
  {
    id: 'broken_wedge',
    name: 'BROKEN WEDGE',
    subtitle: 'A third field slot opens against a balanced trio.',
    reward: 5,
    boss: false,
    enemyPlacements: [
      { definitionId: 'enemy_melee', col: 1, row: 2 },
      { definitionId: 'enemy_tank', col: 4, row: 2 },
      { definitionId: 'enemy_ranged', col: 3, row: 0 }
    ],
    summary: [
      { label: '2 FRONTLINE', detail: 'Grunt + Bulwark' },
      { label: '1 RANGED', detail: 'Protected center', warning: true },
      { label: 'TEAM CAP 3', detail: 'One new field slot' }
    ]
  },
  {
    id: 'red_tide',
    name: 'RED TIDE',
    subtitle: 'Four rivals test the shape of your growing squad.',
    reward: 6,
    boss: false,
    enemyPlacements: [
      { definitionId: 'enemy_melee', col: 1, row: 2 },
      { definitionId: 'enemy_fast', col: 0, row: 1 },
      { definitionId: 'enemy_tank', col: 3, row: 2 },
      { definitionId: 'enemy_ranged', col: 3, row: 0 }
    ],
    summary: [
      { label: '2 FRONTLINE', detail: 'Centered pressure' },
      { label: '1 RANGED', detail: 'Protected center' },
      { label: '1 FAST', detail: 'Left flank threatens', warning: true }
    ]
  },
  {
    id: 'gloom_throne',
    name: 'GLOOM THRONE',
    subtitle: 'Boss fight. Break the tyrant and clear the arena.',
    reward: 0,
    boss: true,
    enemyPlacements: [
      { definitionId: 'enemy_fast', col: 0, row: 1 },
      { definitionId: 'enemy_melee', col: 1, row: 2 },
      { definitionId: 'enemy_boss', col: 3, row: 1 },
      { definitionId: 'enemy_melee', col: 5, row: 2 },
      { definitionId: 'enemy_ranged', col: 3, row: 0 }
    ],
    summary: [
      { label: 'BOSS', detail: 'Gloom Tyrant + splash', warning: true },
      { label: '2 GRUNTS', detail: 'Guard the tyrant' },
      { label: '2 SUPPORT', detail: 'Fast flank + ranged' }
    ]
  }
];

export const arenaEncounter = (fightIndex: number): ArenaEncounterDefinition =>
  ARENA_ENCOUNTERS[Math.max(0, Math.min(ARENA_ENCOUNTERS.length - 1, fightIndex))];
