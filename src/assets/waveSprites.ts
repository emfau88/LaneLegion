import grublingUrl from './waves/grubling.png';
import stoneBeetleUrl from './waves/stone-beetle.png';
import swiftStalkerUrl from './waves/swift-stalker.png';
import bulwarkBruteUrl from './waves/bulwark-brute.png';
import gloomspawnUrl from './waves/gloomspawn.png';
import gloomOgreUrl from './waves/gloom-ogre.png';
import hordeRuntUrl from './waves/horde-runt.png';
import hordeBruiserUrl from './waves/horde-bruiser.png';
import ironCarapaceUrl from './waves/iron-carapace.png';
import ravagerUrl from './waves/ravager.png';
import swarmlingUrl from './waves/swarmling.png';
import dreadCultistUrl from './waves/dread-cultist.png';
import dreadColossusUrl from './waves/dread-colossus.png';
import crawlerUrl from './sends/crawler.png';
import bruteUrl from './sends/brute.png';
import saboteurUrl from './sends/saboteur.png';
import crusherUrl from './sends/crusher.png';
import drakeUrl from './sends/drake.png';
import type { UnitSpriteAsset } from './unitSprites';

export const WAVE_SPRITES: Record<string, UnitSpriteAsset> = {
  grubling: { key: 'wave-grubling', url: grublingUrl },
  stone_beetle: { key: 'wave-stone-beetle', url: stoneBeetleUrl },
  swift_stalker: { key: 'wave-swift-stalker', url: swiftStalkerUrl },
  bulwark_brute: { key: 'wave-bulwark-brute', url: bulwarkBruteUrl },
  gloomspawn: { key: 'wave-gloomspawn', url: gloomspawnUrl },
  gloom_ogre: { key: 'wave-gloom-ogre', url: gloomOgreUrl },
  horde_runt: { key: 'wave-horde-runt', url: hordeRuntUrl },
  horde_bruiser: { key: 'wave-horde-bruiser', url: hordeBruiserUrl },
  iron_carapace: { key: 'wave-iron-carapace', url: ironCarapaceUrl },
  ravager: { key: 'wave-ravager', url: ravagerUrl },
  swarmling: { key: 'wave-swarmling', url: swarmlingUrl },
  dread_cultist: { key: 'wave-dread-cultist', url: dreadCultistUrl },
  dread_colossus: { key: 'wave-dread-colossus', url: dreadColossusUrl },
  crawler: { key: 'send-crawler', url: crawlerUrl },
  brute: { key: 'send-brute', url: bruteUrl },
  saboteur: { key: 'send-saboteur', url: saboteurUrl },
  crusher: { key: 'send-crusher', url: crusherUrl },
  drake: { key: 'send-drake', url: drakeUrl }
};

export const waveSpriteKey = (defId: string): string | null => WAVE_SPRITES[defId]?.key ?? null;
