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

/** Mobile-first top bar: match state, resources, actions, and king HP. */
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
  private readonly barW = 238;

  constructor(scene: Phaser.Scene, cb: TopBarCallbacks) {
    panel(scene, 0, 0, L.topBar.w, L.topBar.h, COLORS.panel, 0.9);

    this.waveText = txt(scene, 10, 7, '', 14).setFontStyle('bold');
    this.valueText = txt(scene, 258, 9, '', 11);
    this.readyBtn = new UIButton(scene, 490, 17, 86, 26, t('topbar.ready'), 13, cb.onReady, 0x2f6b3a);
    const muteBtn = new UIButton(scene, 420, 17, 34, 26, sfx.isMuted() ? 'x' : '♪', 13, () => {
      sfx.toggleMuted();
      muteBtn.setText(sfx.isMuted() ? 'x' : '♪');
    });

    this.goldText = txt(scene, 10, 35, '', 14, COLORS.gold).setFontStyle('bold');
    this.mythText = txt(scene, 96, 35, '', 14, COLORS.mythium).setFontStyle('bold');
    this.incomeText = txt(scene, 172, 35, '', 14, COLORS.income).setFontStyle('bold');
    this.workerBtn = new UIButton(scene, 434, 49, 190, 24, '', 11, cb.onBuyWorker, 0x33305a);

    txt(scene, 10, 62, t('topbar.you'), 10, COLORS.textDim);
    scene.add.rectangle(10, 76, this.barW, 10, 0x11141f).setOrigin(0);
    this.ownKingBar = scene.add.rectangle(10, 76, this.barW, 10, 0x4caf50).setOrigin(0);
    this.ownManaBar = scene.add.rectangle(10, 87, this.barW, 2, 0x5fd4e0).setOrigin(0);
    this.ownKingText = txt(scene, 10 + this.barW / 2, 76, '', 9).setOrigin(0.5, 0);

    txt(scene, 530, 62, t('topbar.enemy'), 10, COLORS.textDim).setOrigin(1, 0);
    scene.add.rectangle(292, 76, this.barW, 10, 0x11141f).setOrigin(0);
    this.enemyKingBar = scene.add.rectangle(292, 76, this.barW, 10, 0xd9534f).setOrigin(0);
    this.enemyKingText = txt(scene, 292 + this.barW / 2, 76, '', 9).setOrigin(0.5, 0);
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
      `${t('topbar.wave', { n: state.waveNumber, max: state.maxWaves })} | ${phaseName}${state.phase === 'build' ? ` ${mm}:${ss}` : ''}`
    );

    if (state.phase === 'build') {
      const wave = waveByNumber(Math.min(state.waveNumber, state.maxWaves));
      const own = Math.floor(playerFighterValue(state, state.humanPlayerId));
      const ok = own >= wave.recommendedFighterValue;
      this.valueText
        .setText(`${t('topbar.value', { own, rec: wave.recommendedFighterValue })}${ok ? '' : ' !'}`)
        .setColor(ok ? COLORS.ok : COLORS.danger);
    } else if (state.phase === 'battle' && human.leaksThisWave > 0) {
      this.valueText.setText(t('topbar.leaks', { n: human.leaksThisWave })).setColor(COLORS.danger);
    } else {
      this.valueText.setText('');
    }

    this.goldText.setText(`g ${Math.floor(human.gold)}`);
    this.mythText.setText(`m ${Math.floor(human.mythium)}`);
    this.incomeText.setText(`+ ${human.income}`);
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
