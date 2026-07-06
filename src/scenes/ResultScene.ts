import Phaser from 'phaser';
import type { GameSetup } from '../model/GameState';
import { COLORS, txt, UIButton } from '../ui/theme';
import { L } from '../ui/layout';

export interface ResultData {
  win: boolean;
  reason: string;
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
    txt(this, L.width / 2, 280, win ? 'VICTORY' : 'DEFEAT', 52, win ? '#7ee081' : '#ef5f6a')
      .setOrigin(0.5)
      .setFontStyle('bold');
    txt(this, L.width / 2, 350, this.result.reason, 16, COLORS.textDim).setOrigin(0.5);
    txt(this, L.width / 2, 390, `Waves played: ${this.result.wavesPlayed}`, 14, COLORS.textDim).setOrigin(0.5);

    new UIButton(this, L.width / 2, 520, 260, 60, 'PLAY AGAIN', 18, () => {
      this.scene.start('Game', { ...this.result.setup, seed: (Date.now() % 2147483647) | 0 });
    }, 0x2f6b3a);
    new UIButton(this, L.width / 2, 610, 260, 52, 'MAIN MENU', 16, () => {
      this.scene.start('MainMenu');
    });
  }
}
