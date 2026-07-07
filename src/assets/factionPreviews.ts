import emberPreviewUrl from './faction-previews/ember.png';
import ironcladPreviewUrl from './faction-previews/ironclad.png';
import shadowPreviewUrl from './faction-previews/shadow.png';
import type { UnitSpriteAsset } from './unitSprites';

export const FACTION_PREVIEWS: Record<string, UnitSpriteAsset> = {
  ironclad: { key: 'faction-preview-ironclad', url: ironcladPreviewUrl },
  ember: { key: 'faction-preview-ember', url: emberPreviewUrl },
  shadow: { key: 'faction-preview-shadow', url: shadowPreviewUrl }
};

export const factionPreviewKey = (factionId: string): string | null => FACTION_PREVIEWS[factionId]?.key ?? null;
