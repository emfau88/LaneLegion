import type { KingUpgradeType } from './Types';

export interface TeamState {
  id: string;
  name: string;
  playerIds: string[];
  kingUnitId: number;
  kingUpgrades: Record<KingUpgradeType, number>;
  kingMana: number;
}
