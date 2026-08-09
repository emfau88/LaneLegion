import Phaser from 'phaser';
import { ArenaBootScene } from './scenes/ArenaBootScene';
import { ArenaScene } from './scenes/ArenaScene';

const compactViewport = (window.matchMedia?.('(pointer: coarse)').matches ?? false)
  || Math.min(window.innerWidth, window.innerHeight) <= 600;
const shortEdge = Math.min(window.innerWidth, window.innerHeight);
const longEdge = Math.max(window.innerWidth, window.innerHeight);
const gameHeight = Math.max(
  compactViewport ? 593 : 640,
  Math.min(720, Math.round(1280 * shortEdge / longEdge))
);
const renderScale = 2;

const registerServiceWorker = (): void => {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'arena-game',
  backgroundColor: '#11191c',
  width: 1280 * renderScale,
  height: gameHeight * renderScale,
  roundPixels: true,
  scale: {
    width: 1280 * renderScale,
    height: gameHeight * renderScale,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    antialiasGL: true,
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

registerServiceWorker();
