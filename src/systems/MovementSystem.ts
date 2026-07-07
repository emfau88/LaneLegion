import { CFG } from '../data/gameConfig';
import type { CombatUnit } from '../model/CombatUnit';
import { arenaZoneId, type GameState } from '../model/GameState';
import { dist, livingHostilesInZone } from '../core/util';

const isArena = (zoneId: string) => zoneId.startsWith('arena_');

const moveToward = (u: CombatUnit, x: number, y: number, speed: number, dt: number): void => {
  const dx = x - u.pos.x;
  const dy = y - u.pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 0.001) return;
  const step = Math.min(speed * dt, d);
  u.pos.x += (dx / d) * step;
  u.pos.y += (dy / d) * step;
  u.state = 'moving';
};

/** A creep reaches the leak gate: it leaves the lane and enters the defender's king arena. */
const leakCreep = (state: GameState, u: CombatUnit): void => {
  const defender = state.players[u.defenderPlayerId!];
  defender.leaksThisWave += 1;
  defender.totalLeaks += 1;

  // The opposing lane player profits from the leak.
  const attackerId = state.playerOrder.find(
    (pid) => state.players[pid].sendTargetPlayerId === defender.id
  );
  if (attackerId) state.players[attackerId].gold += CFG.leakGoldBonus;

  u.hp = Math.max(1, u.hp * CFG.leakHpFactor);
  u.leaked = true;
  u.zoneId = arenaZoneId(defender.teamId);
  u.pos = { x: Math.min(Math.max(u.pos.x, 0.5), CFG.arena.width - 0.5), y: 0.25 };
  u.targetId = null;
  u.retargetAt = state.time;
  state.events.push({ type: 'leak', unitId: u.id, laneId: defender.laneId, teamId: defender.teamId });
};

const fighterMove = (state: GameState, u: CombatUnit, dt: number): void => {
  const target = u.targetId !== null ? state.units.get(u.targetId) : undefined;
  if (target && target.state !== 'dead' && target.zoneId === u.zoneId) {
    const d = dist(u.pos, target.pos);
    if (d <= u.range) {
      u.state = 'attacking';
      return;
    }
    if (u.role === 'support') {
      u.state = 'idle';
      return;
    }
    const speed =
      u.role === 'ranged' || u.role === 'aoe'
        ? u.moveSpeed * CFG.fighter.rangedAdvanceFactor
        : u.moveSpeed;
    moveToward(u, target.pos.x, target.pos.y, speed, dt);
    return;
  }

  // No target: gather near a defensive contact line instead of trickling in alone.
  const hostiles = livingHostilesInZone(state, u.zoneId, u.teamId);
  if (hostiles.length > 0 && !isArena(u.zoneId) && u.role !== 'support') {
    const frontY = hostiles.reduce((y, h) => Math.max(y, h.pos.y), 0);
    const lead = u.role === 'tank' || u.role === 'melee' ? CFG.fighter.rallyLead.melee : CFG.fighter.rallyLead.ranged;
    const homeX = u.homeCell ? u.homeCell.col + 0.5 : u.pos.x;
    const homeY = u.homeCell ? u.homeCell.row + 0.5 : u.pos.y;
    const holdY = Math.min(homeY, Math.max(CFG.fighter.rallyMinY, frontY + lead));
    const speed =
      u.role === 'ranged' || u.role === 'aoe'
        ? u.moveSpeed * CFG.fighter.rangedAdvanceFactor
        : u.moveSpeed;
    if (Math.abs(u.pos.y - holdY) > 0.06 || Math.abs(u.pos.x - homeX) > 0.08) {
      moveToward(u, homeX, holdY, speed, dt);
      return;
    }
    u.state = 'idle';
    return;
  }

  // In the arena everyone converges because protecting the king is the objective.
  if (hostiles.length > 0 && isArena(u.zoneId) && u.role !== 'support') {
    let nx = u.pos.x;
    let ny = u.pos.y;
    let bd = Infinity;
    for (const h of hostiles) {
      const d = dist(u.pos, h.pos);
      if (d < bd) {
        bd = d;
        nx = h.pos.x;
        ny = h.pos.y;
      }
    }
    moveToward(u, nx, ny, u.moveSpeed, dt);
    return;
  }
  u.state = 'idle';
};

const creepMove = (state: GameState, u: CombatUnit, dt: number): void => {
  const target = u.targetId !== null ? state.units.get(u.targetId) : undefined;
  if (target && target.state !== 'dead' && target.zoneId === u.zoneId) {
    const d = dist(u.pos, target.pos);
    if (d <= u.range) {
      u.state = 'attacking';
      return;
    }
    moveToward(u, target.pos.x, target.pos.y, u.moveSpeed, dt);
    return;
  }

  if (isArena(u.zoneId)) {
    moveToward(u, CFG.arena.kingPos.x, CFG.arena.kingPos.y, u.moveSpeed, dt);
    return;
  }
  // While defenders live, creeps seek them out instead of slipping past;
  // only with no fighters left do they run straight for the leak gate.
  const hostiles = livingHostilesInZone(state, u.zoneId, u.teamId);
  let gx = u.pos.x;
  let gy = CFG.grid.rows + 1;
  let bd = Infinity;
  for (const h of hostiles) {
    const d = dist(u.pos, h.pos);
    if (d < bd) {
      bd = d;
      gx = h.pos.x;
      gy = h.pos.y;
    }
  }
  moveToward(u, gx, gy, u.moveSpeed, dt);
  if (u.pos.y >= CFG.grid.rows - 0.3) leakCreep(state, u);
};

/** Gently push apart overlapping same-team units so they don't stack into one dot. */
const separate = (state: GameState): void => {
  const zones = new Map<string, CombatUnit[]>();
  for (const u of state.units.values()) {
    if (u.state === 'dead' || u.kind === 'king') continue;
    let arr = zones.get(u.zoneId);
    if (!arr) zones.set(u.zoneId, (arr = []));
    arr.push(u);
  }
  for (const arr of zones.values()) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i];
        const b = arr[j];
        if (a.teamId !== b.teamId) continue;
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const minD = a.collisionRadius + b.collisionRadius;
        if (d > 0.0001 && d < minD) {
          const push = (minD - d) / 2;
          const px = (dx / d) * push;
          const py = (dy / d) * push;
          a.pos.x -= px;
          a.pos.y -= py;
          b.pos.x += px;
          b.pos.y += py;
        }
      }
    }
  }
};

const clampToZone = (u: CombatUnit): void => {
  if (isArena(u.zoneId)) {
    u.pos.x = Math.min(Math.max(u.pos.x, 0.2), CFG.arena.width - 0.2);
    u.pos.y = Math.min(Math.max(u.pos.y, 0.2), CFG.arena.height - 0.2);
  } else {
    u.pos.x = Math.min(Math.max(u.pos.x, 0.15), CFG.grid.cols - 0.15);
    u.pos.y = Math.min(Math.max(u.pos.y, 0.1), CFG.grid.rows);
  }
};

export const tickMovement = (state: GameState, dt: number): void => {
  for (const u of state.units.values()) {
    if (u.state === 'dead' || u.kind === 'king') continue;
    if (u.kind === 'fighter') fighterMove(state, u, dt);
    else creepMove(state, u, dt);
  }
  separate(state);
  for (const u of state.units.values()) {
    if (u.state !== 'dead' && u.kind !== 'king') clampToZone(u);
  }
};
