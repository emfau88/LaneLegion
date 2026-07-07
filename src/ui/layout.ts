import { CFG } from '../data/gameConfig';
import type { Vec2 } from '../model/Types';

/** Portrait-first screen layout (design resolution 540x960). */
export const L = {
  width: 540,
  height: 960,

  topBar: { x: 0, y: 0, w: 540, h: 92 },
  statusRow: { x: 0, y: 92, w: 540, h: 30 },

  lane: {
    left: 30,
    top: 126,
    cellW: 80,
    cellH: 59,
    get w() {
      return this.cellW * CFG.grid.cols;
    },
    get h() {
      return this.cellH * CFG.grid.rows;
    }
  },

  arena: { left: 30, top: 724, w: 480, h: 84 },

  sheet: {
    buildTop: 816,
    buildH: 144,
    battleTop: 866,
    battleH: 94,
    tabH: 32
  }
};

export const laneToScreen = (p: Vec2): Vec2 => ({
  x: L.lane.left + p.x * L.lane.cellW,
  y: L.lane.top + p.y * L.lane.cellH
});

export const arenaToScreen = (p: Vec2): Vec2 => ({
  x: L.arena.left + (p.x / CFG.arena.width) * L.arena.w,
  y: L.arena.top + (p.y / CFG.arena.height) * L.arena.h
});

export const screenToCell = (x: number, y: number): { col: number; row: number } | null => {
  const col = Math.floor((x - L.lane.left) / L.lane.cellW);
  const row = Math.floor((y - L.lane.top) / L.lane.cellH);
  if (col < 0 || col >= CFG.grid.cols || row < 0 || row >= CFG.grid.rows) return null;
  return { col, row };
};
