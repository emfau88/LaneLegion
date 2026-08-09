import Phaser from 'phaser';

const compactViewport = (window.matchMedia?.('(pointer: coarse)').matches ?? false)
  || Math.min(window.innerWidth, window.innerHeight) <= 600;
const uiResolution = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);

const readableSize = (size: number): number => {
  if (!compactViewport) return size;
  if (size <= 10) return Math.round(size * 1.18);
  if (size <= 15) return Math.round(size * 1.08);
  return size;
};

export const ARENA_COLORS = {
  bg: 0x11191c,
  panel: 0x182328,
  panelLight: 0x223138,
  panelDeep: 0x0d1417,
  line: 0x7f796c,
  brass: 0xb18d55,
  brassLight: 0xe1bd73,
  text: '#f5f0e7',
  muted: '#aab2af',
  gold: '#eac879',
  goldFill: 0xe3b64f,
  player: 0x55c5c9,
  enemy: 0xe17362,
  danger: '#f07c6e',
  ok: '#79c99d'
} as const;

const fontFamily = '"Segoe UI Variable", "Segoe UI", Arial, sans-serif';

export const arenaText = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 16,
  color: string = ARENA_COLORS.text
): Phaser.GameObjects.Text =>
  scene.add.text(x, y, value, {
    fontFamily,
    fontSize: `${readableSize(size)}px`,
    color,
    lineSpacing: 2
  }).setResolution(uiResolution);

export const arenaTitle = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 20,
  color: string = ARENA_COLORS.text
): Phaser.GameObjects.Text =>
  scene.add.text(x, y, value, {
    fontFamily,
    fontSize: `${readableSize(size)}px`,
    color,
    fontStyle: 'bold'
  }).setResolution(uiResolution);

export const arenaPanel = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: number = ARENA_COLORS.brass,
  alpha: number = 0.9
): Phaser.GameObjects.Graphics => {
  const panel = scene.add.graphics();
  panel.fillStyle(ARENA_COLORS.panelDeep, 0.42).fillRoundedRect(x + 3, y + 5, width, height, 13);
  panel.fillStyle(ARENA_COLORS.panel, alpha).fillRoundedRect(x, y, width, height, 13);
  panel.lineStyle(1, accent, 0.46).strokeRoundedRect(x, y, width, height, 13);
  panel.fillStyle(0xffffff, 0.045).fillRoundedRect(x + 12, y + 6, width - 24, 2, 1);
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
  const hitHeight = touchSizedViewport ? Math.max(height, 46) : height;
  const primary = accent === 0xe0a83c
    || accent === 0xe0b65d
    || accent === 0xf1cc76
    || accent === ARENA_COLORS.goldFill;
  const danger = accent === ARENA_COLORS.enemy;
  const frame = scene.add.graphics();
  const hit = scene.add.rectangle(0, 0, hitWidth, hitHeight, 0xffffff, 0.001).setOrigin(0.5);
  const labelText = arenaText(scene, 0, 0, label, touchSizedViewport ? 12 : 11, primary ? '#211d16' : ARENA_COLORS.text)
    .setOrigin(0.5)
    .setFontStyle('bold')
    .setLetterSpacing(0.35);
  const root = scene.add.container(x, y, [frame, hit, labelText]);

  const paint = (): void => {
    const fill = !enabled
      ? 0x222a2d
      : primary
        ? (hovered ? 0xefc762 : ARENA_COLORS.goldFill)
        : (hovered ? 0x2a383d : ARENA_COLORS.panelLight);
    const border = danger ? ARENA_COLORS.enemy : primary ? ARENA_COLORS.brassLight : ARENA_COLORS.line;
    frame.clear();
    frame.fillStyle(ARENA_COLORS.panelDeep, 0.4).fillRoundedRect(-width / 2 + 2, -height / 2 + 3, width, height, 10);
    frame.fillStyle(fill, enabled ? 0.98 : 0.76).fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    frame.lineStyle(1, border, enabled ? 0.62 : 0.24).strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    if (primary) frame.fillStyle(0xffffff, 0.16).fillRoundedRect(-width / 2 + 10, -height / 2 + 5, width - 20, 2, 1);
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
    if (enabled) root.setScale(0.985);
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
      labelText.setAlpha(value ? 1 : 0.38);
      hit.input!.cursor = value ? 'pointer' : 'default';
      paint();
    },
    setLabel(value: string): void {
      labelText.setText(value);
    }
  };
};
