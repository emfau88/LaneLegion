import ashGuardUrl from './fighter-sheets/ember/ash-guard.png';
import emberMageUrl from './fighter-sheets/ember/ember-mage.png';
import fireImpUrl from './fighter-sheets/ember/fire-imp.png';
import phoenixVesselUrl from './fighter-sheets/ember/phoenix-vessel.png';
import sparkAdeptUrl from './fighter-sheets/ember/spark-adept.png';
import sunArcherUrl from './fighter-sheets/ember/sun-archer.png';
import duskbladeUrl from './fighter-sheets/shadow/duskblade.png';
import hexAcolyteUrl from './fighter-sheets/shadow/hex-acolyte.png';
import hollowGuardUrl from './fighter-sheets/shadow/hollow-guard.png';
import leechPriestUrl from './fighter-sheets/shadow/leech-priest.png';
import shadeArcherUrl from './fighter-sheets/shadow/shade-archer.png';
import voidHorrorUrl from './fighter-sheets/shadow/void-horror.png';
import type { UnitSpriteAsset } from './unitSprites';

export type FighterSheetFrame = 'idle' | 'attack' | 'hit' | 'death';

export interface FighterSheetAsset extends UnitSpriteAsset {
  frameWidth: number;
  frameHeight: number;
}

export const FIGHTER_SHEETS: Record<string, FighterSheetAsset> = {
  spark_adept: { key: 'fighter-sheet-spark-adept', url: sparkAdeptUrl, frameWidth: 256, frameHeight: 256 },
  ember_mage: { key: 'fighter-sheet-ember-mage', url: emberMageUrl, frameWidth: 256, frameHeight: 256 },
  ash_guard: { key: 'fighter-sheet-ash-guard', url: ashGuardUrl, frameWidth: 256, frameHeight: 256 },
  fire_imp: { key: 'fighter-sheet-fire-imp', url: fireImpUrl, frameWidth: 256, frameHeight: 256 },
  sun_archer: { key: 'fighter-sheet-sun-archer', url: sunArcherUrl, frameWidth: 256, frameHeight: 256 },
  phoenix_vessel: { key: 'fighter-sheet-phoenix-vessel', url: phoenixVesselUrl, frameWidth: 256, frameHeight: 256 },
  duskblade: { key: 'fighter-sheet-duskblade', url: duskbladeUrl, frameWidth: 256, frameHeight: 256 },
  hex_acolyte: { key: 'fighter-sheet-hex-acolyte', url: hexAcolyteUrl, frameWidth: 256, frameHeight: 256 },
  hollow_guard: { key: 'fighter-sheet-hollow-guard', url: hollowGuardUrl, frameWidth: 256, frameHeight: 256 },
  shade_archer: { key: 'fighter-sheet-shade-archer', url: shadeArcherUrl, frameWidth: 256, frameHeight: 256 },
  leech_priest: { key: 'fighter-sheet-leech-priest', url: leechPriestUrl, frameWidth: 256, frameHeight: 256 },
  void_horror: { key: 'fighter-sheet-void-horror', url: voidHorrorUrl, frameWidth: 256, frameHeight: 256 }
};

export const FIGHTER_SHEET_FRAME: Record<FighterSheetFrame, number> = {
  idle: 0,
  attack: 1,
  hit: 2,
  death: 3
};

export const fighterSheet = (defId: string): FighterSheetAsset | null => FIGHTER_SHEETS[defId] ?? null;
