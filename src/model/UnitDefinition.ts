import type { AttackType, ArmorType, PassiveEffect, Role, SplashSpec } from './Types';

/** One tier (base or upgraded) of a fighter. */
export interface FighterTierStats {
  name: string;
  /** Gold cost of this tier. For the upgrade tier this is the additional upgrade cost. */
  cost: number;
  hp: number;
  damage: number;
  /** Attacks per second. */
  attackSpeed: number;
  /** Attack range in grid cells. */
  range: number;
  /** Movement speed in cells per second. */
  moveSpeed: number;
  splash?: SplashSpec;
  passive?: PassiveEffect;
}

export interface FighterDefinition {
  id: string;
  factionId: string;
  role: Role;
  attackType: AttackType;
  armorType: ArmorType;
  desc: string;
  /** [base, upgrade] */
  tiers: [FighterTierStats, FighterTierStats];
}

/** Stats for a wave enemy or mercenary instance. */
export interface CreepStats {
  name: string;
  role: Role;
  hp: number;
  damage: number;
  attackSpeed: number;
  attackRange: number;
  moveSpeed: number;
  attackType: AttackType;
  armorType: ArmorType;
  /** Gold paid to the defending player on kill. */
  bounty: number;
  collisionRadius?: number;
  aggroRadius?: number;
  splash?: SplashSpec;
  passive?: PassiveEffect;
}
