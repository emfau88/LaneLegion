import Phaser from 'phaser';

const compactViewport = (window.matchMedia?.('(pointer: coarse)').matches ?? false)
  || Math.min(window.innerWidth, window.innerHeight) <= 600;

const readableSize = (size: number): number => {
  if (!compactViewport) return size;
  if (size <= 12) return Math.round(size * 1.38);
  if (size <= 18) return Math.round(size * 1.2);
  return size;
};

export const ARENA_COLORS = {
  bg: 0x263c43,
  panel: 0xead8b7,
  panelLight: 0xf3e4c9,
  panelDeep: 0xd7bd91,
  line: 0xb18248,
  brass: 0xc68a2d,
  brassLight: 0xf0c45d,
  text: '#203442',
  muted: '#657783',
  gold: '#a86600',
  player: 0x38a9d6,
  enemy: 0xe27664,
  danger: '#b6424e',
  ok: '#257b59'
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
    fontSize: `${readableSize(size)}px`,
    color,
    lineSpacing: 4
  }).setResolution(Math.min(window.devicePixelRatio || 1, 2));

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
    fontSize: `${readableSize(size)}px`,
    color,
    fontStyle: 'bold',
    stroke: '#ead7b2',
    strokeThickness: 1,
    shadow: { offsetX: 0, offsetY: 1, color: '#a77b43', blur: 1, fill: true }
  }).setResolution(Math.min(window.devicePixelRatio || 1, 2));

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
  panel.fillStyle(0x6f4a25, 0.18).fillRoundedRect(x + 4, y + 6, width, height, 10);
  panel.fillStyle(ARENA_COLORS.panelLight, alpha).fillRoundedRect(x, y, width, height, 10);
  panel.lineStyle(3, 0xd2ad75, 1).strokeRoundedRect(x, y, width, height, 10);
  panel.lineStyle(1, accent, 0.8).strokeRoundedRect(x + 3, y + 3, width - 6, height - 6, 7);
  panel.fillStyle(0xffefd0, 0.46).fillRect(x + 10, y + 8, width - 20, 2);
  panel.fillStyle(accent, 0.62);
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
    .setShadow(0, 1, '#ffffff', 1);
  const root = scene.add.container(x, y, [frame, hit, text]);
  const paint = (): void => {
    const activeAccent = enabled ? accent : 0x514b42;
    const fill = !enabled ? 0xcfc1a8 : hovered ? 0xf8d991 : 0xead2a6;
    frame.clear();
    frame.fillStyle(0x6f4a25, 0.2).fillRoundedRect(-width / 2 + 3, -height / 2 + 5, width, height, 7);
    frame.fillStyle(0xd9bc8a, 1).fillRoundedRect(-width / 2, -height / 2, width, height, 7);
    frame.lineStyle(3, 0xd2ad75, 1).strokeRoundedRect(-width / 2, -height / 2, width, height, 7);
    frame.fillStyle(fill, 1).fillRoundedRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, 4);
    frame.lineStyle(1, activeAccent, enabled ? 0.95 : 0.35).strokeRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 4);
    frame.fillStyle(activeAccent, enabled ? 0.82 : 0.28);
    frame.fillTriangle(-width / 2 + 2, 0, -width / 2 + 11, -7, -width / 2 + 11, 7);
    frame.fillTriangle(width / 2 - 2, 0, width / 2 - 11, -7, width / 2 - 11, 7);
    frame.fillStyle(0xffecc8, enabled ? 0.46 : 0.16).fillRect(-width / 2 + 8, -height / 2 + 7, width - 16, 2);
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
