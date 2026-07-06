import Phaser from 'phaser';
import type { MercenaryDefinition } from '../model/MercenaryDefinition';
import type { GameState } from '../model/GameState';
import { COLORS, txt } from './theme';

export const MERC_W = 102;
export const MERC_H = 118;

/** Tappable mercenary send card. */
export class MercenaryCard {
  readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly merc: MercenaryDefinition;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    merc: MercenaryDefinition,
    onSend: (mercId: string) => void
  ) {
    this.merc = merc;
    this.bg = scene.add
      .rectangle(0, 0, MERC_W, MERC_H, COLORS.panelLight)
      .setOrigin(0)
      .setStrokeStyle(2, 0x7a5fa8)
      .setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => onSend(merc.id));

    this.container = scene.add.container(x, y, [
      this.bg,
      txt(scene, MERC_W / 2, 8, merc.name, 12).setOrigin(0.5, 0).setFontStyle('bold'),
      txt(scene, MERC_W / 2, 28, `${merc.cost} ◆`, 12, COLORS.mythium).setOrigin(0.5, 0),
      txt(scene, MERC_W / 2, 48, `+${merc.incomeGain} income`, 11, COLORS.income).setOrigin(0.5, 0),
      txt(scene, MERC_W / 2, 68, merc.roleDesc, 11, COLORS.textDim).setOrigin(0.5, 0),
      txt(scene, MERC_W / 2, 92, 'SEND', 12, '#f0d080').setOrigin(0.5, 0)
    ]);
  }

  update(state: GameState): void {
    const human = state.players[state.humanPlayerId];
    const ok = human.mythium >= this.merc.cost && state.phase !== 'ended';
    this.container.setAlpha(ok ? 1 : 0.45);
  }
}
