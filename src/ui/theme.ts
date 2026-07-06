import Phaser from 'phaser';
import { t, type StringKey } from '../i18n/i18n';
import type { Role } from '../model/Types';

export const COLORS = {
  bg: 0x0c0f1a,
  panel: 0x1a2030,
  panelLight: 0x28324a,
  panelStroke: 0x3c4a6b,
  textMain: '#e8ecf5',
  textDim: '#9aa5bd',
  gold: '#f5c542',
  mythium: '#5fd4e0',
  income: '#7ee081',
  worker: '#c9a0f0',
  danger: '#ef5f6a',
  ok: '#7ee081',
  hostile: 0xd9534f,
  hostileDark: 0x8f2f2c,
  king: 0xf5c542,
  buildZone: 0x1d2b22,
  spawnZone: 0x33202a,
  approachZone: 0x232636,
  leakZone: 0x3a2430,
  gridLine: 0x2f3a55,
  highlightOk: 0x4caf50,
  highlightBad: 0xb43a3a
};

export const FONT = 'Verdana, Geneva, sans-serif';

export const ATK_LABEL: Record<string, string> = {
  pierce: 'PRC',
  impact: 'IMP',
  magic: 'MAG',
  pure: 'PURE'
};
export const ARM_LABEL: Record<string, string> = {
  light: 'LGT',
  armored: 'ARM',
  arcane: 'ARC',
  massive: 'MAS'
};
export const roleLabel = (role: Role): string => t(`role.${role}` as StringKey);
export const ROLE_LETTER: Record<string, string> = {
  tank: 'T',
  melee: 'M',
  ranged: 'R',
  aoe: 'A',
  support: 'S'
};

export const txt = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  size: number,
  color: string = COLORS.textMain,
  style: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}
): Phaser.GameObjects.Text =>
  scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    ...style
  });

export class UIButton {
  readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private enabled = true;
  private baseColor: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    size: number,
    onClick: () => void,
    color: number = COLORS.panelLight
  ) {
    this.baseColor = color;
    this.bg = scene.add
      .rectangle(0, 0, w, h, color)
      .setStrokeStyle(1, COLORS.panelStroke)
      .setInteractive({ useHandCursor: true });
    this.label = txt(scene, 0, 0, text, size).setOrigin(0.5);
    this.container = scene.add.container(x, y, [this.bg, this.label]);
    this.bg.on('pointerdown', () => {
      if (!this.enabled) return;
      this.bg.setFillStyle(0x4a5a80);
      scene.time.delayedCall(90, () => this.bg.setFillStyle(this.enabled ? this.baseColor : 0x171c29));
      onClick();
    });
  }

  setText(s: string): void {
    this.label.setText(s);
  }
  setTextColor(c: string): void {
    this.label.setColor(c);
  }
  setEnabled(on: boolean): void {
    if (this.enabled === on) return;
    this.enabled = on;
    this.bg.setFillStyle(on ? this.baseColor : 0x171c29);
    this.label.setAlpha(on ? 1 : 0.45);
  }
  setBaseColor(c: number): void {
    this.baseColor = c;
    if (this.enabled) this.bg.setFillStyle(c);
  }
  get isEnabled(): boolean {
    return this.enabled;
  }
}

export const panel = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number = COLORS.panel,
  alpha = 1
): Phaser.GameObjects.Rectangle =>
  scene.add.rectangle(x, y, w, h, color, alpha).setStrokeStyle(1, COLORS.panelStroke).setOrigin(0);
