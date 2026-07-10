import ashGuardUrl from './fighter-sheets/ember/ash-guard.png';
import emberMageUrl from './fighter-sheets/ember/ember-mage.png';
import fireImpUrl from './fighter-sheets/ember/fire-imp.png';
import phoenixVesselUrl from './fighter-sheets/ember/phoenix-vessel.png';
import sparkAdeptUrl from './fighter-sheets/ember/spark-adept.png';
import sunArcherUrl from './fighter-sheets/ember/sun-archer.png';
import ballistaScoutUrl from './fighter-sheets/ironclad/ballista-scout.png';
import bannerBearerUrl from './fighter-sheets/ironclad/banner-bearer.png';
import fortressGolemUrl from './fighter-sheets/ironclad/fortress-golem.png';
import hammerRecruitUrl from './fighter-sheets/ironclad/hammer-recruit.png';
import shieldGuardUrl from './fighter-sheets/ironclad/shield-guard.png';
import steelHoundUrl from './fighter-sheets/ironclad/steel-hound.png';
import duskbladeUrl from './fighter-sheets/shadow/duskblade.png';
import hexAcolyteUrl from './fighter-sheets/shadow/hex-acolyte.png';
import hollowGuardUrl from './fighter-sheets/shadow/hollow-guard.png';
import leechPriestUrl from './fighter-sheets/shadow/leech-priest.png';
import shadeArcherUrl from './fighter-sheets/shadow/shade-archer.png';
import voidHorrorUrl from './fighter-sheets/shadow/void-horror.png';
import barkbackBeastUrl from './fighter-sheets/wildroot/barkback-beast.png';
import briarWarriorUrl from './fighter-sheets/wildroot/briar-warrior.png';
import groveTitanUrl from './fighter-sheets/wildroot/grove-titan.png';
import mossShamanUrl from './fighter-sheets/wildroot/moss-shaman.png';
import rootlingUrl from './fighter-sheets/wildroot/rootling.png';
import vineSpitterUrl from './fighter-sheets/wildroot/vine-spitter.png';
import type { UnitSpriteAsset } from './unitSprites';

export type FighterSheetFrame = 'idle' | 'attack' | 'hit' | 'death';
export type FighterSheetAnim = 'walk' | 'attack' | 'death';

export interface FighterSheetAsset extends UnitSpriteAsset {
  frameWidth: number;
  frameHeight: number;
  frames?: Partial<Record<FighterSheetFrame, number>>;
  anims?: Partial<Record<FighterSheetAnim, { start: number; end: number; frameRate: number; repeat: number }>>;
}

export const FIGHTER_SHEETS: Record<string, FighterSheetAsset> = {
  shield_guard: {
    key: 'fighter-sheet-shield-guard',
    url: shieldGuardUrl,
    frameWidth: 256,
    frameHeight: 256,
    frames: { idle: 0, attack: 4, hit: 6, death: 8 },
    anims: {
      walk: { start: 0, end: 3, frameRate: 6, repeat: -1 },
      attack: { start: 4, end: 7, frameRate: 12, repeat: 0 },
      death: { start: 8, end: 11, frameRate: 8, repeat: 0 }
    }
  },
  hammer_recruit: { key: 'fighter-sheet-hammer-recruit', url: hammerRecruitUrl, frameWidth: 256, frameHeight: 256 },
  ballista_scout: { key: 'fighter-sheet-ballista-scout', url: ballistaScoutUrl, frameWidth: 256, frameHeight: 256 },
  banner_bearer: { key: 'fighter-sheet-banner-bearer', url: bannerBearerUrl, frameWidth: 256, frameHeight: 256 },
  steel_hound: { key: 'fighter-sheet-steel-hound', url: steelHoundUrl, frameWidth: 256, frameHeight: 256 },
  fortress_golem: { key: 'fighter-sheet-fortress-golem', url: fortressGolemUrl, frameWidth: 256, frameHeight: 256 },
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
  void_horror: { key: 'fighter-sheet-void-horror', url: voidHorrorUrl, frameWidth: 256, frameHeight: 256 },
  rootling: { key: 'fighter-sheet-rootling', url: rootlingUrl, frameWidth: 256, frameHeight: 256 },
  briar_warrior: { key: 'fighter-sheet-briar-warrior', url: briarWarriorUrl, frameWidth: 256, frameHeight: 256 },
  moss_shaman: { key: 'fighter-sheet-moss-shaman', url: mossShamanUrl, frameWidth: 256, frameHeight: 256 },
  barkback_beast: { key: 'fighter-sheet-barkback-beast', url: barkbackBeastUrl, frameWidth: 256, frameHeight: 256 },
  vine_spitter: { key: 'fighter-sheet-vine-spitter', url: vineSpitterUrl, frameWidth: 256, frameHeight: 256 },
  grove_titan: { key: 'fighter-sheet-grove-titan', url: groveTitanUrl, frameWidth: 256, frameHeight: 256 }
};

export const FIGHTER_SHEET_FRAME: Record<FighterSheetFrame, number> = {
  idle: 0,
  attack: 1,
  hit: 2,
  death: 3
};

export const fighterSheet = (defId: string): FighterSheetAsset | null => FIGHTER_SHEETS[defId] ?? null;

export const fighterSheetFrame = (sheet: FighterSheetAsset, frame: FighterSheetFrame): number =>
  sheet.frames?.[frame] ?? FIGHTER_SHEET_FRAME[frame];

export const fighterSheetAnimKey = (sheet: FighterSheetAsset, anim: FighterSheetAnim): string => `${sheet.key}-${anim}`;
