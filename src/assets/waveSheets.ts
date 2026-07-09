import grublingSheetUrl from './wave-sheets/grubling-sheet.png';
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
  }
};

export const waveSheet = (defId: string): WaveSheetAsset | null => WAVE_SHEETS[defId] ?? null;

export const waveSheetAnimKey = (sheet: WaveSheetAsset, anim: WaveSheetAnim): string => `${sheet.key}-${anim}`;
