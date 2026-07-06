import type {
  AttackType,
  ArmorType,
  PassiveEffect,
  Role,
  SplashSpec,
  UnitBehaviorState,
  UnitKind,
  Vec2
} from './Types';

export interface SlowStack {
  pct: number;
  until: number;
}

/**
 * A single simulated unit: fighter, creep (wave enemy / mercenary) or king.
 * Lives inside a zone ("lane_<playerId>" or "arena_<teamId>").
 */
export interface CombatUnit {
  id: number;
  kind: UnitKind;
  defId: string;
  name: string;
  /** Owning player id (fighters) or sender/defender bookkeeping for creeps. */
  ownerId: string;
  /** Team the unit fights FOR. */
  teamId: string;
  zoneId: string;
  /** Fighters: lane they belong to (for returning after king defense). */
  homeLaneId?: string;
  homeCell?: { col: number; row: number };
  factionId?: string;

  role: Role;
  hp: number;
  maxHp: number;
  damage: number;
  attackSpeed: number;
  range: number;
  moveSpeed: number;
  attackType: AttackType;
  armorType: ArmorType;
  aggroRadius: number;
  collisionRadius: number;

  pos: Vec2;
  targetId: number | null;
  /** Sim time of the next allowed retarget check. */
  retargetAt: number;
  /** Sim time when the next attack is allowed. */
  attackReadyAt: number;
  state: UnitBehaviorState;
  threatModifier: number;

  slows: SlowStack[];
  /** Transient aura buffs, recomputed periodically. */
  asBuffPct: number;
  lifestealPct: number;

  lastHitBy: number | null;
  lastHitAt: number;

  splash?: SplashSpec;
  passive?: PassiveEffect;
  nextPassiveAt: number;

  /** Fighters: 0 = base, 1 = upgraded. */
  tier: 0 | 1;
  investedGold: number;

  /** Creeps: kill gold and who receives it. */
  bounty: number;
  defenderPlayerId?: string;
  leaked: boolean;
}
