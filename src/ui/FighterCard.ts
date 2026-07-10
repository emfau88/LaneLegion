import Phaser from 'phaser';
import { FIGHTER_SHEET_FRAME, fighterSheet } from '../assets/fighterSheets';
import { fighterSpriteKey } from '../assets/unitSprites';
import type { FighterDefinition } from '../model/UnitDefinition';
import type { GameState } from '../model/GameState';
import { fighterTierName } from '../i18n/names';
import { defenseMultVsWave, offenseMultVsWave } from '../core/matchup';
import { COLORS, ROLE_LETTER, txt } from './theme';

export const CARD_W = 88;
export const CARD_H = 78;

/** Thumb-first fighter shop card. Details stay behind the info button. */
export class FighterCard {
  readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly def: FighterDefinition;
  private readonly offBadge: Phaser.GameObjects.Text;
  private readonly defBadge: Phaser.GameObjects.Text;
  private badgeWave = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: FighterDefinition,
    factionColor: number,
    onSelect: (defId: string) => void,
    onInfo: (defId: string) => void
  ) {
    this.def = def;
    const tier = def.tiers[0];
    this.bg = scene.add
      .rectangle(0, 0, CARD_W, CARD_H, COLORS.panelLight)
      .setOrigin(0)
      .setStrokeStyle(2, factionColor)
      .setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => onSelect(def.id));

    const cost = txt(scene, CARD_W - 6, 5, `${tier.cost}g`, 11, COLORS.gold).setOrigin(1, 0).setFontStyle('bold');
    const role = txt(scene, 8, 7, ROLE_LETTER[def.role], 12, COLORS.textDim).setFontStyle('bold');
    const sheet = fighterSheet(def.id);
    const spriteKey = fighterSpriteKey(def.id);
    const fallback = scene.add
      .circle(CARD_W / 2, 31, 19, factionColor, 0.35)
      .setStrokeStyle(1, factionColor, 0.85)
      .setVisible(!sheet && !spriteKey);
    const fallbackLetter = txt(scene, CARD_W / 2, 31, ROLE_LETTER[def.role], 14, '#dfe8f5')
      .setOrigin(0.5)
      .setFontStyle('bold')
      .setVisible(!sheet && !spriteKey);
    const icon = sheet
      ? scene.add.sprite(CARD_W / 2, 31, sheet.key, FIGHTER_SHEET_FRAME.idle).setDisplaySize(40, 40).setAlpha(0.96)
      : spriteKey
        ? scene.add.image(CARD_W / 2, 31, spriteKey).setDisplaySize(38, 38).setAlpha(0.94)
        : null;
    const name = txt(scene, CARD_W / 2, 51, fighterTierName(def, 0), 8, COLORS.textMain, {
      align: 'center',
      wordWrap: { width: CARD_W - 10 }
    })
      .setOrigin(0.5, 0)
      .setFontStyle('bold');

    const infoBg = scene.add
      .rectangle(CARD_W - 4, CARD_H - 4, 20, 18, 0x1a2030)
      .setOrigin(1)
      .setStrokeStyle(1, COLORS.panelStroke)
      .setInteractive({ useHandCursor: true });
    infoBg.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        onInfo(def.id);
      }
    );
    const infoTxt = txt(scene, CARD_W - 14, CARD_H - 13, 'i', 10, '#8fb7f0').setOrigin(0.5);

    this.defBadge = txt(scene, 7, CARD_H - 17, '!', 10, '#e0a04f').setOrigin(0, 0).setVisible(false);
    this.offBadge = txt(scene, 19, CARD_H - 17, '', 10).setOrigin(0, 0).setVisible(false);

    this.container = scene.add.container(x, y, [
      this.bg,
      cost,
      role,
      fallback,
      fallbackLetter,
      ...(icon ? [icon] : []),
      name,
      this.offBadge,
      this.defBadge,
      infoBg,
      infoTxt
    ]);
  }

  private updateBadges(state: GameState): void {
    if (state.phase !== 'build') {
      if (this.offBadge.visible || this.defBadge.visible) {
        this.offBadge.setVisible(false);
        this.defBadge.setVisible(false);
      }
      this.badgeWave = 0;
      return;
    }
    if (this.badgeWave === state.waveNumber) return;
    this.badgeWave = state.waveNumber;

    const off = offenseMultVsWave(this.def.attackType, state.waveNumber);
    const def = defenseMultVsWave(this.def.armorType, state.waveNumber);

    if (off >= 1.2) {
      this.offBadge.setText('+').setColor(COLORS.ok).setVisible(true);
    } else if (off <= 0.8) {
      this.offBadge.setText('-').setColor(COLORS.danger).setVisible(true);
    } else {
      this.offBadge.setText('').setVisible(false);
    }
    this.defBadge.setVisible(def >= 1.2);
  }

  update(state: GameState, selectedDefId: string | null): void {
    const human = state.players[state.humanPlayerId];
    const affordable = human.gold >= this.def.tiers[0].cost && state.phase === 'build';
    this.container.setAlpha(affordable ? 1 : 0.45);
    this.bg.setFillStyle(selectedDefId === this.def.id ? 0x3d5a45 : COLORS.panelLight);
    this.updateBadges(state);
  }
}
