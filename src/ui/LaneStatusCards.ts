import Phaser from 'phaser';
import type { GameState } from '../model/GameState';
import type { LaneDisplayStatus } from '../model/Types';
import { otherPlayersLaneStatus } from '../core/util';
import { L } from './layout';
import { COLORS, txt } from './theme';

const STATUS_COLOR: Record<LaneDisplayStatus, number> = {
  clear: 0x2f6b3a,
  fighting: 0x8a6d2f,
  leaking: 0x9c4a2f,
  dead: 0x7a2f35
};

/** Small tappable status chips for the lanes the player does not control. */
export class LaneStatusCards {
  private chips: { pid: string; bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];

  constructor(scene: Phaser.Scene, state: GameState, onPeek: (playerId: string) => void) {
    const others = state.playerOrder.filter((pid) => pid !== state.humanPlayerId);
    const w = Math.min(166, (L.width - 16) / others.length - 8);
    let x = 8;
    for (const pid of others) {
      const p = state.players[pid];
      const bg = scene.add
        .rectangle(x, L.statusRow.y + 4, w, 24, STATUS_COLOR.clear)
        .setOrigin(0)
        .setStrokeStyle(1, COLORS.panelStroke)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => onPeek(pid));
      const label = txt(scene, x + w / 2, L.statusRow.y + 16, p.name, 11).setOrigin(0.5);
      this.chips.push({ pid, bg, label });
      x += w + 8;
    }
    txt(scene, L.width - 8, L.statusRow.y + 16, 'tap to view', 10, COLORS.textDim).setOrigin(1, 0.5);
  }

  update(state: GameState): void {
    for (const chip of this.chips) {
      const p = state.players[chip.pid];
      const status = otherPlayersLaneStatus(state, chip.pid);
      chip.bg.setFillStyle(STATUS_COLOR[status]);
      chip.label.setText(`${p.name}: ${status.charAt(0).toUpperCase() + status.slice(1)}`);
    }
  }
}
