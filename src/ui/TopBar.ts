import Phaser from 'phaser';
import { CFG } from '../data/gameConfig';
import type { GameState } from '../model/GameState';
import { kingOf } from '../systems/KingSystem';
import { waveByNumber } from '../data/waves';
import { enemyTeamOf, playerFighterValue } from '../core/util';
import { t } from '../i18n/i18n';
import { sfx } from '../audio/sfx';
import { L } from './layout';
import { COLORS, panel, txt, UIButton } from './theme';

export interface TopBarCallbacks {
  onReady: () => void;
  onBuyWorker: () => void;
}

/** Compact top bar: wave/phase/timer, resources, both king HP bars. */
export class TopBar {
  private waveText: Phaser.GameObjects.Text;
  private valueText: Phaser.GameObjects.Text;
  private goldText: Phaser.GameObjects.Text;
  private mythText: Phaser.GameObjects.Text;
  private incomeText: Phaser.GameObjects.Text;
  private readyBtn: UIButton;
  private workerBtn: UIButton;
  private ownKingBar: Phaser.GameObjects.Rectangle;
  private ownKingText: Phaser.GameObjects.Text;
  private ownManaBar: Phaser.GameObjects.Rectangle;
  private enemyKingBar: Phaser.GameObjects.Rectangle;
  private enemyKingText: Phaser.GameObjects.Text;
  private readonly barW = 244;

  constructor(scene: Phaser.Scene, cb: TopBarCallbacks) {
    panel(scene, 0, 0, L.topBar.w, L.topBar.h, COLORS.panel);

    this.waveText = txt(scene, 10, 8, '', 14);
    this.valueText = txt(scene, 262, 10, '', 12);
    this.readyBtn = new UIButton(scene, 480, 17, 100, 26, t('topbar.ready'), 14, cb.onReady, 0x2f6b3a);
    const muteBtn = new UIButton(scene, 404, 17, 40, 26, sfx.isMuted() ? '✕' : '♪', 13, () => {
      sfx.toggleMuted();
      muteBtn.setText(sfx.isMuted() ? '✕' : '♪');
    });

    this.goldText = txt(scene, 10, 38, '', 14, COLORS.gold);
    this.mythText = txt(scene, 108, 38, '', 14, COLORS.mythium);
    this.incomeText = txt(scene, 240, 38, '', 14, COLORS.income);
    // Hint on what mythium/workers are for — the mechanic is otherwise unexplained.
    txt(scene, 108, 54, t('topbar.mythHint'), 9, COLORS.textDim).setAlpha(0.8);
    this.workerBtn = new UIButton(scene, 442, 47, 176, 26, '', 12, cb.onBuyWorker, 0x33305a);

    // King HP bars.
    txt(scene, 10, 64, t('topbar.you'), 11, COLORS.textDim);
    scene.add.rectangle(10, 80, this.barW, 12, 0x11141f).setOrigin(0);
    this.ownKingBar = scene.add.rectangle(10, 80, this.barW, 12, 0x4caf50).setOrigin(0);
    this.ownManaBar = scene.add.rectangle(10, 93, this.barW, 3, 0x5fd4e0).setOrigin(0);
    this.ownKingText = txt(scene, 10 + this.barW / 2, 81, '', 10).setOrigin(0.5, 0);

    txt(scene, 530, 64, t('topbar.enemy'), 11, COLORS.textDim).setOrigin(1, 0);
    scene.add.rectangle(286, 80, this.barW, 12, 0x11141f).setOrigin(0);
    this.enemyKingBar = scene.add.rectangle(286, 80, this.barW, 12, 0xd9534f).setOrigin(0);
    this.enemyKingText = txt(scene, 286 + this.barW / 2, 81, '', 10).setOrigin(0.5, 0);
  }

  update(state: GameState): void {
    const human = state.players[state.humanPlayerId];
    const remaining = Math.max(0, state.phaseEndsAt - state.time);
    const mm = Math.floor(remaining / 60);
    const ss = Math.floor(remaining % 60)
      .toString()
      .padStart(2, '0');
    const phaseName =
      state.phase === 'build' ? t('phase.build') : state.phase === 'battle' ? t('phase.battle') : t('phase.end');
    this.waveText.setText(
      `${t('topbar.wave', { n: state.waveNumber, max: state.maxWaves })}  •  ${phaseName}  ${state.phase === 'build' ? `${mm}:${ss}` : ''}`
    );

    // Build phase: fighter value vs the wave's recommendation. Battle: own leak count.
    if (state.phase === 'build') {
      const wave = waveByNumber(Math.min(state.waveNumber, state.maxWaves));
      const own = Math.floor(playerFighterValue(state, state.humanPlayerId));
      const ok = own >= wave.recommendedFighterValue;
      this.valueText
        .setText(`${t('topbar.value', { own, rec: wave.recommendedFighterValue })}${ok ? '' : ' ⚠'}`)
        .setColor(ok ? COLORS.ok : COLORS.danger);
    } else if (state.phase === 'battle' && human.leaksThisWave > 0) {
      this.valueText.setText(t('topbar.leaks', { n: human.leaksThisWave })).setColor(COLORS.danger);
    } else {
      this.valueText.setText('');
    }

    this.goldText.setText(`g ${Math.floor(human.gold)}`);
    this.mythText.setText(`◆ ${Math.floor(human.mythium)}`);
    this.incomeText.setText(`↑ ${human.income}`);
    this.workerBtn.setText(t('topbar.buyWorker', { cost: CFG.workerCost, n: human.workers }));
    this.workerBtn.setEnabled(state.phase === 'build' && human.gold >= CFG.workerCost);
    this.readyBtn.setEnabled(state.phase === 'build');
    this.readyBtn.container.setVisible(state.phase === 'build');

    const ownKing = kingOf(state, human.teamId);
    const enemyKing = kingOf(state, enemyTeamOf(state, human.teamId));
    if (ownKing) {
      this.ownKingBar.width = this.barW * Math.max(0, ownKing.hp / ownKing.maxHp);
      this.ownKingText.setText(`${Math.ceil(ownKing.hp)} / ${ownKing.maxHp}`);
      this.ownManaBar.width = this.barW * (state.teams[human.teamId].kingMana / CFG.king.manaMax);
    }
    if (enemyKing) {
      this.enemyKingBar.width = this.barW * Math.max(0, enemyKing.hp / enemyKing.maxHp);
      this.enemyKingText.setText(`${Math.ceil(enemyKing.hp)} / ${enemyKing.maxHp}`);
    }
  }
}
