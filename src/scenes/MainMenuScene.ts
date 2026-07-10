import Phaser from 'phaser';
import type { Difficulty, GameMode } from '../model/Types';
import { getLang, setLang, t, type StringKey } from '../i18n/i18n';
import { sfx } from '../audio/sfx';
import { COLORS, txt, UIButton } from '../ui/theme';
import { L } from '../ui/layout';

interface FramedMenuButton {
  setSelected(selected: boolean): void;
}

export class MainMenuScene extends Phaser.Scene {
  private mode: GameMode = '1v1';
  private difficulty: Difficulty = 'normal';
  private modeBtns: Partial<Record<GameMode, FramedMenuButton>> = {};
  private diffBtns: Partial<Record<Difficulty, FramedMenuButton>> = {};

  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.add.image(0, 0, 'main-menu-bg-v2').setOrigin(0).setDisplaySize(L.width, L.height);
    this.add.rectangle(0, 0, L.width, L.height, 0x050814, 0.38).setOrigin(0);
    this.add.rectangle(0, 0, L.width, 260, 0x050814, 0.3).setOrigin(0);
    this.add.rectangle(0, 840, L.width, 328, 0x050814, 0.38).setOrigin(0);

    this.add.image(L.width / 2, 174, 'title-plate').setDisplaySize(520, 176);
    txt(this, L.width / 2, 170, 'LANE LEGION', 38, '#f0d080')
      .setOrigin(0.5)
      .setFontStyle('bold')
      .setShadow(0, 3, '#000000', 5);

    new UIButton(this, L.width - 78, 30, 128, 32, t('menu.language'), 12, () => {
      setLang(getLang() === 'de' ? 'en' : 'de');
      this.scene.restart();
    });
    const soundState = () => t(sfx.isMuted() ? 'common.off' : 'common.on');
    const soundBtn = new UIButton(this, 78, 30, 128, 32, t('menu.sound', { state: soundState() }), 12, () => {
      sfx.toggleMuted();
      soundBtn.setText(t('menu.sound', { state: soundState() }));
    });
    txt(this, L.width / 2, 330, t('menu.gameMode'), 16).setOrigin(0.5).setShadow(0, 2, '#000000', 4);
    (['1v1', '2v2'] as GameMode[]).forEach((mode, i) => {
      const btn = this.createFramedMenuButton(
        L.width / 2 - 95 + i * 190,
        385,
        196,
        64,
        mode === '1v1' ? '1 vs 1' : '2 vs 2',
        20,
        () => this.setMode(mode)
      );
      this.modeBtns[mode] = btn;
    });
    txt(this, L.width / 2, 445, t('menu.hint2v2'), 11, '#b7c1d8').setOrigin(0.5).setShadow(0, 2, '#000000', 4);

    txt(this, L.width / 2, 545, t('menu.difficulty'), 16).setOrigin(0.5).setShadow(0, 2, '#000000', 4);
    (['easy', 'normal', 'hard'] as Difficulty[]).forEach((d, i) => {
      const btn = this.createFramedMenuButton(
        L.width / 2 - 130 + i * 130,
        600,
        138,
        54,
        t(`diff.${d}` as StringKey),
        15,
        () => this.setDifficulty(d)
      );
      this.diffBtns[d] = btn;
    });

    const factionBtn = this.createFramedMenuButton(L.width / 2, 790, 292, 78, t('menu.chooseFaction'), 18, () => {
      this.scene.start('FactionSelect', { mode: this.mode, difficulty: this.difficulty });
    }, '#ddffdf');
    factionBtn.setSelected(true);

    txt(this, L.width / 2, 1100, t('menu.offline'), 11, '#b7c1d8').setOrigin(0.5).setShadow(0, 2, '#000000', 4);

    this.setMode(this.mode);
    this.setDifficulty(this.difficulty);
  }

  private setMode(mode: GameMode): void {
    this.mode = mode;
    for (const [id, btn] of Object.entries(this.modeBtns)) {
      btn!.setSelected(id === mode);
    }
  }

  private setDifficulty(d: Difficulty): void {
    this.difficulty = d;
    for (const [id, btn] of Object.entries(this.diffBtns)) {
      btn!.setSelected(id === d);
    }
  }

  /** A menu-only control: the artwork is always fully visible, never covered by a fill rectangle. */
  private createFramedMenuButton(
    x: number,
    y: number,
    w: number,
    h: number,
    labelText: string,
    fontSize: number,
    onClick: () => void,
    selectedColor = '#ffe6a0'
  ): FramedMenuButton {
    const frame = this.add.image(0, 0, 'button-frame').setDisplaySize(w, h);
    const hit = this.add
      .rectangle(0, 0, w - 18, h - 12, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    const marker = this.add.star(-w / 2 + 17, 0, 4, 2.2, 4.6, 0xf3cf76, 1).setVisible(false);
    const label = txt(this, 0, 0, labelText, fontSize, COLORS.textMain).setOrigin(0.5).setShadow(0, 2, '#000000', 3);
    this.add.container(x, y, [frame, hit, marker, label]);

    hit.on('pointerdown', () => {
      frame.setTint(0xbfd0ff);
      this.time.delayedCall(90, () => frame.clearTint());
      sfx.play('tap');
      onClick();
    });

    return {
      setSelected: (selected: boolean) => {
        marker.setVisible(selected);
        label.setColor(selected ? selectedColor : COLORS.textMain);
      }
    };
  }
}
