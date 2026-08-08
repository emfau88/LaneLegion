import Phaser from 'phaser';

export const ARENA_COLORS = {
  bg: 0x080a0d,
  panel: 0x12161a,
  panelLight: 0x20262b,
  panelDeep: 0x090c0f,
  line: 0x685a42,
  brass: 0xa97832,
  brassLight: 0xe0bd6a,
  text: '#f2ead9',
  muted: '#a9a18f',
  gold: '#f0c866',
  player: 0x46a9ee,
  enemy: 0xcf5848,
  danger: '#ff7e7e',
  ok: '#84dfab'
} as const;

export const arenaText = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 16,
  color: string = ARENA_COLORS.text
): Phaser.GameObjects.Text =>
  scene.add.text(x, y, value, {
    fontFamily: 'Trebuchet MS, Arial, sans-serif',
    fontSize: `${size}px`,
    color,
    lineSpacing: 4
  });

export const arenaTitle = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 20,
  color: string = ARENA_COLORS.gold
): Phaser.GameObjects.Text =>
  scene.add.text(x, y, value, {
    fontFamily: 'Georgia, Times New Roman, serif',
    fontSize: `${size}px`,
    color,
    fontStyle: 'bold',
    stroke: '#170e07',
    strokeThickness: Math.max(1, Math.round(size / 12)),
    shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 3, fill: true }
  });

export const arenaPanel = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: number = ARENA_COLORS.brass,
  alpha: number = 0.97
): Phaser.GameObjects.Graphics => {
  const panel = scene.add.graphics();
  panel.fillStyle(0x000000, 0.45).fillRoundedRect(x + 4, y + 6, width, height, 8);
  panel.fillStyle(ARENA_COLORS.panelDeep, alpha).fillRoundedRect(x, y, width, height, 8);
  panel.lineStyle(3, 0x352817, 1).strokeRoundedRect(x, y, width, height, 8);
  panel.lineStyle(1, accent, 0.9).strokeRoundedRect(x + 3, y + 3, width - 6, height - 6, 6);
  panel.fillStyle(0x2b2419, 0.9).fillRect(x + 10, y + 8, width - 20, 2);
  panel.fillStyle(accent, 0.8);
  panel.fillTriangle(x + 4, y + 4, x + 18, y + 4, x + 4, y + 18);
  panel.fillTriangle(x + width - 4, y + 4, x + width - 18, y + 4, x + width - 4, y + 18);
  panel.fillTriangle(x + 4, y + height - 4, x + 18, y + height - 4, x + 4, y + height - 18);
  panel.fillTriangle(x + width - 4, y + height - 4, x + width - 18, y + height - 4, x + width - 4, y + height - 18);
  return panel;
};

export interface ArenaButton {
  root: Phaser.GameObjects.Container;
  setEnabled(enabled: boolean): void;
  setLabel(value: string): void;
}

export const arenaButton = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  accent: number = 0xf1cc76
): ArenaButton => {
  let enabled = true;
  let hovered = false;
  const touchSizedViewport = (window.matchMedia?.('(pointer: coarse)').matches ?? false)
    || Math.min(window.innerWidth, window.innerHeight) <= 600;
  const hitWidth = touchSizedViewport ? Math.max(width, 72) : width;
  const hitHeight = touchSizedViewport ? Math.max(height, Math.min(56, height + 24)) : height;
  const frame = scene.add.graphics();
  const hit = scene.add.rectangle(0, 0, hitWidth, hitHeight, 0xffffff, 0.001).setOrigin(0.5);
  const text = arenaText(scene, 0, 0, label, 14, ARENA_COLORS.text)
    .setOrigin(0.5)
    .setFontFamily('Georgia, Times New Roman, serif')
    .setFontStyle('bold')
    .setShadow(0, 2, '#000000', 2);
  const root = scene.add.container(x, y, [frame, hit, text]);
  const paint = (): void => {
    const activeAccent = enabled ? accent : 0x514b42;
    const fill = !enabled ? 0x141619 : hovered ? 0x3a3021 : 0x211d18;
    frame.clear();
    frame.fillStyle(0x000000, 0.52).fillRoundedRect(-width / 2 + 3, -height / 2 + 5, width, height, 6);
    frame.fillStyle(0x17130f, 1).fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    frame.lineStyle(3, 0x352718, 1).strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
    frame.fillStyle(fill, 1).fillRoundedRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, 4);
    frame.lineStyle(1, activeAccent, enabled ? 0.95 : 0.45).strokeRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 4);
    frame.fillStyle(activeAccent, enabled ? 0.9 : 0.35);
    frame.fillTriangle(-width / 2 + 2, 0, -width / 2 + 11, -7, -width / 2 + 11, 7);
    frame.fillTriangle(width / 2 - 2, 0, width / 2 - 11, -7, width / 2 - 11, 7);
    frame.fillStyle(0xffffff, enabled ? 0.08 : 0.025).fillRect(-width / 2 + 8, -height / 2 + 7, width - 16, 2);
  };
  paint();
  hit.setInteractive({ useHandCursor: true });
  hit.on('pointerover', () => {
    hovered = true;
    paint();
  });
  hit.on('pointerout', () => {
    hovered = false;
    paint();
  });
  hit.on('pointerdown', () => {
    if (!enabled) return;
    root.setScale(0.98);
  });
  hit.on('pointerup', () => {
    root.setScale(1);
    if (enabled) onClick();
  });
  hit.on('pointerupoutside', () => root.setScale(1));
  return {
    root,
    setEnabled(value: boolean): void {
      enabled = value;
      text.setAlpha(value ? 1 : 0.45);
      hit.input!.cursor = value ? 'pointer' : 'default';
      paint();
    },
    setLabel(value: string): void {
      text.setText(value);
    }
  };
};
