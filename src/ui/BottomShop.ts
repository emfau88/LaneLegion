import Phaser from 'phaser';
import { factionById } from '../data/factions';
import { fighterById } from '../data/fighters';
import { MERCENARIES } from '../data/mercenaries';
import type { GameState } from '../model/GameState';
import type { KingUpgradeType } from '../model/Types';
import { t } from '../i18n/i18n';
import { fighterTierName, mercName } from '../i18n/names';
import { CARD_W, CARD_H, FighterCard } from './FighterCard';
import { MERC_W, MercenaryCard } from './MercenaryCard';
import { KingPanel } from './KingPanel';
import { InfoPanel } from './InfoPanel';
import { L } from './layout';
import { COLORS, armLabel, atkLabel, roleLabel, txt, UIButton } from './theme';

export interface ShopCallbacks {
  onSelectFighter: (defId: string | null) => void;
  onShowFighterInfo: (defId: string) => void;
  onSendMerc: (mercId: string) => void;
  onToggleAutoSend: () => void;
  onKingUpgrade: (t: KingUpgradeType) => void;
}

type TabId = 'fighters' | 'mercs' | 'king' | 'info';

/**
 * Collapsible bottom sheet with 4 tabs. Large during build phase,
 * collapses to a compact merc quick-bar during battle.
 */
export class BottomShop {
  private scene: Phaser.Scene;
  private cb: ShopCallbacks;
  private activeTab: TabId = 'fighters';
  private mode: 'build' | 'battle' = 'build';
  private selectedFighter: string | null = null;

  private buildRoot: Phaser.GameObjects.Container;
  private battleRoot: Phaser.GameObjects.Container;
  private tabButtons: Record<TabId, UIButton>;
  private tabContents: Record<TabId, Phaser.GameObjects.Container>;

  private fighterCards: FighterCard[] = [];
  private fighterDetailBg: Phaser.GameObjects.Rectangle;
  private fighterDetailText: Phaser.GameObjects.Text;
  private mercCards: MercenaryCard[] = [];
  private kingPanel: KingPanel;
  private infoPanel: InfoPanel;
  private autoBtn: UIButton;
  private queuedText: Phaser.GameObjects.Text;

  private battleMercBtns: { id: string; btn: UIButton }[] = [];
  private battleAutoBtn: UIButton;
  private battleQueuedText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, state: GameState, cb: ShopCallbacks) {
    this.scene = scene;
    this.cb = cb;

    // ---------- Build-phase sheet ----------
    this.buildRoot = scene.add.container(0, L.sheet.buildTop);
    const bg = scene.add
      .rectangle(0, 0, L.width, L.sheet.buildH, COLORS.panel)
      .setOrigin(0)
      .setStrokeStyle(1, COLORS.panelStroke)
      .setInteractive(); // swallow taps so they don't reach the lane
    this.buildRoot.add(bg);

    const tabs: { id: TabId; label: string }[] = [
      { id: 'fighters', label: t('tab.fighters') },
      { id: 'mercs', label: t('tab.mercs') },
      { id: 'king', label: t('tab.king') },
      { id: 'info', label: t('tab.info') }
    ];
    this.tabButtons = {} as Record<TabId, UIButton>;
    tabs.forEach((tab, i) => {
      const btn = new UIButton(
        scene,
        10 + 132 / 2 + i * 133,
        L.sheet.tabH / 2 + 2,
        128,
        28,
        tab.label,
        13,
        () => this.setTab(tab.id)
      );
      this.tabButtons[tab.id] = btn;
      this.buildRoot.add(btn.container);
    });

    // Fighters tab
    const human = state.players[state.humanPlayerId];
    const faction = factionById(human.factionId);
    const fightersTab = scene.add.container(0, L.sheet.tabH + 6);
    faction.fighterIds.forEach((fid, i) => {
      const def = fighterById(fid);
      const card = new FighterCard(
        scene,
        4 + i * (CARD_W + 1),
        0,
        def,
        faction.color,
        (defId) => {
          this.selectedFighter = this.selectedFighter === defId ? null : defId;
          this.cb.onSelectFighter(this.selectedFighter);
        },
        cb.onShowFighterInfo
      );
      this.fighterCards.push(card);
      fightersTab.add(card.container);
    });
    this.fighterDetailBg = scene.add
      .rectangle(4, CARD_H + 8, L.width - 8, 22, 0x111827, 0.72)
      .setOrigin(0)
      .setStrokeStyle(1, COLORS.panelStroke);
    this.fighterDetailText = txt(scene, 12, CARD_H + 13, '', 10, COLORS.textDim, {
      wordWrap: { width: L.width - 24 }
    });
    fightersTab.add([this.fighterDetailBg, this.fighterDetailText]);

    // Mercs tab
    const mercsTab = scene.add.container(0, L.sheet.tabH + 6);
    MERCENARIES.forEach((merc, i) => {
      const card = new MercenaryCard(scene, 6 + i * (MERC_W + 5), 0, merc, cb.onSendMerc);
      this.mercCards.push(card);
      mercsTab.add(card.container);
    });
    this.autoBtn = new UIButton(scene, 100, 150, 185, 28, '', 12, cb.onToggleAutoSend, 0x33305a);
    this.queuedText = txt(scene, 200, 138, '', 11, COLORS.textDim);
    mercsTab.add([this.autoBtn.container, this.queuedText]);

    // King tab
    this.kingPanel = new KingPanel(scene, 0, L.sheet.tabH + 12, cb.onKingUpgrade);
    // Info tab
    this.infoPanel = new InfoPanel(scene, 0, L.sheet.tabH + 12);

    this.tabContents = {
      fighters: fightersTab,
      mercs: mercsTab,
      king: this.kingPanel.container,
      info: this.infoPanel.container
    };
    for (const c of Object.values(this.tabContents)) this.buildRoot.add(c);

    // ---------- Battle-phase compact bar ----------
    this.battleRoot = scene.add.container(0, L.sheet.battleTop);
    const bbg = scene.add
      .rectangle(0, 0, L.width, L.sheet.battleH, COLORS.panel)
      .setOrigin(0)
      .setStrokeStyle(1, COLORS.panelStroke)
      .setInteractive();
    this.battleRoot.add(bbg);
    this.battleRoot.add(txt(scene, 8, 5, t('shop.queueTitle'), 11, COLORS.textDim));
    MERCENARIES.forEach((merc, i) => {
      const btn = new UIButton(
        scene,
        8 + 102 / 2 + i * 106,
        40,
        100,
        32,
        `${mercName(merc)} ${merc.cost}◆`,
        10,
        () => cb.onSendMerc(merc.id),
        0x33305a
      );
      this.battleMercBtns.push({ id: merc.id, btn });
      this.battleRoot.add(btn.container);
    });
    this.battleAutoBtn = new UIButton(scene, 100, 76, 185, 22, '', 11, cb.onToggleAutoSend, 0x33305a);
    this.battleQueuedText = txt(scene, 200, 70, '', 11, COLORS.textDim);
    this.battleRoot.add([this.battleAutoBtn.container, this.battleQueuedText]);

    this.setTab('fighters');
    this.setMode('build');
  }

  setTab(tab: TabId): void {
    this.activeTab = tab;
    for (const [id, content] of Object.entries(this.tabContents)) {
      content.setVisible(id === tab);
    }
    for (const [id, btn] of Object.entries(this.tabButtons)) {
      btn.setBaseColor(id === tab ? 0x3c4a6b : COLORS.panelLight);
    }
    if (tab !== 'fighters') {
      this.selectedFighter = null;
      this.cb.onSelectFighter(null);
      this.updateFighterDetail(null);
    }
  }

  setMode(mode: 'build' | 'battle'): void {
    this.mode = mode;
    this.buildRoot.setVisible(mode === 'build');
    this.battleRoot.setVisible(mode === 'battle');
    if (mode === 'battle') {
      this.selectedFighter = null;
      this.cb.onSelectFighter(null);
      this.updateFighterDetail(null);
    }
  }

  clearSelection(): void {
    this.selectedFighter = null;
    this.updateFighterDetail(null);
  }

  private updateFighterDetail(defId: string | null): void {
    if (!defId) {
      this.fighterDetailBg.setVisible(false);
      this.fighterDetailText.setVisible(false);
      return;
    }
    const def = fighterById(defId);
    const tier = def.tiers[0];
    this.fighterDetailText.setText(
      `${fighterTierName(def, 0)} - ${roleLabel(def.role)} - ${tier.hp} HP / ${tier.damage} Dmg - ${atkLabel(def.attackType)} / ${armLabel(def.armorType)}`
    );
    this.fighterDetailBg.setVisible(true);
    this.fighterDetailText.setVisible(true);
  }

  update(state: GameState): void {
    const human = state.players[state.humanPlayerId];
    const queued =
      human.pendingSends.length === 0
        ? t('shop.noSends')
        : t('shop.queued', { n: human.pendingSends.length });
    const autoLabel = t('shop.autoSend', { state: t(human.autoSend ? 'common.on' : 'common.off') });

    if (this.mode === 'build') {
      for (const card of this.fighterCards) card.update(state, this.selectedFighter);
      this.updateFighterDetail(this.activeTab === 'fighters' ? this.selectedFighter : null);
      for (const card of this.mercCards) card.update(state);
      this.kingPanel.update(state);
      this.infoPanel.update(state);
      this.autoBtn.setText(autoLabel);
      this.autoBtn.setTextColor(human.autoSend ? COLORS.income : COLORS.textDim);
      this.queuedText.setText(queued);
    } else {
      for (const { id, btn } of this.battleMercBtns) {
        const merc = MERCENARIES.find((m) => m.id === id)!;
        btn.setEnabled(human.mythium >= merc.cost);
      }
      this.battleAutoBtn.setText(autoLabel);
      this.battleAutoBtn.setTextColor(human.autoSend ? COLORS.income : COLORS.textDim);
      this.battleQueuedText.setText(queued);
    }
  }
}
