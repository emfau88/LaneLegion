import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { FactionSelectScene } from './scenes/FactionSelectScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';

export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 1168;

const installMobileFullscreen = (): void => {
  const isStandalone =
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (isStandalone) return;

  let attempts = 0;
  const requestFullscreen = (): void => {
    attempts++;
    try {
      const root = document.documentElement as HTMLElement & {
        requestFullscreen?: (options?: { navigationUI?: 'hide' }) => Promise<void>;
      };
      void root
        .requestFullscreen?.({ navigationUI: 'hide' })
        .then(() => {
          window.removeEventListener('pointerup', requestFullscreen);
          window.removeEventListener('touchend', requestFullscreen);
          window.removeEventListener('click', requestFullscreen);
        })
        .catch(() => {
          if (attempts >= 5) {
            window.removeEventListener('pointerup', requestFullscreen);
            window.removeEventListener('touchend', requestFullscreen);
            window.removeEventListener('click', requestFullscreen);
          }
        });
    } catch {
      /* Mobile browsers that do not support element fullscreen still use the PWA manifest path. */
    }
  };

  window.addEventListener('pointerup', requestFullscreen, { once: true, passive: true });
  window.addEventListener('touchend', requestFullscreen, { once: true, passive: true });
  window.addEventListener('click', requestFullscreen, { passive: true });
};

const registerServiceWorker = (): void => {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
};

installMobileFullscreen();
registerServiceWorker();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0c0f1a',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  // Avoid sub-pixel positions blurring the pixel-art assets.
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, MainMenuScene, FactionSelectScene, GameScene, ResultScene]
});
