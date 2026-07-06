import type { KingUpgradeType } from '../model/Types';

export interface KingUpgradeSpec {
  type: KingUpgradeType;
  name: string;
  desc: string;
  maxLevel: number;
  baseCost: number;
  costPerLevel: number;
  /** Effect gained per level (damage, hp/s regen, or spell damage). */
  valuePerLevel: number;
}

export const KING_UPGRADES: Record<KingUpgradeType, KingUpgradeSpec> = {
  attack: {
    type: 'attack',
    name: 'Royal Arms',
    desc: '+12 king attack damage per level',
    maxLevel: 10,
    baseCost: 40,
    costPerLevel: 15,
    valuePerLevel: 12
  },
  regen: {
    type: 'regen',
    name: 'Royal Vitality',
    desc: '+3 king HP regeneration per second per level',
    maxLevel: 10,
    baseCost: 40,
    costPerLevel: 15,
    valuePerLevel: 3
  },
  spell: {
    type: 'spell',
    name: 'Royal Wrath',
    desc: '+45 AOE spell damage per level',
    maxLevel: 10,
    baseCost: 40,
    costPerLevel: 15,
    valuePerLevel: 45
  }
};

/** Income granted whenever mythium is spent on a king upgrade. */
export const KING_UPGRADE_INCOME = 4;

export const kingUpgradeCost = (spec: KingUpgradeSpec, currentLevel: number): number =>
  spec.baseCost + spec.costPerLevel * currentLevel;
