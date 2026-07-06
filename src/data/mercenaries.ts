import type { MercenaryDefinition } from '../model/MercenaryDefinition';

export const MERCENARIES: MercenaryDefinition[] = [
  {
    id: 'crawler',
    name: 'Crawler',
    cost: 20,
    incomeGain: 6,
    roleDesc: 'Income',
    desc: 'Cheap and weak, but the most income per mythium.',
    spawnStyle: 'side',
    stats: {
      name: 'Crawler',
      role: 'melee',
      hp: 110,
      damage: 9,
      attackSpeed: 1.0,
      attackRange: 0.9,
      moveSpeed: 1.6,
      attackType: 'pierce',
      armorType: 'light',
      bounty: 6
    }
  },
  {
    id: 'brute',
    name: 'Brute',
    cost: 60,
    incomeGain: 12,
    roleDesc: 'Tank',
    desc: 'A wall of muscle. Soaks damage and stalls defenses.',
    spawnStyle: 'center',
    stats: {
      name: 'Brute',
      role: 'tank',
      hp: 620,
      damage: 16,
      attackSpeed: 0.8,
      attackRange: 0.9,
      moveSpeed: 1.0,
      attackType: 'impact',
      armorType: 'massive',
      bounty: 18,
      collisionRadius: 0.36
    }
  },
  {
    id: 'saboteur',
    name: 'Saboteur',
    cost: 80,
    incomeGain: 10,
    roleDesc: 'Debuff',
    desc: 'Hits slow the attack speed of defending fighters.',
    spawnStyle: 'side',
    stats: {
      name: 'Saboteur',
      role: 'melee',
      hp: 380,
      damage: 20,
      attackSpeed: 1.1,
      attackRange: 0.9,
      moveSpeed: 1.4,
      attackType: 'magic',
      armorType: 'arcane',
      bounty: 24,
      passive: { kind: 'onHitSlow', pct: 0.08, duration: 2.5, maxStacks: 3 }
    }
  },
  {
    id: 'crusher',
    name: 'Crusher',
    cost: 120,
    incomeGain: 16,
    roleDesc: 'Power',
    desc: 'Heavy armored bruiser that smashes weak frontlines.',
    spawnStyle: 'center',
    stats: {
      name: 'Crusher',
      role: 'tank',
      hp: 780,
      damage: 48,
      attackSpeed: 0.9,
      attackRange: 0.9,
      moveSpeed: 1.1,
      attackType: 'impact',
      armorType: 'armored',
      bounty: 36,
      collisionRadius: 0.38
    }
  },
  {
    id: 'drake',
    name: 'Drake',
    cost: 180,
    incomeGain: 20,
    roleDesc: 'Boss',
    desc: 'Slow, massive and devastating. A wave-breaker.',
    spawnStyle: 'center',
    stats: {
      name: 'Drake',
      role: 'tank',
      hp: 1500,
      damage: 70,
      attackSpeed: 0.7,
      attackRange: 1.1,
      moveSpeed: 0.7,
      attackType: 'magic',
      armorType: 'massive',
      bounty: 54,
      collisionRadius: 0.45,
      splash: { radius: 0.8, pct: 0.4 }
    }
  }
];

export const mercById = (id: string): MercenaryDefinition => {
  const m = MERCENARIES.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown mercenary: ${id}`);
  return m;
};
