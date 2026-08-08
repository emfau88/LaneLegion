import Phaser from 'phaser';
import { ArenaBootScene } from './scenes/ArenaBootScene';
import { ArenaScene } from './scenes/ArenaScene';

const compactViewport = (window.matchMedia?.('(pointer: coarse)').matches ?? false)
  || Math.min(window.innerWidth, window.innerHeight) <= 600;
const shortEdge = Math.min(window.innerWidth, window.innerHeight);
const longEdge = Math.max(window.innerWidth, window.innerHeight);
const gameHeight = compactViewport
  ? Math.max(593, Math.min(720, Math.round(1280 * shortEdge / longEdge)))
  : 720;

const game = new Phaser.Game({
  // Canvas keeps the proof-of-concept stable in embedded browsers with unusual
  // device-pixel ratios; the arena does not need WebGL-only effects.
  type: Phaser.CANVAS,
  parent: 'arena-game',
  backgroundColor: '#263c43',
  width: 1280,
  height: gameHeight,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt: false
  },
  scene: [ArenaBootScene, ArenaScene]
});

const refreshScale = (): void => {
  game.scale.refresh();
};
window.addEventListener('resize', refreshScale);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshScale();
});
requestAnimationFrame(() => {
  refreshScale();
  window.setTimeout(refreshScale, 120);
});
