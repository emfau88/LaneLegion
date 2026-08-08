import { ARENA_ENCOUNTERS } from '../data/arenaEncounters';
import { arenaUnitById, PLAYER_DEFINITION_IDS } from '../data/arenaUnits';
import {
  PLAYER_FIRST_ROW,
  type ArenaCell,
  type ArenaOwnedFighter,
  type ArenaPlacement,
  type ArenaRunState,
  type ArenaShopOffer
} from './ArenaTypes';

export const MAX_DEPLOYED_FIGHTERS = 5;
export const MAX_RESERVE_FIGHTERS = 3;
export const STARTING_GOLD = 5;
export const REROLL_COST = 1;

const START_CELLS: ArenaCell[] = [
  { col: 3, row: 3 },
  { col: 1, row: 5 },
  { col: 5, row: 5 },
  { col: 3, row: 5 }
];

const EXTRA_DEPLOY_CELLS: ArenaCell[] = [
  { col: 3, row: 4 },
  { col: 2, row: 4 },
  { col: 4, row: 4 },
  { col: 0, row: 5 },
  { col: 6, row: 5 }
];

const copyCell = (cell: ArenaCell | null): ArenaCell | null => cell ? { ...cell } : null;

export const cloneArenaRun = (run: ArenaRunState): ArenaRunState => ({
  ...run,
  fighters: run.fighters.map((fighter) => ({ ...fighter, cell: copyCell(fighter.cell) })),
  shopOffers: run.shopOffers.map((offer) => ({ ...offer }))
});

const random01 = (seed: number): number => {
  let value = seed | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 4294967296;
};

export const generateShopOffers = (fightIndex: number, roll: number): ArenaShopOffer[] => {
  const pool = [...PLAYER_DEFINITION_IDS]
    .map((definitionId, index) => ({
      definitionId,
      score: random01((fightIndex + 1) * 7919 + (roll + 1) * 104729 + index * 1543)
    }))
    .sort((a, b) => a.score - b.score || a.definitionId.localeCompare(b.definitionId));
  return pool.slice(0, 3).map((entry, index) => ({
    id: roll * 10 + index,
    definitionId: entry.definitionId,
    cost: arenaUnitById(entry.definitionId).cost ?? 3
  }));
};

export const createArenaRun = (): ArenaRunState => {
  const fighters = PLAYER_DEFINITION_IDS.map((definitionId, index): ArenaOwnedFighter => ({
    id: index + 1,
    definitionId,
    tier: 0,
    cell: { ...START_CELLS[index] }
  }));
  return {
    fightIndex: 0,
    gold: STARTING_GOLD,
    nextFighterId: fighters.length + 1,
    shopRoll: 0,
    rerollsLeft: 1,
    fighters,
    shopOffers: generateShopOffers(0, 0)
  };
};

export const deployedFighters = (run: ArenaRunState): ArenaOwnedFighter[] =>
  run.fighters.filter((fighter) => fighter.cell !== null);

export const reserveFighters = (run: ArenaRunState): ArenaOwnedFighter[] =>
  run.fighters.filter((fighter) => fighter.cell === null);

export const arenaRunPlacements = (run: ArenaRunState): ArenaPlacement[] =>
  deployedFighters(run).map((fighter) => ({
    definitionId: fighter.definitionId,
    col: fighter.cell!.col,
    row: fighter.cell!.row,
    rosterId: fighter.id,
    tier: fighter.tier
  }));

const firstOpenCell = (run: ArenaRunState): ArenaCell | null => {
  const used = new Set(deployedFighters(run).map((fighter) => `${fighter.cell!.col}:${fighter.cell!.row}`));
  for (const cell of EXTRA_DEPLOY_CELLS) {
    if (!used.has(`${cell.col}:${cell.row}`)) return { ...cell };
  }
  for (let row = PLAYER_FIRST_ROW; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      if (!used.has(`${col}:${row}`)) return { col, row };
    }
  }
  return null;
};

export const canBuyArenaOffer = (run: ArenaRunState, offerId: number): boolean => {
  const offer = run.shopOffers.find((candidate) => candidate.id === offerId);
  if (!offer || run.gold < offer.cost) return false;
  return run.fighters.length < MAX_DEPLOYED_FIGHTERS + MAX_RESERVE_FIGHTERS;
};

export const buyArenaOffer = (run: ArenaRunState, offerId: number): boolean => {
  const offer = run.shopOffers.find((candidate) => candidate.id === offerId);
  if (!offer || !canBuyArenaOffer(run, offerId)) return false;
  const cell = deployedFighters(run).length < MAX_DEPLOYED_FIGHTERS ? firstOpenCell(run) : null;
  run.gold -= offer.cost;
  run.fighters.push({
    id: run.nextFighterId++,
    definitionId: offer.definitionId,
    tier: 0,
    cell
  });
  run.shopOffers = run.shopOffers.filter((candidate) => candidate.id !== offerId);
  return true;
};

export const rerollArenaShop = (run: ArenaRunState): boolean => {
  if (run.rerollsLeft <= 0 || run.gold < REROLL_COST) return false;
  run.gold -= REROLL_COST;
  run.rerollsLeft--;
  run.shopRoll++;
  run.shopOffers = generateShopOffers(run.fightIndex, run.shopRoll);
  return true;
};

export const upgradeArenaFighter = (run: ArenaRunState, fighterId: number): boolean => {
  const fighter = run.fighters.find((candidate) => candidate.id === fighterId);
  if (!fighter || fighter.tier !== 0) return false;
  const path = arenaUnitById(fighter.definitionId).upgradePaths?.[0];
  if (!path || run.gold < path.cost) return false;
  run.gold -= path.cost;
  fighter.tier = 1;
  return true;
};

export const benchArenaFighter = (run: ArenaRunState, fighterId: number): boolean => {
  const fighter = run.fighters.find((candidate) => candidate.id === fighterId);
  if (!fighter?.cell || reserveFighters(run).length >= MAX_RESERVE_FIGHTERS) return false;
  if (deployedFighters(run).length <= 1) return false;
  fighter.cell = null;
  return true;
};

export const deployArenaFighter = (run: ArenaRunState, fighterId: number, cell: ArenaCell): boolean => {
  const fighter = run.fighters.find((candidate) => candidate.id === fighterId);
  if (!fighter || fighter.cell || deployedFighters(run).length >= MAX_DEPLOYED_FIGHTERS) return false;
  if (cell.row < PLAYER_FIRST_ROW || run.fighters.some((candidate) => candidate.cell?.col === cell.col && candidate.cell.row === cell.row)) {
    return false;
  }
  fighter.cell = { ...cell };
  return true;
};

export const resetArenaFormation = (run: ArenaRunState): void => {
  const deployed = run.fighters.filter((fighter) => fighter.cell !== null);
  const reserve = run.fighters.filter((fighter) => fighter.cell === null);
  deployed.forEach((fighter, index) => {
    fighter.cell = index < START_CELLS.length ? { ...START_CELLS[index] } : null;
  });
  for (const fighter of reserve) fighter.cell = null;
  for (const fighter of run.fighters) {
    if (deployedFighters(run).length >= MAX_DEPLOYED_FIGHTERS) break;
    if (fighter.cell === null) fighter.cell = firstOpenCell(run);
  }
};

export const advanceArenaRun = (run: ArenaRunState): boolean => {
  const encounter = ARENA_ENCOUNTERS[run.fightIndex];
  if (!encounter || encounter.boss) return false;
  run.gold += encounter.reward;
  run.fightIndex++;
  run.shopRoll = 0;
  run.rerollsLeft = 1;
  run.shopOffers = generateShopOffers(run.fightIndex, 0);
  return true;
};
