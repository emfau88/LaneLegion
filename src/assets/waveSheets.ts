import bulwarkBruteSheetUrl from './wave-sheets/bulwark-brute-sheet.png';
import gloomOgreSheetUrl from './wave-sheets/gloom-ogre-sheet.png';
import gloomspawnSheetUrl from './wave-sheets/gloomspawn-sheet.png';
import grublingSheetUrl from './wave-sheets/grubling-sheet.png';
import stoneBeetleSheetUrl from './wave-sheets/stone-beetle-sheet.png';
import swiftStalkerSheetUrl from './wave-sheets/swift-stalker-sheet.png';
import type { UnitSpriteAsset } from './unitSprites';

export type WaveSheetAnim = 'walk' | 'attack' | 'death';

export interface WaveSheetAsset extends UnitSpriteAsset {
  frameWidth: number;
  frameHeight: number;
  anims: Record<WaveSheetAnim, { start: number; end: number; frameRate: number; repeat: number }>;
}

export const WAVE_SHEETS: Record<string, WaveSheetAsset> = {
  grubling: {
    key: 'wave-sheet-grubling',
    url: grublingSheetUrl,
    frameWidth: 256,
    frameHeight: 256,
    anims: {
      walk: { start: 0, end: 3, frameRate: 7, repeat: -1 },
      attack: { start: 4, end: 7, frameRate: 14, repeat: 0 },
      death: { start: 8, end: 11, frameRate: 9, repeat: 0 }
    }
  },
  stone_beetle: {
    key: 'wave-sheet-stone-beetle',
    url: stoneBeetleSheetUrl,
    frameWidth: 256,
    frameHeight: 256,
    anims: {
      walk: { start: 0, end: 3, frameRate: 6, repeat: -1 },
      attack: { start: 4, end: 7, frameRate: 12, repeat: 0 },
      death: { start: 8, end: 11, frameRate: 8, repeat: 0 }
    }
  },
  swift_stalker: {
    key: 'wave-sheet-swift-stalker',
    url: swiftStalkerSheetUrl,
    frameWidth: 256,
    frameHeight: 256,
    anims: {
      walk: { start: 0, end: 3, frameRate: 9, repeat: -1 },
      attack: { start: 4, end: 7, frameRate: 15, repeat: 0 },
      death: { start: 8, end: 11, frameRate: 9, repeat: 0 }
    }
  },
  bulwark_brute: {
    key: 'wave-sheet-bulwark-brute',
    url: bulwarkBruteSheetUrl,
    frameWidth: 256,
    frameHeight: 256,
    anims: {
      walk: { start: 0, end: 3, frameRate: 5, repeat: -1 },
      attack: { start: 4, end: 7, frameRate: 11, repeat: 0 },
      death: { start: 8, end: 11, frameRate: 7, repeat: 0 }
    }
  },
  gloomspawn: {
    key: 'wave-sheet-gloomspawn',
    url: gloomspawnSheetUrl,
    frameWidth: 256,
    frameHeight: 256,
    anims: {
      walk: { start: 0, end: 3, frameRate: 8, repeat: -1 },
      attack: { start: 4, end: 7, frameRate: 14, repeat: 0 },
      death: { start: 8, end: 11, frameRate: 8, repeat: 0 }
    }
  },
  gloom_ogre: {
    key: 'wave-sheet-gloom-ogre',
    url: gloomOgreSheetUrl,
    frameWidth: 256,
    frameHeight: 256,
    anims: {
      walk: { start: 0, end: 3, frameRate: 5, repeat: -1 },
      attack: { start: 4, end: 7, frameRate: 10, repeat: 0 },
      death: { start: 8, end: 11, frameRate: 7, repeat: 0 }
    }
  }
};

export const waveSheet = (defId: string): WaveSheetAsset | null => WAVE_SHEETS[defId] ?? null;

export const waveSheetAnimKey = (sheet: WaveSheetAsset, anim: WaveSheetAnim): string => `${sheet.key}-${anim}`;
