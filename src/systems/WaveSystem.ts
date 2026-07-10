import { CFG } from '../data/gameConfig';
import { mercById } from '../data/mercenaries';
import { waveByNumber } from '../data/waves';
import type { CombatUnit } from '../model/CombatUnit';
import type { CreepStats } from '../model/UnitDefinition';
import type { GameState, SpawnJob } from '../model/GameState';
import { enemyTeamOf, rng } from '../core/util';
import { kingOf } from './KingSystem';

const createCreep = (state: GameState, job: SpawnJob): CombatUnit => {
  const s = job.stats;
  const jitter = (rng(state) - 0.5) * 0.12;
  const unit: CombatUnit = {
    id: state.nextUnitId++,
    kind: 'creep',
    defId: s.name.toLowerCase().replace(/\s+/g, '_'),
    name: s.name,
    ownerId: job.teamId,
    teamId: job.teamId,
    zoneId: job.laneId,
    role: s.role,
    hp: s.hp,
    maxHp: s.hp,
    damage: s.damage,
    attackSpeed: s.attackSpeed,
    range: s.attackRange,
    moveSpeed: s.moveSpeed,
    attackType: s.attackType,
    armorType: s.armorType,
    aggroRadius: s.aggroRadius ?? CFG.creep.aggroRadius,
    collisionRadius: s.collisionRadius ?? CFG.creep.collisionRadius,
    pos: { x: job.col + 0.5 + jitter, y: 0.12 },
    targetId: null,
    retargetAt: 0,
    attackReadyAt: 0,
    state: 'moving',
    threatModifier: 1,
    slows: [],
    asBuffPct: 0,
    lifestealPct: 0,
    lastHitBy: null,
    lastHitAt: -999,
    splash: s.splash,
    passive: s.passive,
    nextPassiveAt: 0,
    tier: 0,
    investedGold: 0,
    bounty: s.bounty,
    defenderPlayerId: job.defenderPlayerId,
    leaked: false
  };
  state.units.set(unit.id, unit);
  return unit;
};

/** Builds the spawn queue for the current wave plus all queued mercenary sends. */
export const startBattle = (state: GameState): void => {
  const wave = waveByNumber(state.waveNumber);
  const queue: SpawnJob[] = [];

  for (const pid of state.playerOrder) {
    const defender = state.players[pid];
    const laneId = defender.laneId;
    const attackingTeam = enemyTeamOf(state, defender.teamId);

    const totalCount = wave.groups.reduce((n, g) => n + g.count, 0);
    const bounty = wave.goldRewardTotal / totalCount;
    const cols = [...CFG.grid.spawnCols];
    if (totalCount > 12) cols.push(CFG.grid.extraSpawnCol);

    let t = 0;
    let i = 0;
    for (const group of wave.groups) {
      t += group.delay ?? 0;
      for (let k = 0; k < group.count; k++) {
        queue.push({
          at: t,
          laneId,
          stats: { ...group.stats, bounty },
          col: cols[i % cols.length],
          teamId: attackingTeam,
          defenderPlayerId: pid,
          isMerc: false
        });
        t += CFG.spawn.waveInterval;
        i++;
      }
    }
  }

  // Queued mercenary sends spawn slightly behind the wave in the target lane.
  for (const pid of state.playerOrder) {
    const sender = state.players[pid];
    const target = state.players[sender.sendTargetPlayerId];
    let t = CFG.spawn.mercDelay;
    let sideToggle = 0;
    for (const mercId of sender.pendingSends) {
      const merc = mercById(mercId);
      const col =
        merc.spawnStyle === 'center'
          ? 2 + (sideToggle++ % 2)
          : sideToggle++ % 2 === 0
            ? 0
            : CFG.grid.cols - 1;
      queue.push({
        at: t,
        laneId: target.laneId,
        stats: { ...merc.stats },
        col,
        teamId: sender.teamId,
        defenderPlayerId: target.id,
        isMerc: true
      });
      t += CFG.spawn.mercInterval;
    }
    sender.pendingSends = [];
  }

  queue.sort((a, b) => a.at - b.at);
  const kingHpAtStart: Record<string, number> = {};
  for (const teamId of state.teamOrder) {
    kingHpAtStart[teamId] = kingOf(state, teamId)?.hp ?? 0;
  }
  state.battle = { spawnQueue: queue, startedAt: state.time, kingHpAtStart };
  state.phase = 'battle';
  state.phaseEndsAt = state.time + CFG.maxBattleDuration;
};

export const processSpawns = (state: GameState): void => {
  const battle = state.battle;
  if (!battle) return;
  const elapsed = state.time - battle.startedAt;
  while (battle.spawnQueue.length > 0 && battle.spawnQueue[0].at <= elapsed) {
    const job = battle.spawnQueue.shift()!;
    createCreep(state, job);
  }
};
