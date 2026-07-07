import Phaser from 'phaser';
import type { MercenaryDefinition } from '../model/MercenaryDefinition';
import type { GameState } from '../model/GameState';
import { t } from '../i18n/i18n';
import { mercName, mercRole } from '../i18n/names';
import { COLORS, txt } from './theme';

export const MERC_W = 102;
export const MERC_H = 78;

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
      txt(scene, MERC_W / 2, 6, mercName(merc), 10).setOrigin(0.5, 0).setFontStyle('bold'),
      txt(scene, MERC_W / 2, 23, `${merc.cost} ◆`, 11, COLORS.mythium).setOrigin(0.5, 0),
      txt(scene, MERC_W / 2, 39, t('merc.income', { n: merc.incomeGain }), 9, COLORS.income).setOrigin(0.5, 0),
      txt(scene, MERC_W / 2, 53, mercRole(merc), 9, COLORS.textDim).setOrigin(0.5, 0),
      txt(scene, MERC_W / 2, 65, t('merc.send'), 9, '#f0d080').setOrigin(0.5, 0)
    ]);
  }

  update(state: GameState): void {
    const human = state.players[state.humanPlayerId];
    const ok = human.mythium >= this.merc.cost && state.phase !== 'ended';
    this.container.setAlpha(ok ? 1 : 0.45);
  }
}
