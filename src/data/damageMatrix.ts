import type { AttackType, ArmorType } from '../model/Types';

/**
 * Damage multipliers: DAMAGE_MATRIX[attackType][armorType].
 * pierce > light, impact > armored, magic > massive, pure = neutral.
 */
export const DAMAGE_MATRIX: Record<AttackType, Record<ArmorType, number>> = {
  pierce: { light: 1.25, armored: 0.85, arcane: 1.0, massive: 1.0 },
  impact: { light: 1.0, armored: 1.25, arcane: 0.85, massive: 1.0 },
  magic: { light: 1.0, armored: 0.85, arcane: 1.0, massive: 1.25 },
  pure: { light: 1.0, armored: 1.0, arcane: 1.0, massive: 1.0 }
};

export const damageMultiplier = (attack: AttackType, armor: ArmorType): number =>
  DAMAGE_MATRIX[attack][armor];
