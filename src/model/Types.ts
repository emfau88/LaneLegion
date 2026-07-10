export type AttackType = 'pierce' | 'impact' | 'magic' | 'pure';
export type ArmorType = 'light' | 'armored' | 'arcane' | 'massive';
export type Role = 'tank' | 'melee' | 'ranged' | 'aoe' | 'support';
export type Phase = 'build' | 'battle' | 'ended';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameMode = '1v1' | '2v2';
export type LaneDisplayStatus = 'clear' | 'fighting' | 'leaking' | 'dead';
export type UnitKind = 'fighter' | 'creep' | 'king';
export type UnitBehaviorState = 'idle' | 'moving' | 'attacking' | 'dead';
export type KingUpgradeType = 'attack' | 'regen' | 'spell';
/** Why the match ended; translated by the UI layer. */
export type WinReason = 'kingDestroyed' | 'moreKingHp' | 'higherValue' | '';

export interface Vec2 {
  x: number;
  y: number;
}

/** Simple data-driven passive effects shared by fighters and mercenaries. */
export type PassiveEffect =
  | { kind: 'atkSpeedAura'; radius: number; pct: number }
  | { kind: 'healPulse'; radius: number; amount: number; interval: number }
  | { kind: 'lifestealAura'; radius: number; pct: number }
  | { kind: 'onHitSlow'; pct: number; duration: number; maxStacks: number };

export interface SplashSpec {
  radius: number;
  pct: number;
}

/** Transient visual events emitted by the simulation and consumed by the renderer. */
export type GameEvent =
  | {
      type: 'attack';
      fromId: number;
      toId: number;
      ranged: boolean;
      zoneId: string;
      fromPos: Vec2;
      toPos: Vec2;
      attackType: AttackType;
    }
  | { type: 'death'; unitId: number; zoneId: string; pos: Vec2; kind: UnitKind }
  | { type: 'leak'; unitId: number; laneId: string; teamId: string }
  | {
      type: 'kingSpell';
      teamId: string;
      zoneId: string;
      pos: Vec2;
      radius: number;
      style?: 'rune' | 'laser' | 'chain';
      targetPos?: Vec2;
      /** Positions actually struck by a multi-target king spell. */
      effectTargets?: Vec2[];
    }
  | { type: 'heal'; unitId: number; zoneId: string; pos: Vec2 };
