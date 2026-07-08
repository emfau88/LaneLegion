import Phaser from 'phaser';
import { waveByNumber } from '../data/waves';
import { DAMAGE_MATRIX } from '../data/damageMatrix';
import type { GameState } from '../model/GameState';
import type { ArmorType, AttackType } from '../model/Types';
import { playerFighterValue } from '../core/util';
import { getLang, t } from '../i18n/i18n';
import { creepDefId, creepName, waveHint, waveName, waveWarning } from '../i18n/names';
import { ARM_STYLE, ATK_STYLE, COLORS, armLabel, atkLabel, txt } from './theme';

/** Info tab: what the next wave brings and whether your defense value keeps up. */
export class InfoPanel {
  readonly container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private title: Phaser.GameObjects.Text;
  private warning: Phaser.GameObjects.Text;
  private compRows: Phaser.GameObjects.Container;
  private compKey = '';
  private value: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private economy: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
    this.title = txt(scene, 8, 0, '', 12).setFontStyle('bold');
    this.warning = txt(scene, 8, 18, '', 10, COLORS.danger);
    this.compRows = scene.add.container(8, 35);
    this.value = txt(scene, 8, 82, '', 10);
    this.hint = txt(scene, 8, 99, '', 9, COLORS.textDim, { wordWrap: { width: 510 } });
    this.economy = txt(scene, 8, 123, t('info.economyGuide'), 9, COLORS.mythium, { wordWrap: { width: 510 } });
    const legend = txt(scene, 8, 152, this.legendText(), 9, COLORS.textDim, { wordWrap: { width: 510 } }).setAlpha(0.8);
    this.container.add([this.title, this.warning, this.compRows, this.value, this.hint, this.economy, legend]);
  }

  /** "Stark: ➤ Stich → ○ Leicht · ..." — generated from the damage matrix. */
  private legendText(): string {
    const parts: string[] = [];
    for (const atk of Object.keys(DAMAGE_MATRIX) as AttackType[]) {
      const row = DAMAGE_MATRIX[atk];
      const strong = (Object.keys(row) as ArmorType[]).filter((arm) => row[arm] > 1);
      if (strong.length > 0) {
        parts.push(`${atkLabel(atk)} → ${strong.map((a) => armLabel(a)).join(', ')}`);
      }
    }
    return `${t('info.legendPrefix')} ${parts.join('  ·  ')}`;
  }

  private rebuildComp(waveNumber: number): void {
    const key = `${waveNumber}|${getLang()}`;
    if (key === this.compKey) return;
    this.compKey = key;
    this.compRows.removeAll(true);
    const wave = waveByNumber(waveNumber);
    wave.groups.forEach((g, i) => {
      const y = i * 14;
      const main = txt(
        this.scene,
        0,
        y,
        `${g.count}× ${creepName(creepDefId(g.stats.name), g.stats.name)}  (${g.stats.hp} HP)`,
        9,
        '#b8c4de'
      );
      const atkSeg = txt(
        this.scene,
        main.width + 10,
        y,
        atkLabel(g.stats.attackType),
        9,
        ATK_STYLE[g.stats.attackType].color
      );
      const armSeg = txt(
        this.scene,
        main.width + 10 + atkSeg.width + 8,
        y,
        armLabel(g.stats.armorType),
        9,
        ARM_STYLE[g.stats.armorType].color
      );
      this.compRows.add([main, atkSeg, armSeg]);
    });
  }

  update(state: GameState): void {
    const upcoming =
      state.phase === 'build' ? state.waveNumber : Math.min(state.waveNumber + 1, state.maxWaves);
    if (state.phase === 'battle' && state.waveNumber >= state.maxWaves) {
      this.title.setText(t('info.finalWave'));
      this.warning.setText('');
      this.compRows.setVisible(false);
      this.value.setText('');
      this.hint.setText(t('info.finalHint'));
      this.economy.setVisible(false);
      return;
    }
    this.compRows.setVisible(true);
    this.economy.setVisible(true);
    const wave = waveByNumber(upcoming);
    this.title.setText(
      t(state.phase === 'build' ? 'info.incoming' : 'info.next', {
        n: wave.waveNumber,
        name: waveName(wave)
      })
    );
    this.warning.setText(`⚠ ${waveWarning(wave)}`);
    this.rebuildComp(upcoming);
    const own = playerFighterValue(state, state.humanPlayerId);
    const ok = own >= wave.recommendedFighterValue;
    this.value.setText(t('info.recValue', { rec: wave.recommendedFighterValue, own: Math.floor(own) }));
    this.value.setColor(ok ? COLORS.ok : COLORS.danger);
    this.hint.setText(waveHint(wave));
  }
}
