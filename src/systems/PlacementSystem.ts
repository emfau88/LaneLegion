import { CFG } from '../data/gameConfig';
import { fighterById } from '../data/fighters';
import type { CombatUnit } from '../model/CombatUnit';
import type { FighterDefinition } from '../model/UnitDefinition';
import type { GameState } from '../model/GameState';
import { cellCenter } from '../core/util';

const fighterAggro = (def: FighterDefinition, range: number): number => {
  const a = CFG.fighter.aggro;
  switch (def.role) {
    case 'tank':
      return a.tank;
    case 'support':
      return a.support;
    case 'ranged':
    case 'aoe':
      return range + a.rangedBonus;
    default:
      return a.melee;
  }
};

export const isBuildCell = (col: number, row: number): boolean =>
  col >= 0 &&
  col < CFG.grid.cols &&
  row >= CFG.grid.buildRowStart &&
  row <= CFG.grid.buildRowEnd;

export const isCellFree = (state: GameState, laneId: string, col: number, row: number): boolean =>
  isBuildCell(col, row) && state.lanes[laneId].grid[row][col] === null;

export const validCells = (state: GameState, playerId: string): { col: number; row: number }[] => {
  const lane = state.lanes[state.players[playerId].laneId];
  const out: { col: number; row: number }[] = [];
  for (let row = CFG.grid.buildRowStart; row <= CFG.grid.buildRowEnd; row++) {
    for (let col = 0; col < CFG.grid.cols; col++) {
      if (lane.grid[row][col] === null) out.push({ col, row });
    }
  }
  return out;
};

const createFighterUnit = (
  state: GameState,
  playerId: string,
  def: FighterDefinition,
  col: number,
  row: number
): CombatUnit => {
  const player = state.players[playerId];
  const tier = def.tiers[0];
  let maxHp = tier.hp;
  if (player.factionId === 'ironclad' && def.role === 'tank') {
    maxHp = Math.round(maxHp * (1 + CFG.combat.ironcladTankHpBonus));
  }
  const unit: CombatUnit = {
    id: state.nextUnitId++,
    kind: 'fighter',
    defId: def.id,
    name: tier.name,
    ownerId: playerId,
    teamId: player.teamId,
    zoneId: player.laneId,
    homeLaneId: player.laneId,
    homeCell: { col, row },
    factionId: player.factionId,
    role: def.role,
    hp: maxHp,
    maxHp,
    damage: tier.damage,
    attackSpeed: tier.attackSpeed,
    range: tier.range,
    moveSpeed: tier.moveSpeed,
    attackType: def.attackType,
    armorType: def.armorType,
    aggroRadius: fighterAggro(def, tier.range),
    collisionRadius: CFG.fighter.collisionRadius,
    pos: cellCenter(col, row),
    targetId: null,
    retargetAt: 0,
    attackReadyAt: 0,
    state: 'idle',
    threatModifier: def.role === 'tank' ? 1.5 : 1,
    slows: [],
    asBuffPct: 0,
    lifestealPct: 0,
    lastHitBy: null,
    lastHitAt: -999,
    splash: tier.splash,
    passive: tier.passive,
    nextPassiveAt: 0,
    tier: 0,
    investedGold: tier.cost,
    bounty: 0,
    leaked: false
  };
  state.units.set(unit.id, unit);
  return unit;
};

/** Buy and place a fighter. Returns the unit or null if the action is invalid. */
export const tryBuyFighter = (
  state: GameState,
  playerId: string,
  defId: string,
  col: number,
  row: number
): CombatUnit | null => {
  if (state.phase !== 'build') return null;
  const player = state.players[playerId];
  const def = fighterById(defId);
  const cost = def.tiers[0].cost;
  if (player.gold < cost) return null;
  if (!isCellFree(state, player.laneId, col, row)) return null;

  const unit = createFighterUnit(state, playerId, def, col, row);
  state.lanes[player.laneId].grid[row][col] = unit.id;
  player.gold -= cost;
  return unit;
};

export const tryUpgradeFighter = (state: GameState, playerId: string, unitId: number): boolean => {
  if (state.phase !== 'build') return false;
  const player = state.players[playerId];
  const unit = state.units.get(unitId);
  if (!unit || unit.kind !== 'fighter' || unit.ownerId !== playerId || unit.tier !== 0) return false;

  const def = fighterById(unit.defId);
  const up = def.tiers[1];
  if (player.gold < up.cost) return false;

  player.gold -= up.cost;
  unit.tier = 1;
  unit.name = up.name;
  let maxHp = up.hp;
  if (player.factionId === 'ironclad' && def.role === 'tank') {
    maxHp = Math.round(maxHp * (1 + CFG.combat.ironcladTankHpBonus));
  }
  unit.maxHp = maxHp;
  unit.hp = maxHp;
  unit.damage = up.damage;
  unit.attackSpeed = up.attackSpeed;
  unit.range = up.range;
  unit.moveSpeed = up.moveSpeed;
  unit.splash = up.splash;
  unit.passive = up.passive;
  unit.aggroRadius = fighterAggro(def, up.range);
  unit.investedGold += up.cost;
  return true;
};

export const trySellFighter = (state: GameState, playerId: string, unitId: number): boolean => {
  if (state.phase !== 'build') return false;
  const player = state.players[playerId];
  const unit = state.units.get(unitId);
  if (!unit || unit.kind !== 'fighter' || unit.ownerId !== playerId) return false;

  player.gold += Math.floor(unit.investedGold * CFG.sellRefundRate);
  if (unit.homeCell && unit.homeLaneId) {
    state.lanes[unit.homeLaneId].grid[unit.homeCell.row][unit.homeCell.col] = null;
  }
  state.units.delete(unit.id);
  return true;
};
