import { arenaUnitById } from '../data/arenaUnits';
import { arenaEncounter } from '../data/arenaEncounters';
import {
  ARENA_CORE_MAX_HP,
  cellCenter,
  type ArenaBattleState,
  type ArenaPlacement,
  type ArenaTeam,
  type ArenaTier,
  type ArenaUnitState
} from './ArenaTypes';

export const DEFAULT_PLAYER_PLACEMENTS: ArenaPlacement[] = [
  { definitionId: 'shield_guard', col: 3, row: 3 },
  { definitionId: 'ranger', col: 1, row: 5 },
  { definitionId: 'fire_mage', col: 5, row: 5 },
  { definitionId: 'healer', col: 3, row: 5 }
];

export const ENEMY_PLACEMENTS: ArenaPlacement[] = arenaEncounter(0).enemyPlacements;

const createUnit = (id: number, team: ArenaTeam, placement: ArenaPlacement): ArenaUnitState => {
  const definition = arenaUnitById(placement.definitionId);
  const tier: ArenaTier = team === 'player' ? placement.tier ?? 0 : 0;
  const upgrade = tier === 1 ? definition.upgradePaths?.[0] : undefined;
  const cell = { col: placement.col, row: placement.row };
  const splash = definition.splash ? {
    radius: definition.splash.radius,
    multiplier: definition.splash.multiplier * (upgrade?.splashMultiplier ?? 1)
  } : undefined;
  const healing = definition.healing ? {
    ...definition.healing,
    amount: definition.healing.amount * (upgrade?.healingMultiplier ?? 1)
  } : undefined;
  const maxHp = definition.hp * (upgrade?.hpMultiplier ?? 1);
  return {
    id,
    rosterId: team === 'player' ? placement.rosterId ?? id : null,
    definitionId: placement.definitionId,
    tier,
    team,
    cell,
    pos: cellCenter(cell),
    hp: maxHp,
    maxHp,
    alive: true,
    targetId: null,
    attackCooldown: team === 'enemy' ? 0.16 : 0,
    healCooldown: 0.55,
    retargetCooldown: 0,
    activity: 'idle',
    combat: {
      damage: definition.damage * (upgrade?.damageMultiplier ?? 1),
      attackInterval: definition.attackInterval,
      range: definition.range,
      moveSpeed: definition.moveSpeed,
      radius: definition.radius,
      splash,
      healing,
      coreDamage: definition.coreDamage
    }
  };
};

export const clonePlacements = (placements: ArenaPlacement[]): ArenaPlacement[] =>
  placements.map((placement) => ({ ...placement }));

export const createArenaBattle = (
  playerPlacements: ArenaPlacement[] = DEFAULT_PLAYER_PLACEMENTS,
  fightIndex = 0
): ArenaBattleState => {
  let nextPlayerId = 1;
  let nextEnemyId = 100;
  const playerUnits = playerPlacements.map((placement) =>
    createUnit(placement.rosterId ?? nextPlayerId++, 'player', placement)
  );
  const enemyUnits = arenaEncounter(fightIndex).enemyPlacements.map((placement) =>
    createUnit(nextEnemyId++, 'enemy', placement)
  );
  return {
    phase: 'planning',
    time: 0,
    coreHp: ARENA_CORE_MAX_HP,
    coreMaxHp: ARENA_CORE_MAX_HP,
    speed: 1,
    units: [...playerUnits, ...enemyUnits],
    events: []
  };
};
