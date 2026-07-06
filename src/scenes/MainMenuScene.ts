import Phaser from 'phaser';
import type { Difficulty, GameMode } from '../model/Types';
import { COLORS, txt, UIButton } from '../ui/theme';
import { L } from '../ui/layout';

export class MainMenuScene extends Phaser.Scene {
  private mode: GameMode = '1v1';
  private difficulty: Difficulty = 'normal';
  private modeBtns: Partial<Record<GameMode, UIButton>> = {};
  private diffBtns: Partial<Record<Difficulty, UIButton>> = {};

  constructor() {
    super('MainMenu');
  }

  create(): void {
    txt(this, L.width / 2, 150, 'LANE LEGION', 44, '#f0d080').setOrigin(0.5).setFontStyle('bold');
    txt(this, L.width / 2, 205, 'Offline Lane Defense Autobattler', 14, COLORS.textDim).setOrigin(0.5);

    txt(this, L.width / 2, 300, 'Game Mode', 16).setOrigin(0.5);
    (['1v1', '2v2'] as GameMode[]).forEach((mode, i) => {
      const btn = new UIButton(
        this,
        L.width / 2 - 95 + i * 190,
        355,
        170,
        56,
        mode === '1v1' ? '1 vs 1' : '2 vs 2',
        20,
        () => this.setMode(mode)
      );
      this.modeBtns[mode] = btn;
    });
    txt(this, L.width / 2, 415, 'In 2v2 an AI ally fights beside you. Teams share a king.', 11, COLORS.textDim).setOrigin(0.5);

    txt(this, L.width / 2, 490, 'AI Difficulty', 16).setOrigin(0.5);
    (['easy', 'normal', 'hard'] as Difficulty[]).forEach((d, i) => {
      const btn = new UIButton(
        this,
        L.width / 2 - 130 + i * 130,
        545,
        118,
        46,
        d.charAt(0).toUpperCase() + d.slice(1),
        15,
        () => this.setDifficulty(d)
      );
      this.diffBtns[d] = btn;
    });

    new UIButton(this, L.width / 2, 700, 260, 66, 'CHOOSE FACTION ▶', 18, () => {
      this.scene.start('FactionSelect', { mode: this.mode, difficulty: this.difficulty });
    }, 0x2f6b3a);

    txt(this, L.width / 2, 900, 'Fully offline • no accounts • no network', 11, COLORS.textDim).setOrigin(0.5);

    this.setMode(this.mode);
    this.setDifficulty(this.difficulty);
  }

  private setMode(mode: GameMode): void {
    this.mode = mode;
    for (const [id, btn] of Object.entries(this.modeBtns)) {
      btn!.setBaseColor(id === mode ? 0x3c5a8a : COLORS.panelLight);
    }
  }

  private setDifficulty(d: Difficulty): void {
    this.difficulty = d;
    for (const [id, btn] of Object.entries(this.diffBtns)) {
      btn!.setBaseColor(id === d ? 0x3c5a8a : COLORS.panelLight);
    }
  }
}
