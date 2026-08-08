export const ARENA_COLS = 7;
export const ARENA_ROWS = 6;
export const PLAYER_FIRST_ROW = 3;

export type ArenaTeam = 'player' | 'enemy';
export type ArenaPhase = 'planning' | 'battle' | 'victory' | 'defeat';
export type ArenaRole = 'tank' | 'melee' | 'ranged' | 'aoe' | 'support' | 'fast';
export type ArenaAttackStyle = 'impact' | 'pierce' | 'magic';
export type ArenaAssetKind = 'fighter' | 'enemy';
export type ArenaUnitActivity = 'idle' | 'moving' | 'attacking' | 'dead';
export type ArenaTier = 0 | 1;

export interface ArenaPoint {
  x: number;
  y: number;
}

export interface ArenaCell {
  col: number;
  row: number;
}

export interface ArenaUpgradeDefinition {
  id: string;
  name: string;
  blurb: string;
  cost: number;
  hpMultiplier?: number;
  damageMultiplier?: number;
  healingMultiplier?: number;
  splashMultiplier?: number;
}

export interface ArenaUnitDefinition {
  id: string;
  name: string;
  role: ArenaRole;
  blurb: string;
  hp: number;
  damage: number;
  attackInterval: number;
  range: number;
  moveSpeed: number;
  radius: number;
  attackStyle: ArenaAttackStyle;
  assetKind: ArenaAssetKind;
  assetId: string;
  cost?: number;
  upgradePaths?: ArenaUpgradeDefinition[];
  splash?: { radius: number; multiplier: number };
  healing?: { amount: number; interval: number; range: number };
}

export interface ArenaUnitState {
  id: number;
  rosterId: number | null;
  definitionId: string;
  tier: ArenaTier;
  team: ArenaTeam;
  cell: ArenaCell;
  pos: ArenaPoint;
  hp: number;
  maxHp: number;
  alive: boolean;
  targetId: number | null;
  attackCooldown: number;
  healCooldown: number;
  retargetCooldown: number;
  activity: ArenaUnitActivity;
  combat: {
    damage: number;
    attackInterval: number;
    range: number;
    moveSpeed: number;
    radius: number;
    splash?: { radius: number; multiplier: number };
    healing?: { amount: number; interval: number; range: number };
  };
}

export type ArenaBattleEvent =
  | {
      type: 'attack';
      attackerId: number;
      targetId: number;
      from: ArenaPoint;
      to: ArenaPoint;
      style: ArenaAttackStyle;
      ranged: boolean;
      splashRadius?: number;
    }
  | { type: 'heal'; healerId: number; targetId: number; at: ArenaPoint; amount: number }
  | { type: 'death'; unitId: number; at: ArenaPoint }
  | { type: 'battle-ended'; outcome: 'victory' | 'defeat' };

export interface ArenaBattleState {
  phase: ArenaPhase;
  time: number;
  speed: 1 | 2;
  units: ArenaUnitState[];
  events: ArenaBattleEvent[];
}

export interface ArenaPlacement {
  definitionId: string;
  col: number;
  row: number;
  rosterId?: number;
  tier?: ArenaTier;
}

export interface ArenaOwnedFighter {
  id: number;
  definitionId: string;
  tier: ArenaTier;
  cell: ArenaCell | null;
}

export interface ArenaShopOffer {
  id: number;
  definitionId: string;
  cost: number;
}

export interface ArenaRunState {
  fightIndex: number;
  gold: number;
  nextFighterId: number;
  shopRoll: number;
  rerollsLeft: number;
  fighters: ArenaOwnedFighter[];
  shopOffers: ArenaShopOffer[];
}

export const cellCenter = (cell: ArenaCell): ArenaPoint => ({
  x: cell.col + 0.5,
  y: cell.row + 0.5
});
