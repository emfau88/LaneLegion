import { arenaUnitById } from '../data/arenaUnits';
import {
  ARENA_COLS,
  ARENA_ROWS,
  type ArenaBattleState,
  type ArenaPoint,
  type ArenaUnitState
} from '../model/ArenaTypes';

const CORE_POS: ArenaPoint = { x: ARENA_COLS / 2, y: ARENA_ROWS + 0.34 };

const distance = (a: ArenaPoint, b: ArenaPoint): number => Math.hypot(a.x - b.x, a.y - b.y);

const livingUnits = (state: ArenaBattleState, team: ArenaUnitState['team']): ArenaUnitState[] =>
  state.units.filter((unit) => unit.alive && unit.team === team);

const unitById = (state: ArenaBattleState, id: number | null): ArenaUnitState | null =>
  id === null ? null : state.units.find((unit) => unit.id === id) ?? null;

const targetScore = (attacker: ArenaUnitState, target: ArenaUnitState): number => {
  const attackerDefinition = arenaUnitById(attacker.definitionId);
  const targetDefinition = arenaUnitById(target.definitionId);
  let score = distance(attacker.pos, target.pos);

  if (attacker.team === 'enemy') {
    if (attackerDefinition.role === 'fast') {
      if (targetDefinition.role === 'ranged' || targetDefinition.role === 'aoe' || targetDefinition.role === 'support') {
        score -= 2.55;
      }
      score -= target.pos.y * 0.16;
    } else if (targetDefinition.role === 'tank' && distance(attacker.pos, target.pos) <= 2.35) {
      score -= 1.7;
    }
  }

  return score + target.id * 0.0001;
};

const chooseTarget = (state: ArenaBattleState, unit: ArenaUnitState): ArenaUnitState | null => {
  const hostiles = livingUnits(state, unit.team === 'player' ? 'enemy' : 'player');
  let best: ArenaUnitState | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const hostile of hostiles) {
    const score = targetScore(unit, hostile);
    if (score < bestScore) {
      best = hostile;
      bestScore = score;
    }
  }
  return best;
};

const moveToward = (unit: ArenaUnitState, point: ArenaPoint, distanceToMove: number): void => {
  const dx = point.x - unit.pos.x;
  const dy = point.y - unit.pos.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.0001) return;
  const step = Math.min(distanceToMove, length);
  unit.pos.x += (dx / length) * step;
  unit.pos.y += (dy / length) * step;
};

const damageUnit = (
  state: ArenaBattleState,
  attacker: ArenaUnitState,
  target: ArenaUnitState,
  damage: number
): void => {
  if (!target.alive) return;
  target.hp = Math.max(0, target.hp - damage);
  if (target.hp > 0) return;
  target.alive = false;
  target.activity = 'dead';
  target.targetId = null;
  state.events.push({ type: 'death', unitId: target.id, at: { ...target.pos } });
  if (attacker.targetId === target.id) attacker.targetId = null;
};

const tryHeal = (state: ArenaBattleState, healer: ArenaUnitState): boolean => {
  const healing = healer.combat.healing;
  if (!healing || healer.healCooldown > 0) return false;
  const candidates = livingUnits(state, healer.team)
    .filter((ally) => ally.hp < ally.maxHp - 8 && distance(healer.pos, ally.pos) <= healing.range)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id - b.id);
  const target = candidates[0];
  if (!target) return false;
  const amount = Math.min(healing.amount, target.maxHp - target.hp);
  target.hp += amount;
  healer.healCooldown = healing.interval;
  healer.activity = 'attacking';
  state.events.push({ type: 'heal', healerId: healer.id, targetId: target.id, at: { ...target.pos }, amount });
  return true;
};

const attackUnit = (state: ArenaBattleState, attacker: ArenaUnitState, target: ArenaUnitState): void => {
  const definition = arenaUnitById(attacker.definitionId);
  const combat = attacker.combat;
  attacker.attackCooldown = combat.attackInterval;
  attacker.activity = 'attacking';
  state.events.push({
    type: 'attack',
    attackerId: attacker.id,
    targetId: target.id,
    from: { ...attacker.pos },
    to: { ...target.pos },
    style: definition.attackStyle,
    ranged: combat.range > 1.25,
    splashRadius: combat.splash?.radius
  });
  damageUnit(state, attacker, target, combat.damage);
  if (!combat.splash) return;
  for (const hostile of livingUnits(state, target.team)) {
    if (hostile.id === target.id || distance(hostile.pos, target.pos) > combat.splash.radius) continue;
    damageUnit(state, attacker, hostile, combat.damage * combat.splash.multiplier);
  }
};

const attackCore = (state: ArenaBattleState, attacker: ArenaUnitState): void => {
  const damage = attacker.combat.coreDamage ?? 10;
  attacker.attackCooldown = attacker.combat.attackInterval;
  attacker.activity = 'attacking';
  state.coreHp = Math.max(0, state.coreHp - damage);
  state.events.push({ type: 'core-hit', attackerId: attacker.id, at: { ...CORE_POS }, damage });
};

const separateUnits = (state: ArenaBattleState): void => {
  const alive = state.units.filter((unit) => unit.alive);
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i];
      const b = alive[j];
      const minDistance = (a.combat.radius + b.combat.radius) * 0.82;
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const length = Math.hypot(dx, dy);
      if (length >= minDistance) continue;
      const nx = length < 0.001 ? (a.id < b.id ? 1 : -1) : dx / length;
      const ny = length < 0.001 ? 0 : dy / length;
      const push = (minDistance - Math.max(length, 0.001)) * 0.5;
      a.pos.x -= nx * push;
      a.pos.y -= ny * push;
      b.pos.x += nx * push;
      b.pos.y += ny * push;
    }
  }
  for (const unit of alive) {
    unit.pos.x = Math.max(0.22, Math.min(ARENA_COLS - 0.22, unit.pos.x));
    unit.pos.y = Math.max(0.18, Math.min(ARENA_ROWS + 0.38, unit.pos.y));
  }
};

const finishBattle = (state: ArenaBattleState, outcome: 'victory' | 'defeat'): void => {
  if (state.phase !== 'battle') return;
  state.phase = outcome;
  state.events.push({ type: 'battle-ended', outcome });
  for (const unit of state.units) {
    if (unit.alive) unit.activity = 'idle';
  }
};

export const startArenaBattle = (state: ArenaBattleState): void => {
  if (state.phase !== 'planning') return;
  state.phase = 'battle';
  state.time = 0;
  state.events.length = 0;
};

export const tickArenaBattle = (state: ArenaBattleState, dt: number): void => {
  if (state.phase !== 'battle') return;
  state.time += dt;

  for (const unit of state.units) {
    if (!unit.alive) continue;
    unit.attackCooldown = Math.max(0, unit.attackCooldown - dt);
    unit.healCooldown = Math.max(0, unit.healCooldown - dt);
    unit.retargetCooldown = Math.max(0, unit.retargetCooldown - dt);

    if (tryHeal(state, unit)) continue;

    let target = unitById(state, unit.targetId);
    if (!target?.alive || target.team === unit.team || unit.retargetCooldown <= 0) {
      target = chooseTarget(state, unit);
      unit.targetId = target?.id ?? null;
      unit.retargetCooldown = 0.28;
    }

    if (target) {
      const reach = unit.combat.range + target.combat.radius;
      if (distance(unit.pos, target.pos) <= reach) {
        if (unit.attackCooldown <= 0) attackUnit(state, unit, target);
        else unit.activity = 'attacking';
      } else {
        unit.activity = 'moving';
        moveToward(unit, target.pos, unit.combat.moveSpeed * dt);
      }
      continue;
    }

    if (unit.team === 'enemy') {
      const coreReach = unit.combat.range + 0.38;
      if (distance(unit.pos, CORE_POS) <= coreReach) {
        if (unit.attackCooldown <= 0) attackCore(state, unit);
        else unit.activity = 'attacking';
      } else {
        unit.activity = 'moving';
        moveToward(unit, CORE_POS, unit.combat.moveSpeed * dt);
      }
    } else {
      unit.activity = 'idle';
    }
  }

  separateUnits(state);

  if (livingUnits(state, 'enemy').length === 0) finishBattle(state, 'victory');
  else if (state.coreHp <= 0) finishBattle(state, 'defeat');
  else if (state.time >= 40) finishBattle(state, 'defeat');
};

export const drainArenaEvents = (state: ArenaBattleState) => state.events.splice(0, state.events.length);
