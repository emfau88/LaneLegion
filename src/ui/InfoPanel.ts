import Phaser from 'phaser';
import { waveByNumber } from '../data/waves';
import type { GameState } from '../model/GameState';
import { playerFighterValue } from '../core/util';
import { ARM_LABEL, ATK_LABEL, COLORS, txt } from './theme';

/** Info tab: what the next wave brings and whether your defense value keeps up. */
export class InfoPanel {
  readonly container: Phaser.GameObjects.Container;
  private title: Phaser.GameObjects.Text;
  private warning: Phaser.GameObjects.Text;
  private comp: Phaser.GameObjects.Text;
  private value: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.container = scene.add.container(x, y);
    this.title = txt(scene, 8, 0, '', 14).setFontStyle('bold');
    this.warning = txt(scene, 8, 24, '', 12, COLORS.danger);
    this.comp = txt(scene, 8, 46, '', 11, '#b8c4de');
    this.value = txt(scene, 8, 90, '', 12);
    this.hint = txt(scene, 8, 114, '', 11, COLORS.textDim, { wordWrap: { width: 510 } });
    this.container.add([this.title, this.warning, this.comp, this.value, this.hint]);
  }

  update(state: GameState): void {
    const upcoming =
      state.phase === 'build' ? state.waveNumber : Math.min(state.waveNumber + 1, state.maxWaves);
    if (state.phase === 'battle' && state.waveNumber >= state.maxWaves) {
      this.title.setText('Final wave in progress!');
      this.warning.setText('');
      this.comp.setText('');
      this.value.setText('');
      this.hint.setText('Kill the enemy king or keep yours healthier.');
      return;
    }
    const wave = waveByNumber(upcoming);
    this.title.setText(
      `${state.phase === 'build' ? 'Incoming' : 'Next'}: Wave ${wave.waveNumber} — ${wave.name}`
    );
    this.warning.setText(`⚠ ${wave.warning}`);
    this.comp.setText(
      wave.groups
        .map(
          (g) =>
            `${g.count}× ${g.stats.name}  (${ATK_LABEL[g.stats.attackType]} atk / ${ARM_LABEL[g.stats.armorType]} armor, ${g.stats.hp} HP)`
        )
        .join('\n')
    );
    const own = playerFighterValue(state, state.humanPlayerId);
    const ok = own >= wave.recommendedFighterValue;
    this.value.setText(`Recommended defense value: ${wave.recommendedFighterValue}   (yours: ${Math.floor(own)})`);
    this.value.setColor(ok ? COLORS.ok : COLORS.danger);
    this.hint.setText(wave.shortHint);
  }
}
