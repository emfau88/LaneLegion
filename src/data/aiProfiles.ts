import type { Difficulty } from '../model/Types';

export interface AIProfile {
  difficulty: Difficulty;
  /** Multiplier on the wave's recommendedFighterValue the AI tries to reach. */
  defenseFactor: number;
  /** Max workers bought per build phase. */
  maxWorkersPerWave: number;
  /** Gold kept in reserve before buying workers. */
  workerGoldReserve: number;
  /** Chance per think step to upgrade an existing fighter instead of buying new. */
  upgradeBias: number;
  /** Waves before which the AI saves mythium for a power send. */
  saveWaves: number[];
  /** Preferred power-send merc ids (tried expensive-first). */
  powerSends: string[];
  /** Fallback income merc id. */
  incomeSend: string;
  /** Chance per think step to actually spend mythium on income sends. */
  sendAggressiveness: number;
  /** Chance to skip an otherwise good action (deliberate mistakes). */
  mistakeChance: number;
  /** Invests in king upgrades when it leaked last wave and has this much mythium. */
  kingInvestMythium: number;
}

export const AI_PROFILES: Record<Difficulty, AIProfile> = {
  easy: {
    difficulty: 'easy',
    defenseFactor: 1.2,
    maxWorkersPerWave: 1,
    workerGoldReserve: 60,
    upgradeBias: 0.1,
    saveWaves: [],
    powerSends: ['brute'],
    incomeSend: 'crawler',
    sendAggressiveness: 0.7,
    mistakeChance: 0.35,
    kingInvestMythium: 120
  },
  normal: {
    difficulty: 'normal',
    defenseFactor: 1.0,
    maxWorkersPerWave: 2,
    workerGoldReserve: 40,
    upgradeBias: 0.3,
    saveWaves: [5, 8],
    powerSends: ['crusher', 'brute'],
    incomeSend: 'crawler',
    sendAggressiveness: 0.85,
    mistakeChance: 0.12,
    kingInvestMythium: 90
  },
  hard: {
    difficulty: 'hard',
    defenseFactor: 0.9,
    maxWorkersPerWave: 3,
    workerGoldReserve: 20,
    upgradeBias: 0.45,
    saveWaves: [5, 8, 10],
    powerSends: ['drake', 'crusher'],
    incomeSend: 'crawler',
    sendAggressiveness: 0.95,
    mistakeChance: 0.03,
    kingInvestMythium: 70
  }
};
