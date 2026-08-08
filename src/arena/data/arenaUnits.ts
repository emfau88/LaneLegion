import type { ArenaUnitDefinition } from '../model/ArenaTypes';

export const ARENA_UNIT_DEFINITIONS: ArenaUnitDefinition[] = [
  {
    id: 'shield_guard',
    name: 'Shield Guard',
    role: 'tank',
    blurb: 'Good at standing in the way.',
    hp: 460,
    damage: 17,
    attackInterval: 1.05,
    range: 0.68,
    moveSpeed: 1.08,
    radius: 0.34,
    attackStyle: 'impact',
    assetKind: 'fighter',
    assetId: 'shield_guard',
    cost: 4,
    upgradePaths: [
      {
        id: 'bastion',
        name: 'Bastion Plate',
        blurb: '+35% health and +15% damage.',
        cost: 4,
        hpMultiplier: 1.35,
        damageMultiplier: 1.15
      }
    ]
  },
  {
    id: 'ranger',
    name: 'Ranger',
    role: 'ranged',
    blurb: 'Brave from a safe distance.',
    hp: 165,
    damage: 38,
    attackInterval: 1.18,
    range: 3.35,
    moveSpeed: 1.02,
    radius: 0.29,
    attackStyle: 'pierce',
    assetKind: 'fighter',
    assetId: 'sun_archer',
    cost: 3,
    upgradePaths: [
      {
        id: 'longbow',
        name: 'Longbow',
        blurb: '+30% damage.',
        cost: 4,
        damageMultiplier: 1.3
      }
    ]
  },
  {
    id: 'fire_mage',
    name: 'Fire Mage',
    role: 'aoe',
    blurb: 'Solves crowds one fireball at a time.',
    hp: 180,
    damage: 46,
    attackInterval: 1.82,
    range: 2.9,
    moveSpeed: 0.94,
    radius: 0.3,
    attackStyle: 'magic',
    assetKind: 'fighter',
    assetId: 'ember_mage',
    cost: 4,
    upgradePaths: [
      {
        id: 'wildfire',
        name: 'Wildfire',
        blurb: '+20% damage and stronger splash.',
        cost: 4,
        damageMultiplier: 1.2,
        splashMultiplier: 1.28
      }
    ],
    splash: { radius: 1.05, multiplier: 0.64 }
  },
  {
    id: 'healer',
    name: 'Healer',
    role: 'support',
    blurb: 'Emotional and physical support.',
    hp: 205,
    damage: 11,
    attackInterval: 1.45,
    range: 2.35,
    moveSpeed: 0.98,
    radius: 0.3,
    attackStyle: 'magic',
    assetKind: 'fighter',
    assetId: 'moss_shaman',
    cost: 3,
    upgradePaths: [
      {
        id: 'renewal',
        name: 'Renewal',
        blurb: '+35% healing and +20% health.',
        cost: 4,
        hpMultiplier: 1.2,
        healingMultiplier: 1.35
      }
    ],
    healing: { amount: 47, interval: 2.15, range: 3.15 }
  },
  {
    id: 'enemy_melee',
    name: 'Grunt',
    role: 'melee',
    blurb: 'Standard issue hostility.',
    hp: 285,
    damage: 27,
    attackInterval: 0.96,
    range: 0.66,
    moveSpeed: 1.06,
    radius: 0.32,
    attackStyle: 'impact',
    assetKind: 'enemy',
    assetId: 'grubling'
  },
  {
    id: 'enemy_fast',
    name: 'Swift Stalker',
    role: 'fast',
    blurb: 'Deeply interested in your backline.',
    hp: 170,
    damage: 32,
    attackInterval: 0.76,
    range: 0.65,
    moveSpeed: 2.05,
    radius: 0.29,
    attackStyle: 'pierce',
    assetKind: 'enemy',
    assetId: 'swift_stalker'
  },
  {
    id: 'enemy_tank',
    name: 'Bulwark Brute',
    role: 'tank',
    blurb: 'Mostly armor. Some opinions.',
    hp: 585,
    damage: 21,
    attackInterval: 1.2,
    range: 0.72,
    moveSpeed: 0.78,
    radius: 0.39,
    attackStyle: 'impact',
    assetKind: 'enemy',
    assetId: 'bulwark_brute'
  },
  {
    id: 'enemy_ranged',
    name: 'Gloom Spitter',
    role: 'ranged',
    blurb: 'Dislikes close professional relationships.',
    hp: 190,
    damage: 33,
    attackInterval: 1.12,
    range: 3.0,
    moveSpeed: 0.9,
    radius: 0.3,
    attackStyle: 'magic',
    assetKind: 'enemy',
    assetId: 'gloomspawn'
  },
  {
    id: 'enemy_boss',
    name: 'Gloom Tyrant',
    role: 'tank',
    blurb: 'The fourth fight has entered the arena.',
    hp: 1120,
    damage: 44,
    attackInterval: 1.28,
    range: 0.82,
    moveSpeed: 0.72,
    radius: 0.48,
    attackStyle: 'impact',
    assetKind: 'enemy',
    assetId: 'gloom_ogre',
    splash: { radius: 1.15, multiplier: 0.42 }
  }
];

const UNIT_BY_ID = new Map(ARENA_UNIT_DEFINITIONS.map((definition) => [definition.id, definition]));

export const arenaUnitById = (id: string): ArenaUnitDefinition => {
  const definition = UNIT_BY_ID.get(id);
  if (!definition) throw new Error(`Unknown arena unit: ${id}`);
  return definition;
};

export const PLAYER_DEFINITION_IDS = ['shield_guard', 'ranger', 'fire_mage', 'healer'] as const;
