import Phaser from 'phaser';
import { KING_UPGRADES, kingUpgradeCost } from '../data/kingUpgrades';
import type { GameState } from '../model/GameState';
import type { KingUpgradeType } from '../model/Types';
import { kingRegenPerSec, kingSpellDamage, kingOf } from '../systems/KingSystem';
import { COLORS, txt, UIButton } from './theme';

/** King upgrade tab: three mythium upgrades shared by the whole team. */
export class KingPanel {
  readonly container: Phaser.GameObjects.Container;
  private rows: { type: KingUpgradeType; btn: UIButton; lvl: Phaser.GameObjects.Text }[] = [];
  private statsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, onUpgrade: (t: KingUpgradeType) => void) {
    this.container = scene.add.container(x, y);
    const types: KingUpgradeType[] = ['attack', 'regen', 'spell'];
    types.forEach((type, i) => {
      const spec = KING_UPGRADES[type];
      const rowY = i * 50;
      const name = txt(scene, 8, rowY, spec.name, 13).setFontStyle('bold');
      const desc = txt(scene, 8, rowY + 18, spec.desc, 10, COLORS.textDim);
      const lvl = txt(scene, 350, rowY + 8, '', 12, COLORS.textMain).setOrigin(1, 0);
      const btn = new UIButton(scene, 455, rowY + 16, 150, 34, '', 12, () => onUpgrade(type), 0x33305a);
      this.container.add([name, desc, lvl, btn.container]);
      this.rows.push({ type, btn, lvl });
    });
    this.statsText = txt(scene, 8, 152, '', 11, COLORS.textDim);
    this.container.add(this.statsText);
  }

  update(state: GameState): void {
    const human = state.players[state.humanPlayerId];
    const team = state.teams[human.teamId];
    for (const row of this.rows) {
      const spec = KING_UPGRADES[row.type];
      const level = team.kingUpgrades[row.type];
      row.lvl.setText(`Lv ${level}/${spec.maxLevel}`);
      if (level >= spec.maxLevel) {
        row.btn.setText('MAX');
        row.btn.setEnabled(false);
      } else {
        const cost = kingUpgradeCost(spec, level);
        row.btn.setText(`Upgrade ${cost} ◆`);
        row.btn.setEnabled(human.mythium >= cost && state.phase !== 'ended');
      }
    }
    const king = kingOf(state, human.teamId);
    if (king) {
      this.statsText.setText(
        `King: ${king.damage} dmg  •  ${kingRegenPerSec(state, human.teamId).toFixed(0)} HP/s regen  •  spell ${kingSpellDamage(state, human.teamId)} dmg`
      );
    }
  }
}
