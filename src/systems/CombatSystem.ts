import { CFG } from '../data/gameConfig';
import { damageMultiplier } from '../data/damageMatrix';
import type { CombatUnit } from '../model/CombatUnit';
import type { GameState } from '../model/GameState';
import type { PassiveEffect } from '../model/Types';
import { dist, effectiveAttackSpeed, livingAlliesInZone, livingHostilesInZone } from '../core/util';

const killUnit = (state: GameState, u: CombatUnit): void => {
  u.hp = 0;
  u.state = 'dead';
  u.targetId = null;
  state.events.push({ type: 'death', unitId: u.id, zoneId: u.zoneId, pos: { ...u.pos }, kind: u.kind });

  if (u.kind === 'creep' && u.defenderPlayerId) {
    state.players[u.defenderPlayerId].gold += u.bounty;
  }
  if (u.kind === 'king' && state.phase !== 'ended') {
    state.phase = 'ended';
    state.winnerTeamId = state.teamOrder.find((t) => t !== u.teamId) ?? null;
    state.winReason = 'King destroyed';
  }
};

const applySlow = (state: GameState, target: CombatUnit, slow: { pct: number; duration: number; maxStacks: number }): void => {
  target.slows = target.slows.filter((s) => s.until > state.time);
  if (target.slows.length < slow.maxStacks) {
    target.slows.push({ pct: slow.pct, until: state.time + slow.duration });
  }
};

export interface DamageOpts {
  /** Splash / spell damage does not trigger on-hit effects or lifesteal. */
  isSecondary?: boolean;
}

export const applyDamage = (
  state: GameState,
  attacker: CombatUnit,
  target: CombatUnit,
  raw: number,
  opts: DamageOpts = {}
): void => {
  if (target.state === 'dead') return;
  let mult = damageMultiplier(attacker.attackType, target.armorType);
  if (attacker.factionId === 'ember' && attacker.attackType === 'magic') {
    mult *= 1 + CFG.combat.emberMagicBonus;
  }
  const dmg = raw * mult;
  target.hp -= dmg;
  target.lastHitBy = attacker.id;
  target.lastHitAt = state.time;

  if (!opts.isSecondary) {
    // On-hit attack speed slows (Shadow Pact faction / Saboteur-style passives).
    const passiveSlow: PassiveEffect | undefined =
      attacker.passive?.kind === 'onHitSlow' ? attacker.passive : undefined;
    if (passiveSlow && passiveSlow.kind === 'onHitSlow') {
      applySlow(state, target, passiveSlow);
    } else if (attacker.kind === 'fighter' && attacker.factionId === 'shadow') {
      applySlow(state, target, CFG.combat.shadowSlow);
    }
    if (attacker.lifestealPct > 0) {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + dmg * attacker.lifestealPct);
    }
  }

  // Damaging the enemy king pays the attacking team a small gold bonus.
  if (target.kind === 'king') {
    for (const pid of state.teams[attacker.teamId].playerIds) {
      state.players[pid].gold += dmg * CFG.kingDamageGoldRate;
    }
  }

  if (target.hp <= 0) killUnit(state, target);
};

/** Recompute aura buffs (attack speed / lifesteal) from support fighters. */
const refreshAuras = (state: GameState): void => {
  for (const u of state.units.values()) {
    if (u.kind !== 'creep') {
      u.asBuffPct = 0;
      u.lifestealPct = 0;
    }
  }
  for (const src of state.units.values()) {
    if (src.state === 'dead' || src.kind !== 'fighter' || !src.passive) continue;
    const p = src.passive;
    if (p.kind !== 'atkSpeedAura' && p.kind !== 'lifestealAura') continue;
    const allies = livingAlliesInZone(state, src.zoneId, src.teamId);
    for (const ally of allies) {
      if (ally.kind !== 'fighter' || dist(src.pos, ally.pos) > p.radius) continue;
      if (p.kind === 'atkSpeedAura') ally.asBuffPct += p.pct;
      else ally.lifestealPct += p.pct;
    }
  }
};

const tickHealPulse = (state: GameState, u: CombatUnit): void => {
  if (!u.passive || u.passive.kind !== 'healPulse') return;
  if (state.time < u.nextPassiveAt) return;
  const p = u.passive;
  const allies = livingAlliesInZone(state, u.zoneId, u.teamId).filter(
    (a) => a.kind === 'fighter' && a.hp < a.maxHp && dist(u.pos, a.pos) <= p.radius
  );
  if (allies.length === 0) return;
  allies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  const target = allies[0];
  target.hp = Math.min(target.maxHp, target.hp + p.amount);
  u.nextPassiveAt = state.time + p.interval;
  state.events.push({ type: 'heal', unitId: target.id, zoneId: target.zoneId, pos: { ...target.pos } });
};

const performAttack = (state: GameState, u: CombatUnit, target: CombatUnit): void => {
  const eff = effectiveAttackSpeed(u, state.time);
  u.attackReadyAt = state.time + 1 / Math.max(0.05, eff);
  state.events.push({
    type: 'attack',
    fromId: u.id,
    toId: target.id,
    ranged: u.range > 1.4,
    zoneId: u.zoneId,
    fromPos: { ...u.pos },
    toPos: { ...target.pos },
    attackType: u.attackType
  });
  applyDamage(state, u, target, u.damage);

  if (u.splash) {
    const hostiles = livingHostilesInZone(state, u.zoneId, u.teamId);
    for (const h of hostiles) {
      if (h.id === target.id) continue;
      if (dist(h.pos, target.pos) <= u.splash.radius) {
        applyDamage(state, u, h, u.damage * u.splash.pct, { isSecondary: true });
      }
    }
  }
};

export const tickCombat = (state: GameState, dt: number): void => {
  // Periodic aura refresh.
  if (state.time % CFG.combat.auraRefreshInterval < dt) refreshAuras(state);

  for (const u of state.units.values()) {
    if (u.state === 'dead') continue;

    // Wildroot faction: passive regeneration during battle.
    if (u.kind === 'fighter' && u.factionId === 'wildroot' && state.phase === 'battle' && u.hp < u.maxHp) {
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * CFG.combat.wildrootRegenPct * dt);
    }

    tickHealPulse(state, u);

    if (u.targetId === null) continue;
    const target = state.units.get(u.targetId);
    if (!target || target.state === 'dead' || target.zoneId !== u.zoneId) continue;
    if (dist(u.pos, target.pos) > u.range + 0.05) continue;

    u.state = 'attacking';
    if (state.time >= u.attackReadyAt) performAttack(state, u, target);
  }
};
