import type { CombatUnit } from './CombatUnit';
import type { LaneState } from './LaneState';
import type { PlayerState } from './PlayerState';
import type { TeamState } from './TeamState';
import type { CreepStats } from './UnitDefinition';
import type { Difficulty, GameEvent, GameMode, Phase, WinReason } from './Types';

export interface GameSetup {
  mode: GameMode;
  difficulty: Difficulty;
  playerFactionId: string;
  seed: number;
}

/** One pending creep spawn during a battle phase. */
export interface SpawnJob {
  /** Seconds after battle start. */
  at: number;
  laneId: string;
  stats: CreepStats;
  col: number;
  teamId: string;
  defenderPlayerId: string;
  isMerc: boolean;
}

export interface BattleState {
  spawnQueue: SpawnJob[];
  startedAt: number;
  /** King HP per team when the battle began (for the post-wave report). */
  kingHpAtStart: Record<string, number>;
}

export interface WaveReportEntry {
  leaks: number;
  /** Gold income paid out to this player at the end of the wave. */
  incomePaid: number;
}

/** Summary of the last finished battle phase, shown between waves. */
export interface WaveReport {
  waveNumber: number;
  perPlayer: Record<string, WaveReportEntry>;
  /** King damage taken during the wave, per team. */
  kingDamage: Record<string, number>;
}

export interface GameState {
  setup: GameSetup;
  time: number;
  phase: Phase;
  phaseEndsAt: number;
  waveNumber: number;
  maxWaves: number;

  units: Map<number, CombatUnit>;
  nextUnitId: number;

  players: Record<string, PlayerState>;
  playerOrder: string[];
  teams: Record<string, TeamState>;
  teamOrder: string[];
  lanes: Record<string, LaneState>;
  humanPlayerId: string;

  battle: BattleState | null;
  waveReport: WaveReport | null;
  winnerTeamId: string | null;
  winReason: WinReason;

  events: GameEvent[];
  rngState: number;
}

export const laneZoneId = (playerId: string) => `lane_${playerId}`;
export const arenaZoneId = (teamId: string) => `arena_${teamId}`;
