import { CFG } from '../data/gameConfig';
import type { Vec2 } from '../model/Types';

/** Portrait-first screen layout (design resolution 540x1168). */
export const L = {
  width: 540,
  height: 1168,

  topBar: { x: 0, y: 0, w: 540, h: 92 },
  statusRow: { x: 0, y: 92, w: 540, h: 30 },

  board: { left: 0, top: 92, w: 540, h: 966 },

  lane: {
    left: 54,
    top: 112,
    cellW: 72,
    cellH: 76,
    get w() {
      return this.cellW * CFG.grid.cols;
    },
    get h() {
      return this.cellH * CFG.grid.rows;
    }
  },

  arena: { left: 105, top: 824, w: 330, h: 126 },

  sheet: {
    buildTop: 1006,
    buildH: 162,
    buildExpandedTop: 884,
    buildExpandedH: 284,
    battleTop: 1036,
    battleH: 132,
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
