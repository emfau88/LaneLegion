import { CFG } from '../data/gameConfig';
import type { GameState } from '../model/GameState';

/** Workers passively generate mythium, in both build and battle phase. */
export const tickMythium = (state: GameState, dt: number): void => {
  for (const pid of state.playerOrder) {
    const p = state.players[pid];
    p.mythium += p.workers * CFG.mythiumPerWorkerPerSec * dt;
  }
};

export const tryBuyWorker = (state: GameState, playerId: string): boolean => {
  if (state.phase !== 'build') return false;
  const p = state.players[playerId];
  if (p.gold < CFG.workerCost) return false;
  p.gold -= CFG.workerCost;
  p.workers += 1;
  return true;
};

/** End-of-battle income payout. */
export const payIncome = (state: GameState): void => {
  for (const pid of state.playerOrder) {
    const p = state.players[pid];
    p.gold += p.income;
  }
};
