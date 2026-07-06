import Phaser from 'phaser';
import { fighterSpriteKey } from '../assets/unitSprites';
import type { FighterDefinition } from '../model/UnitDefinition';
import type { GameState } from '../model/GameState';
import { t } from '../i18n/i18n';
import { fighterTierName } from '../i18n/names';
import { defenseMultVsWave, offenseMultVsWave } from '../core/matchup';
import { ARM_STYLE, ATK_STYLE, COLORS, armLabel, atkLabel, roleLabel, txt } from './theme';

export const CARD_W = 172;
export const CARD_H = 88;

/** Compact tappable fighter shop card. Details behind the ⓘ button. */
export class FighterCard {
  readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly def: FighterDefinition;
  /** Counter badges vs the upcoming wave (offense verdict + defense warning). */
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

    const name = txt(scene, 8, 6, fighterTierName(def, 0), 12).setFontStyle('bold');
    const cost = txt(scene, CARD_W - 8, 6, `${tier.cost}g`, 12, COLORS.gold).setOrigin(1, 0);
    const role = txt(scene, 8, 26, roleLabel(def.role), 11, COLORS.textDim);
    const atkSeg = txt(scene, 8, 44, atkLabel(def.attackType), 10, ATK_STYLE[def.attackType].color);
    const armSeg = txt(
      scene,
      8 + atkSeg.width + 10,
      44,
      armLabel(def.armorType),
      10,
      ARM_STYLE[def.armorType].color
    );
    const stats = txt(scene, 8, 62, t('card.stats', { hp: tier.hp, dmg: tier.damage }), 11, COLORS.textDim);
    const spriteKey = fighterSpriteKey(def.id);
    const icon = spriteKey
      ? scene.add
          .image(CARD_W - 30, 43, spriteKey)
          .setDisplaySize(34, 34)
          .setAlpha(0.92)
      : null;

    const infoBg = scene.add
      .rectangle(CARD_W - 4, CARD_H - 4, 28, 24, 0x1a2030)
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
    const infoTxt = txt(scene, CARD_W - 18, CARD_H - 16, 'i', 12, '#8fb7f0').setOrigin(0.5);

    this.defBadge = txt(scene, CARD_W - 52, 27, '⚠', 10, '#e0a04f').setOrigin(1, 0).setVisible(false);
    this.offBadge = txt(scene, CARD_W - 52, 27, '', 10).setOrigin(1, 0).setVisible(false);

    this.container = scene.add.container(
      x,
      y,
      [this.bg, name, cost, role, atkSeg, armSeg, stats, this.offBadge, this.defBadge, ...(icon ? [icon] : []), infoBg, infoTxt]
    );
  }

  /** Refresh the "strong/weak vs upcoming wave" badges (build phase only). */
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
      this.offBadge.setText(t('card.strong')).setColor(COLORS.ok).setVisible(true);
    } else if (off <= 0.8) {
      this.offBadge.setText(t('card.weak')).setColor(COLORS.danger).setVisible(true);
    } else {
      this.offBadge.setText('').setVisible(false);
    }

    this.defBadge.setVisible(def >= 1.2);
    // Lay out right-aligned: ⚠ sits at the fixed right edge, verdict text to its left.
    const right = CARD_W - 52;
    if (this.defBadge.visible) {
      this.defBadge.setX(right);
      this.offBadge.setX(right - this.defBadge.width - 4);
    } else {
      this.offBadge.setX(right);
    }
  }

  update(state: GameState, selectedDefId: string | null): void {
    const human = state.players[state.humanPlayerId];
    const affordable = human.gold >= this.def.tiers[0].cost && state.phase === 'build';
    this.container.setAlpha(affordable ? 1 : 0.45);
    this.bg.setFillStyle(selectedDefId === this.def.id ? 0x3d5a45 : COLORS.panelLight);
    this.updateBadges(state);
  }
}
