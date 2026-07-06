import Phaser from 'phaser';
import { t, type StringKey } from '../i18n/i18n';
import type { ArmorType, AttackType, Role } from '../model/Types';

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

/** Icon + fixed color per attack/armor type — the visual language of the counter system. */
export interface TypeStyle {
  glyph: string;
  color: string;
}

export const ATK_STYLE: Record<AttackType, TypeStyle> = {
  pierce: { glyph: '➤', color: '#e8c34a' },
  impact: { glyph: '⚒', color: '#e0824f' },
  magic: { glyph: '✦', color: '#b48ae0' },
  pure: { glyph: '✸', color: '#f0f2f8' }
};

export const ARM_STYLE: Record<ArmorType, TypeStyle> = {
  light: { glyph: '○', color: '#6fd4c3' },
  armored: { glyph: '▣', color: '#9db3d6' },
  arcane: { glyph: '✧', color: '#c39ae8' },
  massive: { glyph: '⬢', color: '#e0705f' }
};

/** "➤ Stich" / "➤ Pierce" — glyph plus localized type name. */
export const atkLabel = (a: AttackType): string => `${ATK_STYLE[a].glyph} ${t(`atk.${a}` as StringKey)}`;
export const armLabel = (a: ArmorType): string => `${ARM_STYLE[a].glyph} ${t(`arm.${a}` as StringKey)}`;
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
