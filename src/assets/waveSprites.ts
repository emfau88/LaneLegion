import grublingUrl from './waves/grubling.png';
import stoneBeetleUrl from './waves/stone-beetle.png';
import swiftStalkerUrl from './waves/swift-stalker.png';
import bulwarkBruteUrl from './waves/bulwark-brute.png';
import gloomspawnUrl from './waves/gloomspawn.png';
import gloomOgreUrl from './waves/gloom-ogre.png';
import type { UnitSpriteAsset } from './unitSprites';

export const WAVE_SPRITES: Record<string, UnitSpriteAsset> = {
  grubling: { key: 'wave-grubling', url: grublingUrl },
  stone_beetle: { key: 'wave-stone-beetle', url: stoneBeetleUrl },
  swift_stalker: { key: 'wave-swift-stalker', url: swiftStalkerUrl },
  bulwark_brute: { key: 'wave-bulwark-brute', url: bulwarkBruteUrl },
  gloomspawn: { key: 'wave-gloomspawn', url: gloomspawnUrl },
  gloom_ogre: { key: 'wave-gloom-ogre', url: gloomOgreUrl }
};

export const waveSpriteKey = (defId: string): string | null => WAVE_SPRITES[defId]?.key ?? null;
