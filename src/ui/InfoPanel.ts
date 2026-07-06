import Phaser from 'phaser';
import { waveByNumber } from '../data/waves';
import type { GameState } from '../model/GameState';
import { playerFighterValue } from '../core/util';
import { t } from '../i18n/i18n';
import { creepDefId, creepName, waveHint, waveName, waveWarning } from '../i18n/names';
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
      this.title.setText(t('info.finalWave'));
      this.warning.setText('');
      this.comp.setText('');
      this.value.setText('');
      this.hint.setText(t('info.finalHint'));
      return;
    }
    const wave = waveByNumber(upcoming);
    this.title.setText(
      t(state.phase === 'build' ? 'info.incoming' : 'info.next', {
        n: wave.waveNumber,
        name: waveName(wave)
      })
    );
    this.warning.setText(`⚠ ${waveWarning(wave)}`);
    this.comp.setText(
      wave.groups
        .map(
          (g) =>
            `${g.count}× ${creepName(creepDefId(g.stats.name), g.stats.name)}  (${ATK_LABEL[g.stats.attackType]} / ${ARM_LABEL[g.stats.armorType]}, ${g.stats.hp} HP)`
        )
        .join('\n')
    );
    const own = playerFighterValue(state, state.humanPlayerId);
    const ok = own >= wave.recommendedFighterValue;
    this.value.setText(t('info.recValue', { rec: wave.recommendedFighterValue, own: Math.floor(own) }));
    this.value.setColor(ok ? COLORS.ok : COLORS.danger);
    this.hint.setText(waveHint(wave));
  }
}
