import Phaser from 'phaser';
import { KING_UPGRADES, kingUpgradeCost } from '../data/kingUpgrades';
import type { GameState } from '../model/GameState';
import type { KingUpgradeType } from '../model/Types';
import { kingRegenPerSec, kingSpellDamage, kingOf } from '../systems/KingSystem';
import { t } from '../i18n/i18n';
import { kingUpgradeDesc, kingUpgradeName } from '../i18n/names';
import { COLORS, txt, UIButton } from './theme';

/** King upgrade tab: three mythium upgrades shared by the whole team. */
export class KingPanel {
  readonly container: Phaser.GameObjects.Container;
  private rows: { type: KingUpgradeType; btn: UIButton; lvl: Phaser.GameObjects.Text }[] = [];
  private hintText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, onUpgrade: (t: KingUpgradeType) => void) {
    this.container = scene.add.container(x, y);
    this.hintText = txt(scene, 8, 0, '', 10, COLORS.mythium, { wordWrap: { width: 510 } });
    this.container.add(this.hintText);
    const types: KingUpgradeType[] = ['attack', 'regen', 'spell'];
    types.forEach((type, i) => {
      const spec = KING_UPGRADES[type];
      const rowY = 24 + i * 38;
      const name = txt(scene, 8, rowY, kingUpgradeName(spec), 12).setFontStyle('bold');
      const desc = txt(scene, 8, rowY + 17, kingUpgradeDesc(spec), 9, COLORS.textDim);
      const lvl = txt(scene, 360, rowY + 8, '', 11, COLORS.textMain).setOrigin(1, 0);
      const btn = new UIButton(scene, 455, rowY + 16, 150, 28, '', 11, () => onUpgrade(type), 0x33305a);
      this.container.add([name, desc, lvl, btn.container]);
      this.rows.push({ type, btn, lvl });
    });
    this.statsText = txt(scene, 8, 150, '', 10, COLORS.textDim, { wordWrap: { width: 510 } });
    this.container.add(this.statsText);
  }

  update(state: GameState): void {
    const human = state.players[state.humanPlayerId];
    const team = state.teams[human.teamId];
    this.hintText.setText(t('king.hint', { n: Math.floor(human.mythium) }));
    for (const row of this.rows) {
      const spec = KING_UPGRADES[row.type];
      const level = team.kingUpgrades[row.type];
      row.lvl.setText(t('king.level', { n: level, max: spec.maxLevel }));
      if (level >= spec.maxLevel) {
        row.btn.setText(t('king.max'));
        row.btn.setEnabled(false);
      } else {
        const cost = kingUpgradeCost(spec, level);
        const canAfford = human.mythium >= cost;
        row.btn.setText(t(canAfford ? 'king.upgradeBtn' : 'king.needMythium', { cost }));
        row.btn.setEnabled(canAfford && state.phase !== 'ended');
      }
    }
    const king = kingOf(state, human.teamId);
    if (king) {
      this.statsText.setText(
        t('king.stats', {
          dmg: king.damage,
          regen: kingRegenPerSec(state, human.teamId).toFixed(0),
          spell: kingSpellDamage(state, human.teamId)
        })
      );
    }
  }
}
