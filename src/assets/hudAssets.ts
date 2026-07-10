import buttonDisabledUrl from './hud/button-disabled.png';
import buttonPrimaryUrl from './hud/button-primary.png';
import buttonSecondaryUrl from './hud/button-secondary.png';
import hpBarFrameUrl from './hud/hp-bar-frame.png';
import iconGoldUrl from './hud/icon-gold.png';
import iconIncomeUrl from './hud/icon-income.png';
import iconMusicUrl from './hud/icon-music.png';
import iconMythiumUrl from './hud/icon-mythium.png';
import iconValueUrl from './hud/icon-value.png';
import iconWorkerUrl from './hud/icon-worker.png';
import phaseBadgeUrl from './hud/phase-badge.png';
import resourceSlotUrl from './hud/resource-slot.png';
import topPanelUrl from './hud/top-panel.png';
import type { UnitSpriteAsset } from './unitSprites';

export const HUD_ASSETS = {
  topPanel: { key: 'hud-top-panel', url: topPanelUrl },
  resourceSlot: { key: 'hud-resource-slot', url: resourceSlotUrl },
  phaseBadge: { key: 'hud-phase-badge', url: phaseBadgeUrl },
  buttonPrimary: { key: 'hud-button-primary', url: buttonPrimaryUrl },
  buttonSecondary: { key: 'hud-button-secondary', url: buttonSecondaryUrl },
  buttonDisabled: { key: 'hud-button-disabled', url: buttonDisabledUrl },
  hpBarFrame: { key: 'hud-hp-bar-frame', url: hpBarFrameUrl },
  iconGold: { key: 'hud-icon-gold', url: iconGoldUrl },
  iconMythium: { key: 'hud-icon-mythium', url: iconMythiumUrl },
  iconIncome: { key: 'hud-icon-income', url: iconIncomeUrl },
  iconValue: { key: 'hud-icon-value', url: iconValueUrl },
  iconWorker: { key: 'hud-icon-worker', url: iconWorkerUrl },
  iconMusic: { key: 'hud-icon-music', url: iconMusicUrl }
} satisfies Record<string, UnitSpriteAsset>;
