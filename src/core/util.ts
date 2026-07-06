import type { CombatUnit } from '../model/CombatUnit';
import type { GameState } from '../model/GameState';
import type { Vec2 } from '../model/Types';
import { CFG } from '../data/gameConfig';

/** Deterministic RNG (mulberry32) advancing state.rngState. */
export const rng = (state: GameState): number => {
  state.rngState = (state.rngState + 0x6d2b79f5) | 0;
  let z = state.rngState;
  z = Math.imul(z ^ (z >>> 15), z | 1);
  z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
  return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
};

export const rngInt = (state: GameState, maxExclusive: number): number =>
  Math.floor(rng(state) * maxExclusive);

export const dist = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const livingUnitsInZone = (state: GameState, zoneId: string): CombatUnit[] => {
  const out: CombatUnit[] = [];
  for (const u of state.units.values()) {
    if (u.zoneId === zoneId && u.state !== 'dead') out.push(u);
  }
  return out;
};

export const livingHostilesInZone = (
  state: GameState,
  zoneId: string,
  teamId: string
): CombatUnit[] => {
  const out: CombatUnit[] = [];
  for (const u of state.units.values()) {
    if (u.zoneId === zoneId && u.state !== 'dead' && u.teamId !== teamId) out.push(u);
  }
  return out;
};

export const livingAlliesInZone = (
  state: GameState,
  zoneId: string,
  teamId: string
): CombatUnit[] => {
  const out: CombatUnit[] = [];
  for (const u of state.units.values()) {
    if (u.zoneId === zoneId && u.state !== 'dead' && u.teamId === teamId) out.push(u);
  }
  return out;
};

/** Effective attacks per second including aura buffs and slow stacks. */
export const effectiveAttackSpeed = (u: CombatUnit, time: number): number => {
  let slow = 0;
  for (const s of u.slows) {
    if (s.until > time) slow += s.pct;
  }
  const factor = Math.max(CFG.combat.minAttackSpeedFactor, (1 + u.asBuffPct) * (1 - slow));
  return u.attackSpeed * factor;
};

/** Total gold invested in a player's fighters (their "fighter value"). */
export const playerFighterValue = (state: GameState, playerId: string): number => {
  let sum = 0;
  for (const u of state.units.values()) {
    if (u.kind === 'fighter' && u.ownerId === playerId) sum += u.investedGold;
  }
  return sum;
};

export const enemyTeamOf = (state: GameState, teamId: string): string =>
  state.teamOrder.find((t) => t !== teamId) ?? teamId;

export const cellCenter = (col: number, row: number): Vec2 => ({ x: col + 0.5, y: row + 0.5 });

export const otherPlayersLaneStatus = (
  state: GameState,
  playerId: string
): 'clear' | 'fighting' | 'leaking' | 'dead' => {
  const p = state.players[playerId];
  const creeps = livingHostilesInZone(state, p.laneId, p.teamId);
  const fighters = livingAlliesInZone(state, p.laneId, p.teamId).filter((u) => u.kind === 'fighter');
  if (creeps.length === 0) return p.leaksThisWave > 0 && state.phase === 'battle' ? 'leaking' : 'clear';
  if (fighters.length === 0) return 'dead';
  return p.leaksThisWave > 0 ? 'leaking' : 'fighting';
};
