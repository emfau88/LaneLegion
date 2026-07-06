import type { CreepStats } from './UnitDefinition';

export interface MercenaryDefinition {
  id: string;
  name: string;
  /** Mythium cost. */
  cost: number;
  /** Permanent income gained when sent. */
  incomeGain: number;
  roleDesc: string;
  desc: string;
  /** Where the merc spawns in the target lane. */
  spawnStyle: 'center' | 'side';
  stats: CreepStats;
}
