import Phaser from 'phaser';

const compactViewport = (window.matchMedia?.('(pointer: coarse)').matches ?? false)
  || Math.min(window.innerWidth, window.innerHeight) <= 600;

const readableSize = (size: number): number => {
  if (!compactViewport) return size;
  if (size <= 10) return Math.round(size * 1.22);
  if (size <= 16) return Math.round(size * 1.12);
  return size;
};

export const ARENA_COLORS = {
  bg: 0x10272d,
  panel: 0x17343d,
  panelLight: 0x204650,
  panelDeep: 0x0d252c,
  line: 0x5c8589,
  brass: 0xc99b50,
  brassLight: 0xf2c96a,
  text: '#f8f4e7',
  muted: '#aec4c2',
  gold: '#ffd36b',
  goldFill: 0xffd36b,
  player: 0x45c9dc,
  enemy: 0xf07267,
  danger: '#ff7b72',
  ok: '#75d9a6'
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
    lineSpacing: 2
  }).setResolution(Math.min(window.devicePixelRatio || 1, 2));

export const arenaTitle = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 20,
  color: string = ARENA_COLORS.text
): Phaser.GameObjects.Text =>
  scene.add.text(x, y, value, {
    fontFamily: 'Trebuchet MS, Arial, sans-serif',
    fontSize: `${readableSize(size)}px`,
    color,
    fontStyle: 'bold',
    shadow: { offsetX: 0, offsetY: 2, color: '#071418', blur: 3, fill: true }
  }).setResolution(Math.min(window.devicePixelRatio || 1, 2));

export const arenaPanel = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: number = ARENA_COLORS.brass,
  alpha: number = 0.96
): Phaser.GameObjects.Graphics => {
  const panel = scene.add.graphics();
  panel.fillStyle(0x061519, 0.32).fillRoundedRect(x + 4, y + 7, width, height, 14);
  panel.fillStyle(ARENA_COLORS.panel, alpha).fillRoundedRect(x, y, width, height, 14);
  panel.lineStyle(2, accent, 0.72).strokeRoundedRect(x, y, width, height, 14);
  panel.lineStyle(1, ARENA_COLORS.line, 0.34).strokeRoundedRect(x + 4, y + 4, width - 8, height - 8, 10);
  panel.fillStyle(0xffffff, 0.08).fillRoundedRect(x + 12, y + 7, width - 24, 2, 1);
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
  accent: number = ARENA_COLORS.brassLight
): ArenaButton => {
  let enabled = true;
  let hovered = false;
  const touchSizedViewport = (window.matchMedia?.('(pointer: coarse)').matches ?? false)
    || Math.min(window.innerWidth, window.innerHeight) <= 600;
  const hitWidth = touchSizedViewport ? Math.max(width, 72) : width;
  const hitHeight = touchSizedViewport ? Math.max(height, 48) : height;
  const primary = accent === 0xe0a83c || accent === 0xe0b65d || accent === 0xf1cc76;
  const frame = scene.add.graphics();
  const hit = scene.add.rectangle(0, 0, hitWidth, hitHeight, 0xffffff, 0.001).setOrigin(0.5);
  const labelText = arenaText(scene, 0, 0, label, 13, primary ? '#173039' : ARENA_COLORS.text)
    .setOrigin(0.5)
    .setFontStyle('bold')
    .setLetterSpacing(0.5);
  const root = scene.add.container(x, y, [frame, hit, labelText]);

  const paint = (): void => {
    const activeAccent = enabled ? accent : 0x657277;
    const baseFill = primary ? accent : hovered ? 0x2d5a64 : 0x1c3b44;
    const fill = enabled ? baseFill : 0x26363a;
    frame.clear();
    frame.fillStyle(0x061519, 0.34).fillRoundedRect(-width / 2 + 2, -height / 2 + 4, width, height, 10);
    frame.fillStyle(fill, 1).fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    frame.lineStyle(primary ? 2 : 1.5, activeAccent, enabled ? 0.96 : 0.35)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    frame.fillStyle(0xffffff, primary ? 0.2 : 0.08)
      .fillRoundedRect(-width / 2 + 8, -height / 2 + 6, width - 16, 2, 1);
    if (!primary) frame.fillStyle(activeAccent, enabled ? 0.9 : 0.25).fillRoundedRect(-width / 2 + 8, height / 2 - 5, width - 16, 2, 1);
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
      labelText.setAlpha(value ? 1 : 0.42);
      hit.input!.cursor = value ? 'pointer' : 'default';
      paint();
    },
    setLabel(value: string): void {
      labelText.setText(value);
    }
  };
};
