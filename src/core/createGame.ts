import { CFG } from '../data/gameConfig';
import { FACTIONS } from '../data/factions';
import type { CombatUnit } from '../model/CombatUnit';
import type { LaneState } from '../model/LaneState';
import type { PlayerState } from '../model/PlayerState';
import type { TeamState } from '../model/TeamState';
import { arenaZoneId, laneZoneId, type GameSetup, type GameState } from '../model/GameState';
import { rngInt } from './util';

const makeLane = (ownerId: string): LaneState => ({
  id: laneZoneId(ownerId),
  ownerId,
  grid: Array.from({ length: CFG.grid.rows }, () =>
    Array.from({ length: CFG.grid.cols }, () => null)
  )
});

const makePlayer = (
  id: string,
  name: string,
  teamId: string,
  isHuman: boolean,
  factionId: string,
  sendTargetPlayerId: string
): PlayerState => ({
  id,
  name,
  teamId,
  isHuman,
  factionId,
  laneId: laneZoneId(id),
  gold: CFG.startGold,
  mythium: CFG.startMythium,
  income: CFG.startIncome,
  workers: CFG.startWorkers,
  pendingSends: [],
  autoSend: false,
  sendTargetPlayerId,
  ready: false,
  leaksThisWave: 0,
  leakedLastWave: false,
  totalLeaks: 0,
  goldFraction: 0
});

const makeKing = (state: GameState, teamId: string, hp: number): CombatUnit => {
  const king: CombatUnit = {
    id: state.nextUnitId++,
    kind: 'king',
    defId: 'king',
    name: 'King',
    ownerId: teamId,
    teamId,
    zoneId: arenaZoneId(teamId),
    role: 'tank',
    hp,
    maxHp: hp,
    damage: CFG.king.damage,
    attackSpeed: CFG.king.attackSpeed,
    range: CFG.king.range,
    moveSpeed: 0,
    attackType: 'pure',
    armorType: 'massive',
    aggroRadius: CFG.king.aggroRadius,
    collisionRadius: CFG.king.collisionRadius,
    pos: { x: CFG.arena.kingPos.x, y: CFG.arena.kingPos.y },
    targetId: null,
    retargetAt: 0,
    attackReadyAt: 0,
    state: 'idle',
    threatModifier: 1,
    slows: [],
    asBuffPct: 0,
    lifestealPct: 0,
    lastHitBy: null,
    lastHitAt: -999,
    nextPassiveAt: 0,
    tier: 0,
    investedGold: 0,
    bounty: 0,
    leaked: false
  };
  state.units.set(king.id, king);
  return king;
};

/** Builds the full initial game state for a match. */
export const createGame = (setup: GameSetup): GameState => {
  const state: GameState = {
    setup,
    time: 0,
    phase: 'build',
    phaseEndsAt: CFG.buildDuration,
    waveNumber: 1,
    maxWaves: CFG.maxWaves,
    units: new Map(),
    nextUnitId: 1,
    players: {},
    playerOrder: [],
    teams: {},
    teamOrder: ['T1', 'T2'],
    lanes: {},
    humanPlayerId: 'p1',
    battle: null,
    winnerTeamId: null,
    winReason: '',
    events: [],
    rngState: setup.seed | 0 || 1
  };

  const randomFaction = (): string => FACTIONS[rngInt(state, FACTIONS.length)].id;

  if (setup.mode === '1v1') {
    state.players.p1 = makePlayer('p1', 'You', 'T1', true, setup.playerFactionId, 'e1');
    state.players.e1 = makePlayer('e1', 'Enemy', 'T2', false, randomFaction(), 'p1');
    state.playerOrder = ['p1', 'e1'];
  } else {
    state.players.p1 = makePlayer('p1', 'You', 'T1', true, setup.playerFactionId, 'e1');
    state.players.a1 = makePlayer('a1', 'Ally', 'T1', false, randomFaction(), 'e2');
    state.players.e1 = makePlayer('e1', 'Enemy A', 'T2', false, randomFaction(), 'p1');
    state.players.e2 = makePlayer('e2', 'Enemy B', 'T2', false, randomFaction(), 'a1');
    state.playerOrder = ['p1', 'a1', 'e1', 'e2'];
  }

  for (const pid of state.playerOrder) {
    state.lanes[laneZoneId(pid)] = makeLane(pid);
  }

  const kingHp = setup.mode === '1v1' ? CFG.king.hp1v1 : CFG.king.hp2v2;
  for (const teamId of state.teamOrder) {
    const playerIds = state.playerOrder.filter((pid) => state.players[pid].teamId === teamId);
    const king = makeKing(state, teamId, kingHp);
    const team: TeamState = {
      id: teamId,
      name: teamId === 'T1' ? 'Your Team' : 'Enemy Team',
      playerIds,
      kingUnitId: king.id,
      kingUpgrades: { attack: 0, regen: 0, spell: 0 },
      kingMana: 0
    };
    state.teams[teamId] = team;
  }

  return state;
};
