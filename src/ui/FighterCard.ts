import Phaser from 'phaser';
import type { FighterDefinition } from '../model/UnitDefinition';
import type { GameState } from '../model/GameState';
import { ARM_LABEL, ATK_LABEL, COLORS, ROLE_LABEL, txt } from './theme';

export const CARD_W = 172;
export const CARD_H = 88;

/** Compact tappable fighter shop card. Details behind the ⓘ button. */
export class FighterCard {
  readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly def: FighterDefinition;

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
    const t = def.tiers[0];
    this.bg = scene.add
      .rectangle(0, 0, CARD_W, CARD_H, COLORS.panelLight)
      .setOrigin(0)
      .setStrokeStyle(2, factionColor)
      .setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => onSelect(def.id));

    const name = txt(scene, 8, 6, t.name, 12).setFontStyle('bold');
    const cost = txt(scene, CARD_W - 8, 6, `${t.cost}g`, 12, COLORS.gold).setOrigin(1, 0);
    const role = txt(scene, 8, 26, ROLE_LABEL[def.role], 11, COLORS.textDim);
    const types = txt(
      scene,
      8,
      44,
      `${ATK_LABEL[def.attackType]} → / ${ARM_LABEL[def.armorType]} ▣`,
      11,
      '#b8c4de'
    );
    const stats = txt(scene, 8, 62, `${t.hp} HP  ${t.damage} DMG`, 11, COLORS.textDim);

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

    this.container = scene.add.container(x, y, [this.bg, name, cost, role, types, stats, infoBg, infoTxt]);
  }

  update(state: GameState, selectedDefId: string | null): void {
    const human = state.players[state.humanPlayerId];
    const affordable = human.gold >= this.def.tiers[0].cost && state.phase === 'build';
    this.container.setAlpha(affordable ? 1 : 0.45);
    this.bg.setFillStyle(selectedDefId === this.def.id ? 0x3d5a45 : COLORS.panelLight);
  }
}
