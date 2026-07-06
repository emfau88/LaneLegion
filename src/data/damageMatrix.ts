import type { AttackType, ArmorType } from '../model/Types';

/**
 * Damage multipliers: DAMAGE_MATRIX[attackType][armorType].
 * pierce > light, impact > armored, magic > massive, pure = neutral.
 */
export const DAMAGE_MATRIX: Record<AttackType, Record<ArmorType, number>> = {
  pierce: { light: 1.5, armored: 0.7, arcane: 1.0, massive: 1.0 },
  impact: { light: 1.0, armored: 1.5, arcane: 0.7, massive: 1.0 },
  magic: { light: 1.0, armored: 0.7, arcane: 1.0, massive: 1.5 },
  pure: { light: 1.0, armored: 1.0, arcane: 1.0, massive: 1.0 }
};

export const damageMultiplier = (attack: AttackType, armor: ArmorType): number =>
  DAMAGE_MATRIX[attack][armor];
