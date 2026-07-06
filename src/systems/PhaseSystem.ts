import { CFG } from '../data/gameConfig';
import type { GameState } from '../model/GameState';
import { cellCenter, playerFighterValue } from '../core/util';
import { payIncome } from './EconomySystem';
import { spendAllOnIncome } from './SendSystem';
import { startBattle } from './WaveSystem';
import { kingOf } from './KingSystem';

/** Reset fighters for the next wave: heal, respawn, return to home cells. */
const resetFighters = (state: GameState): void => {
  const toDelete: number[] = [];
  for (const u of state.units.values()) {
    if (u.kind === 'creep') {
      toDelete.push(u.id); // dead or force-removed leftover creeps
      continue;
    }
    if (u.kind !== 'fighter') continue;
    u.hp = u.maxHp;
    u.state = 'idle';
    u.targetId = null;
    u.slows = [];
    u.attackReadyAt = 0;
    u.retargetAt = 0;
    if (u.homeLaneId && u.homeCell) {
      u.zoneId = u.homeLaneId;
      u.pos = cellCenter(u.homeCell.col, u.homeCell.row);
    }
  }
  for (const id of toDelete) state.units.delete(id);
};

export const startBuildPhase = (state: GameState): void => {
  state.phase = 'build';
  state.phaseEndsAt = state.time + CFG.buildDuration;
  state.battle = null;
  for (const pid of state.playerOrder) {
    const p = state.players[pid];
    p.ready = false;
    p.leakedLastWave = p.leaksThisWave > 0;
    p.leaksThisWave = 0;
  }
  resetFighters(state);
};

const resolveMatchEnd = (state: GameState): void => {
  const [t1, t2] = state.teamOrder;
  const k1 = kingOf(state, t1);
  const k2 = kingOf(state, t2);
  const hp1 = k1?.hp ?? 0;
  const hp2 = k2?.hp ?? 0;
  state.phase = 'ended';
  if (Math.abs(hp1 - hp2) > 0.5) {
    state.winnerTeamId = hp1 > hp2 ? t1 : t2;
    state.winReason = 'More king HP after the final wave';
    return;
  }
  const v1 = state.teams[t1].playerIds.reduce((s, pid) => s + playerFighterValue(state, pid), 0);
  const v2 = state.teams[t2].playerIds.reduce((s, pid) => s + playerFighterValue(state, pid), 0);
  state.winnerTeamId = v1 >= v2 ? t1 : t2;
  state.winReason = 'Higher total fighter value';
};

const endBattlePhase = (state: GameState): void => {
  payIncome(state);
  if (state.waveNumber >= state.maxWaves) {
    resolveMatchEnd(state);
    return;
  }
  state.waveNumber += 1;
  startBuildPhase(state);
};

const beginBattle = (state: GameState): void => {
  for (const pid of state.playerOrder) {
    if (state.players[pid].autoSend) spendAllOnIncome(state, pid);
  }
  startBattle(state);
};

export const humanReady = (state: GameState): void => {
  if (state.phase !== 'build') return;
  state.players[state.humanPlayerId].ready = true;
};

export const tickPhase = (state: GameState): void => {
  if (state.phase === 'build') {
    const human = state.players[state.humanPlayerId];
    if (human.ready || state.time >= state.phaseEndsAt) beginBattle(state);
    return;
  }

  if (state.phase === 'battle' && state.battle) {
    // Failsafe: force-end overlong battles.
    if (state.time >= state.phaseEndsAt) {
      state.battle.spawnQueue = [];
      for (const u of state.units.values()) {
        if (u.kind === 'creep' && u.state !== 'dead') {
          u.state = 'dead';
          u.hp = 0;
          state.events.push({ type: 'death', unitId: u.id, zoneId: u.zoneId, pos: { ...u.pos }, kind: 'creep' });
        }
      }
    }

    if (state.battle.spawnQueue.length > 0) return;
    for (const u of state.units.values()) {
      if (u.kind === 'creep' && u.state !== 'dead') return;
    }
    endBattlePhase(state);
  }
};
