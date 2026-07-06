import Phaser from 'phaser';
import type { GameSetup } from '../model/GameState';
import type { WinReason } from '../model/Types';
import { t, type StringKey } from '../i18n/i18n';
import { COLORS, txt, UIButton } from '../ui/theme';
import { L } from '../ui/layout';

export interface ResultData {
  win: boolean;
  reason: WinReason;
  wavesPlayed: number;
  setup: GameSetup;
}

export class ResultScene extends Phaser.Scene {
  private result!: ResultData;

  constructor() {
    super('Result');
  }

  init(data: ResultData): void {
    this.result = data;
  }

  create(): void {
    const win = this.result.win;
    txt(this, L.width / 2, 280, t(win ? 'result.victory' : 'result.defeat'), 52, win ? '#7ee081' : '#ef5f6a')
      .setOrigin(0.5)
      .setFontStyle('bold');
    const reason = this.result.reason ? t(`reason.${this.result.reason}` as StringKey) : '';
    txt(this, L.width / 2, 350, reason, 16, COLORS.textDim).setOrigin(0.5);
    txt(this, L.width / 2, 390, t('result.wavesPlayed', { n: this.result.wavesPlayed }), 14, COLORS.textDim).setOrigin(0.5);

    new UIButton(this, L.width / 2, 520, 260, 60, t('result.playAgain'), 18, () => {
      this.scene.start('Game', { ...this.result.setup, seed: (Date.now() % 2147483647) | 0 });
    }, 0x2f6b3a);
    new UIButton(this, L.width / 2, 610, 260, 52, t('result.mainMenu'), 16, () => {
      this.scene.start('MainMenu');
    });
  }
}
