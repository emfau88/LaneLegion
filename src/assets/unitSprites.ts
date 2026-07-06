import shieldGuardUrl from './units/shield-guard.svg';
import hammerRecruitUrl from './units/hammer-recruit.svg';
import ballistaScoutUrl from './units/ballista-scout.svg';
import bannerBearerUrl from './units/banner-bearer.svg';
import steelHoundUrl from './units/steel-hound.svg';
import fortressGolemUrl from './units/fortress-golem.svg';

export interface UnitSpriteAsset {
  key: string;
  url: string;
}

export const FIGHTER_SPRITES: Record<string, UnitSpriteAsset> = {
  shield_guard: { key: 'fighter-shield-guard', url: shieldGuardUrl },
  hammer_recruit: { key: 'fighter-hammer-recruit', url: hammerRecruitUrl },
  ballista_scout: { key: 'fighter-ballista-scout', url: ballistaScoutUrl },
  banner_bearer: { key: 'fighter-banner-bearer', url: bannerBearerUrl },
  steel_hound: { key: 'fighter-steel-hound', url: steelHoundUrl },
  fortress_golem: { key: 'fighter-fortress-golem', url: fortressGolemUrl }
};

export const fighterSpriteKey = (defId: string): string | null => FIGHTER_SPRITES[defId]?.key ?? null;
