import { AI_PROFILES, type AIProfile } from '../data/aiProfiles';
import { CFG } from '../data/gameConfig';
import { fighterById, fightersOfFaction } from '../data/fighters';
import { mercById } from '../data/mercenaries';
import { waveByNumber } from '../data/waves';
import type { GameState } from '../model/GameState';
import type { PlayerState } from '../model/PlayerState';
import type { Role } from '../model/Types';
import { playerFighterValue, rng, rngInt } from '../core/util';
import { isCellFree, tryBuyFighter, tryUpgradeFighter } from './PlacementSystem';
import { tryBuyWorker } from './EconomySystem';
import { tryQueueSend } from './SendSystem';
import { tryBuyKingUpgrade, kingOf } from './KingSystem';
import { kingUpgradeCost, KING_UPGRADES } from '../data/kingUpgrades';

interface AIMemory {
  wave: number;
  nextThinkAt: number;
  workersThisWave: number;
}

/** Row preferences per role: tanks front (low row = closer to spawn), casters back. */
const ROLE_ROWS: Record<Role, number[]> = {
  tank: [4, 5],
  melee: [5, 6],
  ranged: [7, 8],
  aoe: [7, 8],
  support: [7, 6]
};
const COL_ORDER = [2, 3, 1, 4, 0, 5];

export class AISystem {
  private mem: Record<string, AIMemory> = {};

  tickBuild(state: GameState): void {
    if (state.phase !== 'build') return;
    let idx = 0;
    for (const pid of state.playerOrder) {
      const p = state.players[pid];
      idx++;
      if (p.isHuman) continue;
      let m = this.mem[pid];
      if (!m || m.wave !== state.waveNumber) {
        m = this.mem[pid] = {
          wave: state.waveNumber,
          nextThinkAt: state.time + 0.4 + idx * 0.25,
          workersThisWave: 0
        };
      }
      if (state.time >= m.nextThinkAt) {
        m.nextThinkAt = state.time + 1.2;
        this.think(state, p, m);
      }
    }
  }

  private pickCell(state: GameState, p: PlayerState, role: Role): { col: number; row: number } | null {
    for (const row of ROLE_ROWS[role]) {
      for (const col of COL_ORDER) {
        if (isCellFree(state, p.laneId, col, row)) return { col, row };
      }
    }
    for (let row = CFG.grid.buildRowStart; row <= CFG.grid.buildRowEnd; row++) {
      for (const col of COL_ORDER) {
        if (isCellFree(state, p.laneId, col, row)) return { col, row };
      }
    }
    return null;
  }

  private tankValue(state: GameState, pid: string): number {
    let sum = 0;
    for (const u of state.units.values()) {
      if (u.kind === 'fighter' && u.ownerId === pid && u.role === 'tank') sum += u.investedGold;
    }
    return sum;
  }

  private buildDefense(state: GameState, p: PlayerState, profile: AIProfile, factor: number): void {
    const wave = waveByNumber(Math.min(state.waveNumber, state.maxWaves));
    const targetValue = wave.recommendedFighterValue * profile.defenseFactor * factor;
    let guard = 0;

    while (playerFighterValue(state, p.id) < targetValue && guard++ < 6) {
      if (rng(state) < profile.mistakeChance) return;

      // Sometimes upgrade an existing fighter instead of adding a new one.
      if (rng(state) < profile.upgradeBias) {
        const upgradable = [...state.units.values()]
          .filter((u) => u.kind === 'fighter' && u.ownerId === p.id && u.tier === 0)
          .filter((u) => fighterById(u.defId).tiers[1].cost <= p.gold)
          .sort((a, b) => b.investedGold - a.investedGold);
        if (upgradable.length > 0 && tryUpgradeFighter(state, p.id, upgradable[0].id)) continue;
      }

      const affordable = fightersOfFaction(p.factionId).filter((f) => f.tiers[0].cost <= p.gold);
      if (affordable.length === 0) return;

      const value = playerFighterValue(state, p.id);
      const needTank = value === 0 || this.tankValue(state, p.id) < value * 0.35;
      const tanks = affordable.filter((f) => f.role === 'tank');
      let pool = needTank && tanks.length > 0 ? tanks : affordable;
      // Prefer the more expensive (stronger) options.
      pool = [...pool].sort((a, b) => b.tiers[0].cost - a.tiers[0].cost);
      const pick = pool[rngInt(state, Math.min(2, pool.length))];

      const cell = this.pickCell(state, p, pick.role);
      if (!cell) return;
      if (!tryBuyFighter(state, p.id, pick.id, cell.col, cell.row)) return;
    }
  }

  private buyWorkers(state: GameState, p: PlayerState, profile: AIProfile, m: AIMemory): void {
    const wave = waveByNumber(Math.min(state.waveNumber, state.maxWaves));
    const targetValue = wave.recommendedFighterValue * profile.defenseFactor;
    if (playerFighterValue(state, p.id) < targetValue * 0.75) return;
    while (
      m.workersThisWave < profile.maxWorkersPerWave &&
      p.gold >= CFG.workerCost + profile.workerGoldReserve
    ) {
      if (!tryBuyWorker(state, p.id)) break;
      m.workersThisWave++;
    }
  }

  private investKing(state: GameState, p: PlayerState, profile: AIProfile): void {
    const king = kingOf(state, p.teamId);
    const kingHurt = king ? king.hp < king.maxHp * 0.6 : false;
    if (!p.leakedLastWave && !kingHurt) return;
    if (p.mythium < profile.kingInvestMythium) return;
    const team = state.teams[p.teamId];
    const type = team.kingUpgrades.regen <= team.kingUpgrades.attack ? 'regen' : 'attack';
    const cost = kingUpgradeCost(KING_UPGRADES[type], team.kingUpgrades[type]);
    if (p.mythium >= cost) tryBuyKingUpgrade(state, p.id, type);
  }

  private planSends(state: GameState, p: PlayerState, profile: AIProfile): void {
    if (profile.saveWaves.includes(state.waveNumber)) {
      // Power wave: dump saved mythium into the strongest sends available.
      let sentPower = false;
      for (const mercId of profile.powerSends) {
        const merc = mercById(mercId);
        let guard = 0;
        while (p.mythium >= merc.cost && guard++ < 10) {
          if (!tryQueueSend(state, p.id, mercId)) break;
          sentPower = true;
        }
      }
      if (sentPower) return;
      // Can't afford any power send: don't let mythium rot, fall through to income sends.
    } else {
      // Hold mythium if a save wave is coming up next.
      const saving = profile.saveWaves.some((w) => w === state.waveNumber + 1);
      if (saving) return;
    }

    const income = mercById(profile.incomeSend);
    let guard = 0;
    while (p.mythium >= income.cost && guard++ < 20) {
      if (rng(state) >= profile.sendAggressiveness) break;
      if (!tryQueueSend(state, p.id, profile.incomeSend)) break;
    }
  }

  private think(state: GameState, p: PlayerState, m: AIMemory): void {
    const profile = AI_PROFILES[state.setup.difficulty];
    // Core defense first, then economy, then spend any surplus on more defense.
    this.buildDefense(state, p, profile, 0.75);
    this.buyWorkers(state, p, profile, m);
    this.buildDefense(state, p, profile, 1.0);
    this.investKing(state, p, profile);
    this.planSends(state, p, profile);
  }
}
