import impactHitUrl from './effects/impact-hit.png';
import pierceHitUrl from './effects/pierce-hit.png';
import magicHitUrl from './effects/magic-hit.png';
import pureHitUrl from './effects/pure-hit.png';
import healPulseUrl from './effects/heal-pulse.png';
import workerWispUrl from './effects/worker-wisp.png';
import type { UnitSpriteAsset } from './unitSprites';
import type { AttackType } from '../model/Types';

export const HIT_EFFECT_SPRITES: Record<AttackType, UnitSpriteAsset> = {
  impact: { key: 'fx-impact-hit', url: impactHitUrl },
  pierce: { key: 'fx-pierce-hit', url: pierceHitUrl },
  magic: { key: 'fx-magic-hit', url: magicHitUrl },
  pure: { key: 'fx-pure-hit', url: pureHitUrl }
};

export const SUPPORT_EFFECT_SPRITES = {
  heal: { key: 'fx-heal-pulse', url: healPulseUrl }
} satisfies Record<string, UnitSpriteAsset>;

export const WORKER_WISP = { key: 'fx-worker-wisp', url: workerWispUrl };

export const hitEffectKey = (attackType: AttackType): string => HIT_EFFECT_SPRITES[attackType].key;
