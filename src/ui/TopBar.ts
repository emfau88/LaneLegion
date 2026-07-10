import Phaser from 'phaser';
import { HUD_ASSETS } from '../assets/hudAssets';
import { CFG } from '../data/gameConfig';
import { waveByNumber } from '../data/waves';
import type { GameState } from '../model/GameState';
import { enemyTeamOf, playerFighterValue } from '../core/util';
import { kingOf } from '../systems/KingSystem';
import { t } from '../i18n/i18n';
import { sfx } from '../audio/sfx';
import { L } from './layout';
import { COLORS, panel, txt, UIButton } from './theme';

export interface TopBarCallbacks {
  onReady: () => void;
  onBuyWorker: () => void;
}

/** Mobile-first top bar: compact match state, resources, actions, and king HP. */
export class TopBar {
  private waveText: Phaser.GameObjects.Text;
  private phaseText: Phaser.GameObjects.Text;
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
    panel(scene, 0, 0, L.topBar.w, L.topBar.h, COLORS.panel, 0.95);
    scene.add.image(L.topBar.w / 2, L.topBar.h / 2, HUD_ASSETS.topPanel.key).setDisplaySize(L.topBar.w, 96).setAlpha(0.98);

    // Keep the wave number clear of the ornamental top-panel frame.
    scene.add.rectangle(47, 20, 78, 26, 0x111827, 0.86).setStrokeStyle(1, COLORS.panelStroke);
    this.waveText = txt(scene, 47, 20, '', 12).setOrigin(0.5).setFontStyle('bold');

    scene.add.image(139, 20, HUD_ASSETS.phaseBadge.key).setDisplaySize(104, 28);
    this.phaseText = txt(scene, 139, 12, '', 10).setOrigin(0.5, 0).setFontStyle('bold');

    scene.add.image(284, 20, HUD_ASSETS.resourceSlot.key).setDisplaySize(130, 28);
    scene.add.image(229, 20, HUD_ASSETS.iconValue.key).setDisplaySize(21, 21);
    this.valueText = txt(scene, 248, 12, '', 10).setFontStyle('bold');

    this.readyBtn = new UIButton(scene, 496, 20, 84, 28, t('topbar.ready'), 12, cb.onReady, 0x2f6b3a, {
      normal: HUD_ASSETS.buttonPrimary.key,
      disabled: HUD_ASSETS.buttonDisabled.key
    });

    const muteBtn = new UIButton(scene, 421, 20, 34, 28, '', 13, () => {
      sfx.toggleMuted();
      muteBtn.setText(sfx.isMuted() ? 'x' : '');
      muteIcon.setAlpha(sfx.isMuted() ? 0.3 : 1);
    }, 0x22283a, {
      normal: HUD_ASSETS.buttonSecondary.key,
      disabled: HUD_ASSETS.buttonDisabled.key
    });
    const muteIcon = scene.add.image(421, 20, HUD_ASSETS.iconMusic.key).setDisplaySize(17, 17);
    muteIcon.setAlpha(sfx.isMuted() ? 0.3 : 1);

    this.addResourceSlot(scene, 50, 46, HUD_ASSETS.iconGold.key);
    this.addResourceSlot(scene, 139, 46, HUD_ASSETS.iconMythium.key);
    this.addResourceSlot(scene, 228, 46, HUD_ASSETS.iconIncome.key);
    this.goldText = txt(scene, 54, 38, '', 12, COLORS.gold).setOrigin(0.5, 0).setFontStyle('bold');
    this.mythText = txt(scene, 143, 38, '', 12, COLORS.mythium).setOrigin(0.5, 0).setFontStyle('bold');
    this.incomeText = txt(scene, 232, 38, '', 12, COLORS.income).setOrigin(0.5, 0).setFontStyle('bold');

    this.workerBtn = new UIButton(scene, 434, 48, 166, 26, '', 10, cb.onBuyWorker, 0x33305a, {
      normal: HUD_ASSETS.buttonSecondary.key,
      disabled: HUD_ASSETS.buttonDisabled.key
    });
    scene.add.image(340, 48, HUD_ASSETS.iconWorker.key).setDisplaySize(18, 18);

    scene.add.rectangle(22, 76, this.barW, 10, 0x11141f).setOrigin(0);
    this.ownKingBar = scene.add.rectangle(22, 76, this.barW, 10, 0x4caf50).setOrigin(0);
    this.ownManaBar = scene.add.rectangle(22, 87, this.barW, 2, 0x5fd4e0).setOrigin(0);
    scene.add.image(22 + this.barW / 2, 82, HUD_ASSETS.hpBarFrame.key).setDisplaySize(this.barW + 12, 21);
    txt(scene, 12, 63, t('topbar.you'), 9, COLORS.textDim).setFontStyle('bold');
    this.ownKingText = txt(scene, 22 + this.barW / 2, 74, '', 9).setOrigin(0.5, 0);

    scene.add.rectangle(280, 76, this.barW, 10, 0x11141f).setOrigin(0);
    this.enemyKingBar = scene.add.rectangle(280, 76, this.barW, 10, 0xd9534f).setOrigin(0);
    scene.add.image(280 + this.barW / 2, 82, HUD_ASSETS.hpBarFrame.key).setDisplaySize(this.barW + 12, 21);
    txt(scene, 528, 63, t('topbar.enemy'), 9, COLORS.textDim).setOrigin(1, 0).setFontStyle('bold');
    this.enemyKingText = txt(scene, 280 + this.barW / 2, 74, '', 9).setOrigin(0.5, 0);
  }

  private addResourceSlot(scene: Phaser.Scene, x: number, y: number, iconKey: string): void {
    scene.add.image(x, y, HUD_ASSETS.resourceSlot.key).setDisplaySize(82, 26);
    scene.add.image(x - 28, y, iconKey).setDisplaySize(18, 18);
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

    this.waveText.setText(t('topbar.wave', { n: state.waveNumber, max: state.maxWaves }));
    this.phaseText.setText(`${phaseName}${state.phase === 'build' ? ` ${mm}:${ss}` : ''}`);

    if (state.phase === 'build') {
      const wave = waveByNumber(Math.min(state.waveNumber, state.maxWaves));
      const own = Math.floor(playerFighterValue(state, state.humanPlayerId));
      const ok = own >= wave.recommendedFighterValue;
      this.valueText.setText(`${own}/${wave.recommendedFighterValue}${ok ? '' : ' !'}`).setColor(ok ? COLORS.ok : COLORS.danger);
    } else if (state.phase === 'battle' && human.leaksThisWave > 0) {
      this.valueText.setText(t('topbar.leaks', { n: human.leaksThisWave })).setColor(COLORS.danger);
    } else {
      this.valueText.setText('');
    }

    this.goldText.setText(`${Math.floor(human.gold)}`);
    this.mythText.setText(`${Math.floor(human.mythium)}`);
    this.incomeText.setText(`+${human.income}`);
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
