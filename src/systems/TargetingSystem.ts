import { CFG } from '../data/gameConfig';
import type { CombatUnit } from '../model/CombatUnit';
import type { GameState } from '../model/GameState';
import { dist, livingHostilesInZone } from '../core/util';

const isArena = (zoneId: string) => zoneId.startsWith('arena_');

/**
 * "Progress toward the objective": in lanes, how close a creep is to the leak
 * gate (higher y = further); in the arena, how close it is to the king.
 */
const progressOf = (u: CombatUnit): number =>
  isArena(u.zoneId)
    ? -(Math.abs(u.pos.x - CFG.arena.kingPos.x) + Math.abs(u.pos.y - CFG.arena.kingPos.y))
    : u.pos.y;

const nearest = (u: CombatUnit, list: CombatUnit[]): CombatUnit | null => {
  let best: CombatUnit | null = null;
  let bestD = Infinity;
  for (const h of list) {
    const d = dist(u.pos, h.pos);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
};

const pickByDistance = (u: CombatUnit, list: CombatUnit[]): CombatUnit | null => {
  // Primary: distance (bucketed) — ties: closest to objective, then lowest HP.
  let best: CombatUnit | null = null;
  let bestKey = Infinity;
  for (const h of list) {
    const d = Math.round(dist(u.pos, h.pos) / 0.5);
    const key = d * 10000 - progressOf(h) * 100 + h.hp / h.maxHp;
    if (key < bestKey) {
      bestKey = key;
      best = h;
    }
  }
  return best;
};

const pickByProgress = (list: CombatUnit[]): CombatUnit | null => {
  let best: CombatUnit | null = null;
  let bestKey = -Infinity;
  for (const h of list) {
    const key = progressOf(h) * 10000 - h.hp / h.maxHp;
    if (key > bestKey) {
      bestKey = key;
      best = h;
    }
  }
  return best;
};

const pickCluster = (u: CombatUnit, list: CombatUnit[], radius: number): CombatUnit | null => {
  let best: CombatUnit | null = null;
  let bestKey = -Infinity;
  for (const h of list) {
    let cluster = 0;
    for (const other of list) {
      if (dist(h.pos, other.pos) <= radius) cluster++;
    }
    const key = cluster * 10000 + progressOf(h) * 100 - dist(u.pos, h.pos);
    if (key > bestKey) {
      bestKey = key;
      best = h;
    }
  }
  return best;
};

const fighterRetarget = (u: CombatUnit, hostiles: CombatUnit[]): void => {
  const current = u.targetId;
  const inAggro = hostiles.filter((h) => dist(u.pos, h.pos) <= u.aggroRadius);

  switch (u.role) {
    case 'ranged': {
      const inRange = hostiles.filter((h) => dist(u.pos, h.pos) <= u.range);
      if (current !== null) {
        const cur = hostiles.find((h) => h.id === current);
        if (cur && dist(u.pos, cur.pos) <= u.range) return; // keep target while it stays in range
      }
      u.targetId = (inRange.length > 0 ? pickByProgress(inRange) : nearest(u, hostiles))?.id ?? null;
      return;
    }
    case 'aoe': {
      const radius = u.splash?.radius ?? 1.0;
      const inRange = hostiles.filter((h) => dist(u.pos, h.pos) <= u.range);
      const pool = inRange.length > 0 ? inRange : hostiles;
      u.targetId = pickCluster(u, pool, radius)?.id ?? null;
      return;
    }
    case 'support': {
      // Supports stay back; they only poke at enemies already in range.
      const inRange = hostiles.filter((h) => dist(u.pos, h.pos) <= u.range);
      u.targetId = inRange.length > 0 ? (nearest(u, inRange)?.id ?? null) : null;
      return;
    }
    case 'tank':
    case 'melee':
    default: {
      if (current !== null) {
        const cur = hostiles.find((h) => h.id === current);
        if (cur && dist(u.pos, cur.pos) <= u.aggroRadius + 0.5) return; // keep reachable target
      }
      const pool = inAggro.length > 0 ? inAggro : isArena(u.zoneId) ? hostiles : [];
      u.targetId = pickByDistance(u, pool)?.id ?? null;
      return;
    }
  }
};

/** Creeps pick targets by threat score: distance discounted by tank threat and recent damage. */
const creepScore = (state: GameState, u: CombatUnit, cand: CombatUnit): number => {
  let score = dist(u.pos, cand.pos);
  if (cand.role === 'tank') score -= CFG.combat.tankThreatBonus * cand.threatModifier;
  if (u.lastHitBy === cand.id && state.time - u.lastHitAt < 2) score -= CFG.combat.recentDamageBonus;
  return score;
};

const creepRetarget = (state: GameState, u: CombatUnit, hostiles: CombatUnit[]): void => {
  const aggro = isArena(u.zoneId) ? u.aggroRadius + 1.2 : u.aggroRadius;
  const candidates = hostiles.filter((h) => dist(u.pos, h.pos) <= aggro);
  if (candidates.length === 0) {
    u.targetId = null;
    return;
  }
  let best: CombatUnit | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const s = creepScore(state, u, c);
    if (s < bestScore) {
      bestScore = s;
      best = c;
    }
  }
  const cur = candidates.find((h) => h.id === u.targetId);
  if (cur) {
    // Only switch when the new option is clearly better (no flickering).
    const curScore = creepScore(state, u, cur);
    if (bestScore >= curScore - CFG.combat.retargetHysteresis) return;
  }
  u.targetId = best?.id ?? null;
};

export const tickTargeting = (state: GameState): void => {
  for (const u of state.units.values()) {
    if (u.state === 'dead') continue;
    if (state.time < u.retargetAt) {
      // Drop dead/moved targets immediately between checks.
      if (u.targetId !== null) {
        const t = state.units.get(u.targetId);
        if (!t || t.state === 'dead' || t.zoneId !== u.zoneId) u.targetId = null;
      }
      continue;
    }
    u.retargetAt = state.time + CFG.combat.retargetInterval;

    const hostiles = livingHostilesInZone(state, u.zoneId, u.teamId);
    if (hostiles.length === 0) {
      u.targetId = null;
      continue;
    }
    if (u.kind === 'king') {
      const cur = hostiles.find((h) => h.id === u.targetId);
      if (!cur || dist(u.pos, cur.pos) > u.range) {
        const inRange = hostiles.filter((h) => dist(u.pos, h.pos) <= u.range);
        u.targetId = nearest(u, inRange.length > 0 ? inRange : [])?.id ?? null;
      }
    } else if (u.kind === 'fighter') {
      fighterRetarget(u, hostiles);
    } else {
      creepRetarget(state, u, hostiles);
    }
  }
};
