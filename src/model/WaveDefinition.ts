import type { CreepStats } from './UnitDefinition';

export interface WaveGroup {
  stats: CreepStats;
  count: number;
  /** Extra seconds before this group starts spawning (two-phase waves). */
  delay?: number;
}

export interface WaveDefinition {
  waveNumber: number;
  name: string;
  groups: WaveGroup[];
  /** Total gold paid out for fully clearing the wave (split across enemies). */
  goldRewardTotal: number;
  /** Rough defense value the player should have built. Used by AI and info tab. */
  recommendedFighterValue: number;
  shortHint: string;
  /** Short warning tag shown in the info tab, e.g. "Boss wave". */
  warning: string;
}
