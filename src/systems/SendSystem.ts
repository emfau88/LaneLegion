import { mercById, MERCENARIES } from '../data/mercenaries';
import type { GameState } from '../model/GameState';

/**
 * Buy a mercenary send. Mythium is spent and income granted immediately;
 * the merc spawns in the target lane at the start of the next battle phase.
 * Allowed during build AND battle (battle purchases queue for the next wave).
 */
export const tryQueueSend = (state: GameState, playerId: string, mercId: string): boolean => {
  if (state.phase === 'ended') return false;
  const p = state.players[playerId];
  const merc = mercById(mercId);
  if (p.mythium < merc.cost) return false;
  p.mythium -= merc.cost;
  p.income += merc.incomeGain;
  p.pendingSends.push(mercId);
  return true;
};

/** Auto-send: dump all mythium into the most income-efficient merc. */
export const spendAllOnIncome = (state: GameState, playerId: string): void => {
  const cheapest = [...MERCENARIES].sort(
    (a, b) => b.incomeGain / b.cost - a.incomeGain / a.cost
  )[0];
  let guard = 0;
  while (state.players[playerId].mythium >= cheapest.cost && guard++ < 60) {
    if (!tryQueueSend(state, playerId, cheapest.id)) break;
  }
};
