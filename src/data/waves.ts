import type { WaveDefinition } from '../model/WaveDefinition';
import type { CreepStats } from '../model/UnitDefinition';

const c = (
  name: string,
  hp: number,
  damage: number,
  moveSpeed: number,
  attackType: CreepStats['attackType'],
  armorType: CreepStats['armorType'],
  extra?: Partial<CreepStats>
): CreepStats => ({
  name,
  role: 'melee',
  hp,
  damage,
  attackSpeed: 0.9,
  attackRange: 0.9,
  moveSpeed,
  attackType,
  armorType,
  bounty: 0, // filled per wave from goldRewardTotal
  ...extra
});

export const WAVES: WaveDefinition[] = [
  {
    waveNumber: 1,
    name: 'Grubling Rush',
    groups: [{ stats: c('Grubling', 45, 7, 1.1, 'impact', 'light'), count: 10 }],
    goldRewardTotal: 40,
    recommendedFighterValue: 90,
    shortHint: 'Many weak enemies. Any simple defense holds.',
    warning: 'Many weak enemies'
  },
  {
    waveNumber: 2,
    name: 'Stone Beetles',
    groups: [{ stats: c('Stone Beetle', 95, 10, 0.9, 'impact', 'armored'), count: 8 }],
    goldRewardTotal: 50,
    recommendedFighterValue: 150,
    shortHint: 'Tougher shells. Good moment for a first worker.',
    warning: 'Armored enemies'
  },
  {
    waveNumber: 3,
    name: 'Swift Stalkers',
    groups: [{ stats: c('Swift Stalker', 85, 9, 1.8, 'pierce', 'light'), count: 10 }],
    goldRewardTotal: 60,
    recommendedFighterValue: 210,
    shortHint: 'Fast runners punish bad positioning.',
    warning: 'Fast enemies'
  },
  {
    waveNumber: 4,
    name: 'Bulwark Brutes',
    groups: [{ stats: c('Bulwark Brute', 400, 22, 0.8, 'impact', 'massive', { collisionRadius: 0.36 }), count: 4 }],
    goldRewardTotal: 70,
    recommendedFighterValue: 280,
    shortHint: 'Few fat enemies. Pure AOE will fail here.',
    warning: 'Few big enemies'
  },
  {
    waveNumber: 5,
    name: 'Gloom Ogre',
    groups: [
      { stats: c('Gloomspawn', 65, 8, 1.2, 'pierce', 'light'), count: 6 },
      {
        stats: c('Gloom Ogre', 1600, 45, 0.75, 'impact', 'armored', {
          collisionRadius: 0.45,
          attackSpeed: 0.8
        }),
        count: 1
      }
    ],
    goldRewardTotal: 90,
    recommendedFighterValue: 360,
    shortHint: 'Mini-boss. Enemy sends often arrive with it.',
    warning: 'Boss wave'
  },
  {
    waveNumber: 6,
    name: 'Motley Horde',
    groups: [
      { stats: c('Horde Runt', 110, 12, 1.3, 'pierce', 'light'), count: 6 },
      { stats: c('Horde Bruiser', 320, 20, 0.9, 'impact', 'armored', { collisionRadius: 0.34 }), count: 4 }
    ],
    goldRewardTotal: 100,
    recommendedFighterValue: 460,
    shortHint: 'Mixed wave. Checks whether your economy kept up.',
    warning: 'Mixed enemies'
  },
  {
    waveNumber: 7,
    name: 'Iron Carapaces',
    groups: [{ stats: c('Iron Carapace', 240, 18, 0.9, 'impact', 'armored', { collisionRadius: 0.32 }), count: 8 }],
    goldRewardTotal: 115,
    recommendedFighterValue: 570,
    shortHint: 'Heavy armor. Impact and magic damage shine, pierce fails.',
    warning: 'Armored enemies'
  },
  {
    waveNumber: 8,
    name: 'Ravagers',
    groups: [
      {
        stats: c('Ravager', 300, 42, 1.1, 'pierce', 'light', {
          attackRange: 2.2,
          attackSpeed: 1.0,
          aggroRadius: 2.6
        }),
        count: 6
      }
    ],
    goldRewardTotal: 130,
    recommendedFighterValue: 700,
    shortHint: 'Ranged and vicious. You need real tanks and support.',
    warning: 'High damage wave'
  },
  {
    waveNumber: 9,
    name: 'Endless Swarm',
    groups: [{ stats: c('Swarmling', 75, 10, 1.4, 'pierce', 'light'), count: 24 }],
    goldRewardTotal: 150,
    recommendedFighterValue: 830,
    shortHint: 'A flood of bodies. AOE and sustain win here.',
    warning: 'Many weak enemies'
  },
  {
    waveNumber: 10,
    name: 'Dread Colossus',
    groups: [
      { stats: c('Dread Cultist', 130, 14, 1.2, 'magic', 'arcane'), count: 8 },
      {
        stats: c('Dread Colossus', 4200, 90, 0.7, 'impact', 'massive', {
          collisionRadius: 0.5,
          attackSpeed: 0.7,
          splash: { radius: 0.9, pct: 0.5 }
        }),
        count: 1
      }
    ],
    goldRewardTotal: 180,
    recommendedFighterValue: 950,
    shortHint: 'The final boss. Everything you have, now.',
    warning: 'Boss wave'
  }
];

export const waveByNumber = (n: number): WaveDefinition => {
  const w = WAVES.find((x) => x.waveNumber === n);
  if (!w) throw new Error(`Unknown wave: ${n}`);
  return w;
};
