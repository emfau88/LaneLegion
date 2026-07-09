import Phaser from 'phaser';
import type { GameState } from '../model/GameState';
import type { LaneDisplayStatus } from '../model/Types';
import { CFG } from '../data/gameConfig';
import { MERCENARIES } from '../data/mercenaries';
import { waveByNumber } from '../data/waves';
import { otherPlayersLaneStatus, playerFighterValue } from '../core/util';
import { t, type StringKey } from '../i18n/i18n';
import { playerName } from '../i18n/names';
import { L } from './layout';
import { COLORS, txt } from './theme';

const STATUS_COLOR: Record<LaneDisplayStatus, number> = {
  clear: 0x2f6b3a,
  fighting: 0x8a6d2f,
  leaking: 0x9c4a2f,
  dead: 0x7a2f35
};

/** Small tappable status chips for the lanes the player does not control. */
export class LaneStatusCards {
  private chips: { pid: string; bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private hintText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, state: GameState, onPeek: (playerId: string) => void) {
    const others = state.playerOrder.filter((pid) => pid !== state.humanPlayerId);
    const w = Math.min(166, (L.width - 16) / others.length - 8);
    let x = 8;
    for (const pid of others) {
      const p = state.players[pid];
      const bg = scene.add
        .rectangle(x, L.statusRow.y + 4, w, 24, STATUS_COLOR.clear)
        .setOrigin(0)
        .setStrokeStyle(1, COLORS.panelStroke)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => onPeek(pid));
      const label = txt(scene, x + w / 2, L.statusRow.y + 16, playerName(p), 11).setOrigin(0.5);
      this.chips.push({ pid, bg, label });
      x += w + 8;
    }
    if (others.length <= 1) {
      this.hintText = txt(scene, 188, L.statusRow.y + 16, '', 10, COLORS.textMain, {
        wordWrap: { width: L.width - 196 }
      }).setOrigin(0, 0.5);
    } else {
      txt(scene, L.width - 8, L.statusRow.y + 16, t('lane.tapToView'), 10, COLORS.textDim).setOrigin(1, 0.5);
    }
  }

  update(state: GameState): void {
    for (const chip of this.chips) {
      const p = state.players[chip.pid];
      const status = otherPlayersLaneStatus(state, chip.pid);
      chip.bg.setFillStyle(STATUS_COLOR[status]);
      chip.label.setText(`${playerName(p)}: ${t(`status.${status}` as StringKey)}`);
    }
    this.updateHint(state);
  }

  private updateHint(state: GameState): void {
    if (!this.hintText) return;
    const human = state.players[state.humanPlayerId];
    if (state.phase === 'battle') {
      this.hintText
        .setText(human.leaksThisWave > 0 ? t('hint.leaking') : t('hint.battle'))
        .setColor(human.leaksThisWave > 0 ? COLORS.danger : COLORS.textDim);
      return;
    }
    if (state.phase !== 'build') {
      this.hintText.setText('').setColor(COLORS.textDim);
      return;
    }

    const wave = waveByNumber(Math.min(state.waveNumber, state.maxWaves));
    const own = Math.floor(playerFighterValue(state, state.humanPlayerId));
    if (own < wave.recommendedFighterValue) {
      this.hintText
        .setText(t('hint.needValue', { own, rec: wave.recommendedFighterValue }))
        .setColor(COLORS.danger);
      return;
    }
    if (human.gold >= CFG.workerCost) {
      this.hintText.setText(t('hint.workerReady')).setColor(COLORS.worker);
      return;
    }
    const cheapestSend = MERCENARIES[0];
    const missingMythium = Math.max(0, Math.ceil(cheapestSend.cost - human.mythium));
    if (missingMythium > 0) {
      this.hintText.setText(t('hint.nextSend', { n: missingMythium })).setColor(COLORS.mythium);
      return;
    }
    this.hintText.setText(t('hint.spendMythium')).setColor(COLORS.mythium);
  }
}
