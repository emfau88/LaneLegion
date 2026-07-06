import { CFG } from '../data/gameConfig';
import { KING_UPGRADES, KING_UPGRADE_INCOME, kingUpgradeCost } from '../data/kingUpgrades';
import type { CombatUnit } from '../model/CombatUnit';
import type { GameState } from '../model/GameState';
import type { KingUpgradeType } from '../model/Types';
import { arenaZoneId, laneZoneId } from '../model/GameState';
import { cellCenter, dist, livingHostilesInZone } from '../core/util';
import { applyDamage } from './CombatSystem';

export const kingOf = (state: GameState, teamId: string): CombatUnit | undefined =>
  state.units.get(state.teams[teamId].kingUnitId);

export const kingSpellDamage = (state: GameState, teamId: string): number =>
  CFG.king.spellDamageBase +
  state.teams[teamId].kingUpgrades.spell * KING_UPGRADES.spell.valuePerLevel;

export const kingRegenPerSec = (state: GameState, teamId: string): number =>
  CFG.king.regenBase + state.teams[teamId].kingUpgrades.regen * KING_UPGRADES.regen.valuePerLevel;

export const tryBuyKingUpgrade = (
  state: GameState,
  playerId: string,
  type: KingUpgradeType
): boolean => {
  if (state.phase === 'ended') return false;
  const player = state.players[playerId];
  const team = state.teams[player.teamId];
  const spec = KING_UPGRADES[type];
  const level = team.kingUpgrades[type];
  if (level >= spec.maxLevel) return false;
  const cost = kingUpgradeCost(spec, level);
  if (player.mythium < cost) return false;

  player.mythium -= cost;
  player.income += KING_UPGRADE_INCOME;
  team.kingUpgrades[type] = level + 1;

  if (type === 'attack') {
    const king = kingOf(state, team.id);
    if (king) king.damage = CFG.king.damage + team.kingUpgrades.attack * spec.valuePerLevel;
  }
  return true;
};

/** Cleared lanes send their surviving fighters to help defend the king, then return. */
const manageKingHelpers = (state: GameState, teamId: string): void => {
  const arenaId = arenaZoneId(teamId);
  const arenaHostiles = livingHostilesInZone(state, arenaId, teamId);
  const team = state.teams[teamId];

  if (arenaHostiles.length === 0) {
    // Arena clear: send helper fighters home.
    for (const u of state.units.values()) {
      if (u.kind === 'fighter' && u.zoneId === arenaId && u.state !== 'dead' && u.homeLaneId && u.homeCell) {
        u.zoneId = u.homeLaneId;
        u.pos = cellCenter(u.homeCell.col, u.homeCell.row);
        u.targetId = null;
        u.retargetAt = state.time;
      }
    }
    return;
  }

  for (const pid of team.playerIds) {
    const laneId = laneZoneId(pid);
    const laneHostiles = livingHostilesInZone(state, laneId, teamId);
    const pendingForLane = state.battle?.spawnQueue.some((j) => j.laneId === laneId) ?? false;
    if (laneHostiles.length > 0 || pendingForLane) continue;

    let idx = 0;
    for (const u of state.units.values()) {
      if (u.kind !== 'fighter' || u.zoneId !== laneId || u.state === 'dead') continue;
      const angle = (idx / 8) * Math.PI * 2;
      u.zoneId = arenaId;
      u.pos = {
        x: CFG.arena.kingPos.x + Math.cos(angle) * 1.4,
        y: CFG.arena.kingPos.y - 0.8 - Math.abs(Math.sin(angle)) * 0.8
      };
      u.targetId = null;
      u.retargetAt = state.time;
      idx++;
    }
  }
};

export const tickKings = (state: GameState, dt: number): void => {
  for (const teamId of state.teamOrder) {
    const king = kingOf(state, teamId);
    const team = state.teams[teamId];
    if (!king || king.state === 'dead') continue;

    // Slow regeneration while alive.
    if (king.hp < king.maxHp) {
      king.hp = Math.min(king.maxHp, king.hp + kingRegenPerSec(state, teamId) * dt);
    }

    // Mana for the automatic AOE spell.
    team.kingMana = Math.min(CFG.king.manaMax, team.kingMana + CFG.king.manaRegen * dt);
    if (state.phase === 'battle' && team.kingMana >= CFG.king.manaMax) {
      const hostiles = livingHostilesInZone(state, king.zoneId, teamId).filter(
        (h) => dist(h.pos, king.pos) <= CFG.king.spellRadius
      );
      if (hostiles.length > 0) {
        team.kingMana = 0;
        state.events.push({
          type: 'kingSpell',
          teamId,
          zoneId: king.zoneId,
          pos: { ...king.pos },
          radius: CFG.king.spellRadius
        });
        const dmg = kingSpellDamage(state, teamId);
        for (const h of hostiles) applyDamage(state, king, h, dmg, { isSecondary: true });
      }
    }

    if (state.phase === 'battle') manageKingHelpers(state, teamId);
  }
};
