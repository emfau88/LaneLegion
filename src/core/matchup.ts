import { damageMultiplier } from '../data/damageMatrix';
import { waveByNumber } from '../data/waves';
import type { ArmorType, AttackType } from '../model/Types';

interface WaveTypes {
  /** HP-weighted dominant armor type of the wave. */
  armor: ArmorType;
  /** HP-weighted dominant attack type of the wave. */
  attack: AttackType;
}

const cache = new Map<number, WaveTypes>();

/** Dominant attack/armor type of a wave, weighted by total HP per group. */
export const dominantWaveTypes = (waveNumber: number): WaveTypes => {
  let entry = cache.get(waveNumber);
  if (!entry) {
    const wave = waveByNumber(waveNumber);
    const armorHp = new Map<ArmorType, number>();
    const attackHp = new Map<AttackType, number>();
    for (const g of wave.groups) {
      const hp = g.stats.hp * g.count;
      armorHp.set(g.stats.armorType, (armorHp.get(g.stats.armorType) ?? 0) + hp);
      attackHp.set(g.stats.attackType, (attackHp.get(g.stats.attackType) ?? 0) + hp);
    }
    const top = <T>(m: Map<T, number>): T => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
    entry = { armor: top(armorHp), attack: top(attackHp) };
    cache.set(waveNumber, entry);
  }
  return entry;
};

/** How well this attack type damages the wave's dominant armor. */
export const offenseMultVsWave = (attack: AttackType, waveNumber: number): number =>
  damageMultiplier(attack, dominantWaveTypes(waveNumber).armor);

/** How hard the wave's dominant attack hits this armor type. */
export const defenseMultVsWave = (armor: ArmorType, waveNumber: number): number =>
  damageMultiplier(dominantWaveTypes(waveNumber).attack, armor);
