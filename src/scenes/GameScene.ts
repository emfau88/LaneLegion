import Phaser from 'phaser';
import { SUPPORT_EFFECT_SPRITES, WORKER_WISP, hitEffectKey } from '../assets/effectSprites';
import { FIGHTER_SHEET_FRAME, type FighterSheetAnim, fighterSheet, fighterSheetAnimKey, fighterSheetFrame } from '../assets/fighterSheets';
import { KING_SPRITE, type KingSheetFrame } from '../assets/kingSprites';
import { fighterSpriteKey } from '../assets/unitSprites';
import { type WaveSheetAnim, waveSheet, waveSheetAnimKey } from '../assets/waveSheets';
import { waveSpriteKey } from '../assets/waveSprites';
import { CFG } from '../data/gameConfig';
import { factionById } from '../data/factions';
import { fighterById } from '../data/fighters';
import { Simulation } from '../core/Simulation';
import { arenaZoneId, type GameSetup } from '../model/GameState';
import type { CombatUnit } from '../model/CombatUnit';
import type { AttackType, GameEvent } from '../model/Types';
import { isCellFree } from '../systems/PlacementSystem';
import { DAMAGE_MATRIX, damageMultiplier } from '../data/damageMatrix';
import { offenseMultVsWave } from '../core/matchup';
import type { ArmorType } from '../model/Types';
import { t } from '../i18n/i18n';
import { factionName, fighterDesc, fighterTierName, playerName, unitDisplayName } from '../i18n/names';
import { sfx } from '../audio/sfx';
import { TopBar } from '../ui/TopBar';
import { LaneStatusCards } from '../ui/LaneStatusCards';
import { BottomShop } from '../ui/BottomShop';
import { L, arenaToScreen, laneToScreen, screenToCell } from '../ui/layout';
import { COLORS, ROLE_LETTER, armLabel, atkLabel, roleLabel, txt, UIButton } from '../ui/theme';

interface UnitView {
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.GameObject;
  spriteBody?: Phaser.GameObjects.Sprite;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBarW: number;
  tier: number;
  radius: number;
  resetFrameTimer?: Phaser.Time.TimerEvent;
  fighterAnim?: FighterSheetAnim;
  waveAnim?: WaveSheetAnim;
  deathUntil?: number;
}

const DEPTH_LANE_INPUT = 1;
const DEPTH_HIGHLIGHT = 2;
const DEPTH_MAP_OVERLAY = 3;
const DEPTH_UNITS = 5;
const DEPTH_FX = 8;
const DEPTH_POPUP = 20;

export class GameScene extends Phaser.Scene {
  private sim!: Simulation;
  private setup!: GameSetup;
  private views = new Map<number, UnitView>();
  private placementSelection: string | null = null;
  private lastPhase = 'build';
  private endedHandled = false;

  private topBar!: TopBar;
  private statusCards!: LaneStatusCards;
  private shop!: BottomShop;
  private highlightGfx!: Phaser.GameObjects.Graphics;
  private mapOverlayGfx!: Phaser.GameObjects.Graphics;
  private workerCountText!: Phaser.GameObjects.Text;
  private workerWisps: Phaser.GameObjects.Image[] = [];
  private lastShownMythium = 0;

  private actionMenu!: Phaser.GameObjects.Container;
  private actionTitle!: Phaser.GameObjects.Text;
  private upgradeBtn!: UIButton;
  private sellBtn!: UIButton;
  private actionUnitId: number | null = null;

  private infoPopup!: Phaser.GameObjects.Container;
  private infoTitle!: Phaser.GameObjects.Text;
  private infoBody!: Phaser.GameObjects.Text;

  private peekOverlay!: Phaser.GameObjects.Container;
  private peekTitle!: Phaser.GameObjects.Text;
  private peekGfx!: Phaser.GameObjects.Graphics;
  private peekPid: string | null = null;

  private reportPanel!: Phaser.GameObjects.Container;
  private reportTitle!: Phaser.GameObjects.Text;
  private reportBody!: Phaser.GameObjects.Text;
  private reportHideTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('Game');
  }

  init(data: GameSetup): void {
    this.setup = data;
    this.views = new Map();
    this.placementSelection = null;
    this.lastPhase = 'build';
    this.endedHandled = false;
    this.actionUnitId = null;
    this.peekPid = null;
    this.reportHideTimer = null;
  }

  create(): void {
    this.sim = new Simulation(this.setup);
    this.drawStaticLane();
    this.createLaneInput();
    this.highlightGfx = this.add.graphics().setDepth(DEPTH_HIGHLIGHT);
    this.mapOverlayGfx = this.add.graphics().setDepth(DEPTH_MAP_OVERLAY);
    this.workerCountText = txt(this, L.board.left + 95, L.board.top + 895, '', 9, COLORS.mythium)
      .setOrigin(0.5)
      .setDepth(DEPTH_MAP_OVERLAY);
    for (let i = 0; i < 10; i++) {
      const wisp = this.add.image(0, 0, WORKER_WISP.key).setDisplaySize(18, 18).setDepth(DEPTH_MAP_OVERLAY).setVisible(false);
      this.tweens.add({ targets: wisp, y: '-=3', alpha: 0.72, duration: 520, yoyo: true, repeat: -1, delay: i * 70 });
      this.workerWisps.push(wisp);
    }

    this.topBar = new TopBar(this, {
      onReady: () => this.sim.ready(),
      onBuyWorker: () => {
        if (this.sim.buyWorker()) sfx.play('worker');
      }
    });
    this.statusCards = new LaneStatusCards(this, this.sim.state, (pid) => this.showPeek(pid));
    this.shop = new BottomShop(this, this.sim.state, {
      onSelectFighter: (defId) => {
        this.placementSelection = defId;
        this.hideActionMenu();
      },
      onShowFighterInfo: (defId) => this.showFighterInfo(defId),
      onSendMerc: (mercId) => {
        if (this.sim.sendMercenary(mercId)) sfx.play('send');
      },
      onToggleAutoSend: () => this.sim.toggleAutoSend(),
      onKingUpgrade: (type) => {
        if (this.sim.buyKingUpgrade(type)) sfx.play('upgrade');
      }
    });

    this.createActionMenu();
    this.createInfoPopup();
    this.createPeekOverlay();
    this.createReportPanel();
  }

  // ---------- static rendering ----------

  private drawStaticLane(): void {
    // The board asset already contains zone colors, grid, frames and the arena —
    // draw it 1:1 and only add the functional text labels on top.
    this.add
      .image(L.board.left, L.board.top, 'lane-arena-board')
      .setOrigin(0)
      .setDisplaySize(L.board.w, L.board.h);

    const { left, top, cellW, cellH } = L.lane;
    const w = L.lane.w;
    const buildTop = top + CFG.grid.buildRowStart * cellH;
    const buildH = (CFG.grid.buildRowEnd - CFG.grid.buildRowStart + 1) * cellH;
    const grid = this.add.graphics().setDepth(DEPTH_HIGHLIGHT - 1);
    grid.lineStyle(1, 0xb7c2cc, 0.16);
    for (let col = 0; col <= CFG.grid.cols; col++) {
      const x = left + col * cellW;
      grid.lineBetween(x, buildTop, x, buildTop + buildH);
    }
    for (let row = CFG.grid.buildRowStart; row <= CFG.grid.buildRowEnd + 1; row++) {
      const y = top + row * cellH;
      grid.lineBetween(left, y, left + w, y);
    }
    grid.lineStyle(3, 0x89d37f, 0.62).strokeRect(
      left,
      buildTop,
      w,
      buildH
    );
    txt(this, left + w / 2, top + cellH / 2, t('zone.spawn'), 10, '#c98a96').setOrigin(0.5).setAlpha(0.9);
    txt(this, left + w / 2, top + (CFG.grid.buildRowStart + 0.1) * cellH, t('zone.build'), 10, '#6f9a78')
      .setOrigin(0.5, 0)
      .setAlpha(0.7);
    txt(this, left + w / 2, top + (CFG.grid.rows - 0.5) * cellH, t('zone.leak'), 10, '#c98a96')
      .setOrigin(0.5)
      .setAlpha(0.9);
    txt(this, L.arena.left + 6, L.arena.top + 4, t('zone.arena'), 10, '#c9b76a').setAlpha(0.9);
  }

  private createLaneInput(): void {
    const buildTop = L.lane.top + CFG.grid.buildRowStart * L.lane.cellH;
    const buildH = (CFG.grid.buildRowEnd - CFG.grid.buildRowStart + 1) * L.lane.cellH;
    const rect = this.add
      .rectangle(L.lane.left, buildTop, L.lane.w, buildH, 0xffffff, 0.001)
      .setOrigin(0)
      .setDepth(DEPTH_LANE_INPUT)
      .setInteractive();
    rect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.hideActionMenu();
      if (!this.placementSelection || this.sim.state.phase !== 'build') return;
      const cell = screenToCell(pointer.worldX, pointer.worldY);
      if (!cell) return;
      if (this.sim.placeFighter(this.placementSelection, cell.col, cell.row)) sfx.play('place');
    });
  }

  // ---------- unit views ----------

  private createView(u: CombatUnit): UnitView {
    const isLane = u.zoneId === this.humanLaneId();
    const sp = isLane ? laneToScreen(u.pos) : arenaToScreen(u.pos);
    const root = this.add.container(sp.x, sp.y).setDepth(DEPTH_UNITS);
    let body: Phaser.GameObjects.GameObject;
    let radius = 12;
    let hpBarW = 26;

    if (u.kind === 'king') {
      radius = 42;
      hpBarW = 116;
      root.add(this.add.ellipse(0, radius - 2, radius * 2.05, 14, 0x05070b, 0.34));
      body = this.add.image(0, 0, KING_SPRITE.key).setDisplaySize(123, 123);
      root.add(body);
    } else if (u.kind === 'fighter') {
      const faction = factionById(u.factionId ?? 'ironclad');
      const sheet = fighterSheet(u.defId);
      const spriteKey = fighterSpriteKey(u.defId);
      radius = u.tier === 1 ? 25 : 22;
      root.add(this.add.ellipse(0, radius - 2, radius * 1.55, 7, 0x05070b, 0.32));
      if (sheet) {
        if (u.tier === 1) {
          root.add(this.add.circle(0, 0, radius + 3, 0xf5c542, 0.18).setStrokeStyle(2, 0xf5c542, 0.75));
        }
        const sprite = this.add.sprite(0, 0, sheet.key, fighterSheetFrame(sheet, 'idle')).setDisplaySize(radius * 3, radius * 3);
        body = sprite;
        root.add(body);
      } else if (spriteKey) {
        if (u.tier === 1) {
          root.add(this.add.circle(0, 0, radius + 3, 0xf5c542, 0.18).setStrokeStyle(2, 0xf5c542, 0.75));
        }
        body = this.add.image(0, 0, spriteKey).setDisplaySize(radius * 2.85, radius * 2.85);
        root.add(body);
      } else {
        body = this.add.circle(0, 0, radius, faction.color);
        if (u.tier === 1) (body as Phaser.GameObjects.Arc).setStrokeStyle(2.5, 0xf5c542);
        else (body as Phaser.GameObjects.Arc).setStrokeStyle(1.5, 0xffffff, 0.4);
        root.add(body);
        root.add(
          txt(this, 0, 0, ROLE_LETTER[u.role], 12, '#101319').setOrigin(0.5).setFontStyle('bold')
        );
      }
      body.setInteractive();
      body.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.onFighterTap(u.id);
      });
    } else {
      const sheet = waveSheet(u.defId);
      const spriteKey = waveSpriteKey(u.defId);
      radius = Math.min(24, Math.max(12, u.collisionRadius * 46));
      hpBarW = Math.max(20, radius * 2.1);
      root.add(this.add.ellipse(0, radius - 2, radius * 1.6, 7, 0x05070b, 0.28));
      if (sheet) {
        const spriteSize = Math.max(36, radius * 3.35);
        body = this.add.sprite(0, 0, sheet.key, 0).setDisplaySize(spriteSize, spriteSize);
        root.add(body);
      } else if (spriteKey) {
        const spriteSize = Math.max(36, radius * 3.35);
        if (u.maxHp >= 1000) {
          root.add(this.add.circle(0, 0, radius + 5, COLORS.hostile, 0.18).setStrokeStyle(2, COLORS.hostile, 0.65));
        }
        body = this.add.image(0, 0, spriteKey).setDisplaySize(spriteSize, spriteSize);
        root.add(body);
      } else {
        body = this.add.circle(0, 0, radius, COLORS.hostile).setStrokeStyle(1.5, COLORS.hostileDark);
        root.add(body);
        if (radius >= 12) {
          root.add(txt(this, 0, 0, u.name.charAt(0), 11, '#2a0f10').setOrigin(0.5).setFontStyle('bold'));
        }
      }
    }

    const barY = -radius - 8;
    root.add(this.add.rectangle(0, barY, hpBarW + 2, 5, 0x11141f).setOrigin(0.5));
    const hpBar = this.add
      .rectangle(-hpBarW / 2, barY, hpBarW, 3, u.teamId === this.humanTeamId() ? 0x4caf50 : 0xe0654f)
      .setOrigin(0, 0.5);
    root.add(hpBar);

    const view: UnitView = {
      root,
      body,
      spriteBody: body instanceof Phaser.GameObjects.Sprite ? body : undefined,
      hpBar,
      hpBarW,
      tier: u.tier,
      radius
    };
    this.views.set(u.id, view);
    return view;
  }

  private humanLaneId(): string {
    return this.sim.state.players[this.sim.state.humanPlayerId].laneId;
  }
  private humanTeamId(): string {
    return this.sim.state.players[this.sim.state.humanPlayerId].teamId;
  }

  private syncUnits(): void {
    const state = this.sim.state;
    const laneId = this.humanLaneId();
    const arenaId = arenaZoneId(this.humanTeamId());
    const seen = new Set<number>();

    for (const u of state.units.values()) {
      if (u.state === 'dead') continue;
      if (u.zoneId !== laneId && u.zoneId !== arenaId) continue;
      seen.add(u.id);

      let view = this.views.get(u.id);
      if (view && view.tier !== u.tier) {
        view.root.destroy();
        this.views.delete(u.id);
        view = undefined;
      }
      if (!view) view = this.createView(u);

      const sp = u.zoneId === laneId ? laneToScreen(u.pos) : arenaToScreen(u.pos);
      view.root.x += (sp.x - view.root.x) * 0.45;
      view.root.y += (sp.y - view.root.y) * 0.45;
      view.hpBar.width = view.hpBarW * Math.max(0, u.hp / u.maxHp);
      if (u.kind === 'king') this.refreshKingFrame(u, view);
      if (u.kind === 'fighter') this.refreshFighterAnim(u, view);
      if (u.kind === 'creep') this.refreshWaveAnim(u, view);
    }

    for (const [id, view] of this.views) {
      if (view.deathUntil && this.time.now < view.deathUntil) continue;
      if (!seen.has(id)) {
        view.root.destroy();
        this.views.delete(id);
      }
    }
  }

  // ---------- placement highlight ----------

  private drawHighlights(): void {
    this.highlightGfx.clear();
    if (!this.placementSelection || this.sim.state.phase !== 'build') return;
    const laneId = this.humanLaneId();
    const { left, top, cellW, cellH } = L.lane;
    for (let row = CFG.grid.buildRowStart; row <= CFG.grid.buildRowEnd; row++) {
      for (let col = 0; col < CFG.grid.cols; col++) {
        const free = isCellFree(this.sim.state, laneId, col, row);
        this.highlightGfx
          .fillStyle(free ? COLORS.highlightOk : COLORS.highlightBad, free ? 0.28 : 0.18)
          .fillRect(left + col * cellW + 2, top + row * cellH + 2, cellW - 4, cellH - 4);
      }
    }
  }

  private drawMapOverlays(): void {
    const state = this.sim.state;
    const g = this.mapOverlayGfx;
    const human = state.players[state.humanPlayerId];
    const arenaId = arenaZoneId(this.humanTeamId());
    const gateOpen =
      human.leaksThisWave > 0 ||
      [...state.units.values()].some((u) => u.kind === 'creep' && u.zoneId === arenaId && u.state !== 'dead');
    const gateX = L.lane.left + L.lane.w / 2;
    const gateY = L.lane.top + L.lane.h - 50;

    g.clear();
    g.fillStyle(0x080a10, gateOpen ? 0.78 : 0.38).fillRoundedRect(gateX - 42, gateY - 13, 84, 40, 5);
    if (gateOpen) {
      g.fillStyle(0x7a3b45, 0.92).fillRoundedRect(gateX - 54, gateY - 12, 24, 35, 4);
      g.fillStyle(0x7a3b45, 0.92).fillRoundedRect(gateX + 30, gateY - 12, 24, 35, 4);
      g.lineStyle(2, 0xef5f6a, 0.7).strokeRoundedRect(gateX - 46, gateY - 16, 92, 46, 6);
    } else {
      g.fillStyle(0x362832, 0.96).fillRoundedRect(gateX - 41, gateY - 12, 39, 36, 4);
      g.fillStyle(0x362832, 0.96).fillRoundedRect(gateX + 2, gateY - 12, 39, 36, 4);
      g.lineStyle(2, 0xb89b5b, 0.5).lineBetween(gateX, gateY - 10, gateX, gateY + 22);
    }

    const mineX = L.board.left + 42;
    const mineY = L.board.top + 806;
    const shownWorkers = Math.min(human.workers, 10);
    for (let i = 0; i < shownWorkers; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const pulse = Math.sin(state.time * 5 + i) * 1.5;
      const x = mineX + 12 + col * 20;
      const y = mineY + row * 18 + pulse;
      this.workerWisps[i].setPosition(x, y).setVisible(true);
    }
    for (let i = shownWorkers; i < this.workerWisps.length; i++) this.workerWisps[i].setVisible(false);
    this.workerCountText.setPosition(L.board.left + 95, L.board.top + 895);
    this.workerCountText.setText(human.workers > 10 ? `+${human.workers - 10}` : `${human.workers}`);
  }

  // ---------- action menu (upgrade / sell) ----------

  private createActionMenu(): void {
    this.actionTitle = txt(this, 0, -38, '', 12).setOrigin(0.5).setFontStyle('bold');
    const bg = this.add.rectangle(0, 0, 190, 104, 0x1a2030, 0.97).setStrokeStyle(1, COLORS.panelStroke);
    this.upgradeBtn = new UIButton(this, 0, -12, 168, 30, '', 12, () => {
      if (this.actionUnitId !== null && this.sim.upgradeFighter(this.actionUnitId)) sfx.play('upgrade');
      this.hideActionMenu();
    }, 0x2f6b3a);
    this.sellBtn = new UIButton(this, 0, 26, 168, 30, '', 12, () => {
      if (this.actionUnitId !== null && this.sim.sellFighter(this.actionUnitId)) sfx.play('sell');
      this.hideActionMenu();
    }, 0x6b2f35);
    this.actionMenu = this.add
      .container(0, 0, [bg, this.actionTitle, this.upgradeBtn.container, this.sellBtn.container])
      .setDepth(DEPTH_POPUP)
      .setVisible(false);
  }

  private onFighterTap(unitId: number): void {
    const state = this.sim.state;
    const u = state.units.get(unitId);
    if (!u || u.ownerId !== state.humanPlayerId || state.phase !== 'build') return;
    this.placementSelection = null;
    this.shop.clearSelection();
    this.actionUnitId = unitId;

    const sp = laneToScreen(u.pos);
    this.actionMenu.setPosition(
      Math.min(Math.max(sp.x, 105), L.width - 105),
      Math.min(Math.max(sp.y - 70, 190), 600)
    );
    this.refreshActionMenu();
    this.actionMenu.setVisible(true);
  }

  private refreshActionMenu(): void {
    if (this.actionUnitId === null) return;
    const state = this.sim.state;
    const u = state.units.get(this.actionUnitId);
    if (!u) {
      this.hideActionMenu();
      return;
    }
    const human = state.players[state.humanPlayerId];
    this.actionTitle.setText(unitDisplayName(u));
    if (u.tier === 0) {
      const upCost = fighterById(u.defId).tiers[1].cost;
      this.upgradeBtn.setText(t('action.upgrade', { cost: upCost }));
      this.upgradeBtn.setEnabled(human.gold >= upCost && state.phase === 'build');
    } else {
      this.upgradeBtn.setText(t('action.maxed'));
      this.upgradeBtn.setEnabled(false);
    }
    this.sellBtn.setText(t('action.sell', { n: Math.floor(u.investedGold * CFG.sellRefundRate) }));
    this.sellBtn.setEnabled(state.phase === 'build');
  }

  private hideActionMenu(): void {
    this.actionUnitId = null;
    this.actionMenu.setVisible(false);
  }

  // ---------- fighter info popup ----------

  private createInfoPopup(): void {
    const shade = this.add
      .rectangle(L.width / 2, L.height / 2, L.width, L.height, 0x000000, 0.55)
      .setInteractive();
    shade.on('pointerdown', () => this.infoPopup.setVisible(false));
    const panel = this.add
      .rectangle(L.width / 2, 430, 420, 330, 0x1a2030, 0.98)
      .setStrokeStyle(2, COLORS.panelStroke);
    this.infoTitle = txt(this, L.width / 2, 290, '', 16).setOrigin(0.5, 0).setFontStyle('bold');
    this.infoBody = txt(this, L.width / 2 - 190, 322, '', 12, '#c8d2e8', {
      wordWrap: { width: 380 },
      lineSpacing: 5
    });
    this.infoPopup = this.add
      .container(0, 0, [shade, panel, this.infoTitle, this.infoBody])
      .setDepth(DEPTH_POPUP)
      .setVisible(false);
  }

  /** Matchup lines for the fighter's attack and armor type, generated from the damage matrix. */
  private matchupLines(def: ReturnType<typeof fighterById>): string[] {
    const armorTypes = Object.keys(DAMAGE_MATRIX[def.attackType]) as ArmorType[];
    const attackTypes = Object.keys(DAMAGE_MATRIX) as AttackType[];

    const strong = armorTypes.filter((a) => damageMultiplier(def.attackType, a) > 1).map(armLabel);
    const weak = armorTypes.filter((a) => damageMultiplier(def.attackType, a) < 1).map(armLabel);
    const atkParts: string[] = [];
    if (strong.length > 0) atkParts.push(t('matchup.strongVs', { list: strong.join(', ') }));
    if (weak.length > 0) atkParts.push(t('matchup.weakVs', { list: weak.join(', ') }));
    if (atkParts.length === 0) atkParts.push(t('matchup.neutral'));

    const vulnerable = attackTypes.filter((a) => damageMultiplier(a, def.armorType) > 1).map(atkLabel);
    const resists = attackTypes.filter((a) => damageMultiplier(a, def.armorType) < 1).map(atkLabel);
    const armParts: string[] = [];
    if (vulnerable.length > 0) armParts.push(t('matchup.takesMore', { list: vulnerable.join(', ') }));
    if (resists.length > 0) armParts.push(t('matchup.takesLess', { list: resists.join(', ') }));
    if (armParts.length === 0) armParts.push(t('matchup.neutral'));

    return [
      `${atkLabel(def.attackType)}: ${atkParts.join(' · ')}`,
      `${armLabel(def.armorType)}: ${armParts.join(' · ')}`
    ];
  }

  private showFighterInfo(defId: string): void {
    const def = fighterById(defId);
    const [b, up] = def.tiers;
    const state = this.sim.state;
    const vsWaveLine =
      state.phase === 'build'
        ? [
            t('popup.vsWave', {
              n: state.waveNumber,
              mult: offenseMultVsWave(def.attackType, state.waveNumber).toFixed(2).replace(/\.?0+$/, '')
            })
          ]
        : [];
    this.infoTitle.setText(`${fighterTierName(def, 0)}  (${roleLabel(def.role)})`);
    this.infoBody.setText(
      [
        t('popup.attackArmor', { atk: atkLabel(def.attackType), arm: armLabel(def.armorType) }),
        `${fighterDesc(def)}`,
        '',
        t('popup.base', { cost: b.cost }),
        `  ${t('popup.statLine', { hp: b.hp, dmg: b.damage, as: b.attackSpeed, range: b.range })}`,
        '',
        t('popup.upgrade', { name: fighterTierName(def, 1), cost: up.cost }),
        `  ${t('popup.statLine', { hp: up.hp, dmg: up.damage, as: up.attackSpeed, range: up.range })}`,
        '',
        ...this.matchupLines(def),
        ...vsWaveLine,
        '',
        t('common.tapToClose')
      ].join('\n')
    );
    this.infoPopup.setVisible(true);
  }

  // ---------- post-wave report ----------

  private createReportPanel(): void {
    const bg = this.add
      .rectangle(0, 0, 420, 158, 0x1a2030, 0.97)
      .setStrokeStyle(2, COLORS.panelStroke)
      .setInteractive();
    bg.on('pointerdown', () => this.hideReport());
    this.reportTitle = txt(this, 0, -60, '', 15).setOrigin(0.5, 0).setFontStyle('bold');
    this.reportBody = txt(this, -194, -32, '', 12, '#c8d2e8', { lineSpacing: 6 });
    this.reportPanel = this.add
      .container(L.width / 2, 400, [bg, this.reportTitle, this.reportBody])
      .setDepth(DEPTH_POPUP)
      .setVisible(false);
  }

  private hideReport(): void {
    this.reportPanel.setVisible(false);
    if (this.reportHideTimer) {
      this.reportHideTimer.remove();
      this.reportHideTimer = null;
    }
  }

  private showWaveReport(): void {
    const state = this.sim.state;
    const report = state.waveReport;
    if (!report) return;
    const humanTeam = this.humanTeamId();
    const enemyTeam = state.teamOrder.find((tid) => tid !== humanTeam)!;

    const lines: string[] = [];
    for (const pid of state.playerOrder) {
      const p = state.players[pid];
      const entry = report.perPlayer[pid];
      if (!entry) continue;
      lines.push(
        entry.leaks > 0
          ? t('report.leaksLine', { name: playerName(p), n: entry.leaks })
          : t('report.noLeaks', { name: playerName(p) })
      );
    }
    lines.push('');
    lines.push(
      t('report.kingDmg', {
        own: report.kingDamage[humanTeam] ?? 0,
        enemy: report.kingDamage[enemyTeam] ?? 0
      })
    );
    lines.push(t('report.income', { n: report.perPlayer[state.humanPlayerId]?.incomePaid ?? 0 }));

    this.reportTitle.setText(t('report.title', { n: report.waveNumber }));
    this.reportBody.setText(lines.join('\n'));
    this.reportPanel.setVisible(true);
    if (this.reportHideTimer) this.reportHideTimer.remove();
    this.reportHideTimer = this.time.delayedCall(6000, () => this.hideReport());
  }

  // ---------- other-lane peek overlay ----------

  private createPeekOverlay(): void {
    const shade = this.add
      .rectangle(L.width / 2, L.height / 2, L.width, L.height, 0x000000, 0.7)
      .setInteractive();
    shade.on('pointerdown', () => {
      this.peekOverlay.setVisible(false);
      this.peekPid = null;
    });
    const panel = this.add.rectangle(L.width / 2, 470, 300, 520, 0x141824, 0.98).setStrokeStyle(2, COLORS.panelStroke);
    this.peekTitle = txt(this, L.width / 2, 195, '', 15).setOrigin(0.5).setFontStyle('bold');
    this.peekGfx = this.add.graphics();
    const hint = txt(this, L.width / 2, 745, t('common.tapToClose'), 11, COLORS.textDim).setOrigin(0.5);
    this.peekOverlay = this.add
      .container(0, 0, [shade, panel, this.peekTitle, this.peekGfx, hint])
      .setDepth(DEPTH_POPUP + 1)
      .setVisible(false);
  }

  private showPeek(pid: string): void {
    this.peekPid = pid;
    const p = this.sim.state.players[pid];
    this.peekTitle.setText(`${playerName(p)} — ${factionName(factionById(p.factionId))}`);
    this.peekOverlay.setVisible(true);
  }

  private drawPeek(): void {
    if (!this.peekPid || !this.peekOverlay.visible) return;
    const state = this.sim.state;
    const p = state.players[this.peekPid];
    const g = this.peekGfx;
    const px = L.width / 2 - 130;
    const py = 220;
    const pw = 260;
    const ph = 480;
    g.clear();
    g.fillStyle(0x1d2434, 1).fillRect(px, py, pw, ph);
    g.fillStyle(COLORS.buildZone, 1).fillRect(
      px,
      py + (CFG.grid.buildRowStart / CFG.grid.rows) * ph,
      pw,
      ((CFG.grid.buildRowEnd - CFG.grid.buildRowStart + 1) / CFG.grid.rows) * ph
    );
    g.lineStyle(1, COLORS.gridLine, 0.8).strokeRect(px, py, pw, ph);

    const factionColor = factionById(p.factionId).color;
    for (const u of state.units.values()) {
      if (u.zoneId !== p.laneId || u.state === 'dead') continue;
      const x = px + (u.pos.x / CFG.grid.cols) * pw;
      const y = py + (u.pos.y / CFG.grid.rows) * ph;
      if (u.kind === 'fighter') {
        g.fillStyle(factionColor, 1).fillCircle(x, y, u.tier === 1 ? 7 : 5.5);
      } else {
        g.fillStyle(COLORS.hostile, 1).fillCircle(x, y, Math.max(4, u.collisionRadius * 14));
      }
    }
  }

  // ---------- event effects ----------

  private zoneVisible(zoneId: string): boolean {
    return zoneId === this.humanLaneId() || zoneId === arenaZoneId(this.humanTeamId());
  }

  private screenOf(zoneId: string, pos: { x: number; y: number }): { x: number; y: number } {
    return zoneId === this.humanLaneId() ? laneToScreen(pos) : arenaToScreen(pos);
  }

  private projectileColor(attackType: AttackType): number {
    switch (attackType) {
      case 'magic':
        return 0x9ad0ff;
      case 'pierce':
        return 0xe8e0a0;
      case 'pure':
        return 0xfff0a0;
      case 'impact':
      default:
        return 0xd8d8d8;
    }
  }

  private playHitImpact(attackType: AttackType, x: number, y: number): void {
    this.playEffectSprite(hitEffectKey(attackType), x, y, 34);
    const ring = this.add
      .circle(x, y, attackType === 'impact' ? 8 : 6, this.projectileColor(attackType), 0.28)
      .setDepth(DEPTH_FX);
    this.tweens.add({
      targets: ring,
      scale: attackType === 'impact' ? 2.2 : 1.8,
      alpha: 0,
      duration: 180,
      onComplete: () => ring.destroy()
    });
  }

  private playMeleeSlash(from: { x: number; y: number }, to: { x: number; y: number }, attackType: AttackType): void {
    const g = this.add.graphics().setDepth(DEPTH_FX);
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const px = (-dy / len) * 11;
    const py = (dx / len) * 11;
    g.lineStyle(3, this.projectileColor(attackType), 0.82);
    g.beginPath();
    g.moveTo(mx - px, my - py);
    g.lineTo(mx + px, my + py);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 130, onComplete: () => g.destroy() });
  }

  private createProjectile(from: { x: number; y: number }, attackType: AttackType): Phaser.GameObjects.GameObject {
    const color = this.projectileColor(attackType);
    if (attackType === 'pierce') {
      return this.add.rectangle(from.x, from.y, 12, 3, color, 0.95).setDepth(DEPTH_FX);
    }
    if (attackType === 'magic') {
      return this.add.star(from.x, from.y, 5, 2.5, 6, color, 0.95).setDepth(DEPTH_FX);
    }
    if (attackType === 'pure') {
      return this.add.circle(from.x, from.y, 4.5, color, 0.95).setStrokeStyle(1, 0xffffff, 0.8).setDepth(DEPTH_FX);
    }
    return this.add.rectangle(from.x, from.y, 7, 7, color, 0.9).setDepth(DEPTH_FX);
  }

  private playEffectSprite(key: string, x: number, y: number, size: number, duration = 230): void {
    const fx = this.add.image(x, y, key).setDisplaySize(size, size).setDepth(DEPTH_FX).setAlpha(0.95);
    const targetScaleX = fx.scaleX;
    const targetScaleY = fx.scaleY;
    fx.setScale(targetScaleX * 0.72, targetScaleY * 0.72);
    this.tweens.add({
      targets: fx,
      scaleX: targetScaleX * 1.12,
      scaleY: targetScaleY * 1.12,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => fx.destroy()
    });
  }

  /** The visible crystal at the top of the static king's sceptre. */
  private kingScepterTip(zoneId: string, pos: { x: number; y: number }): { x: number; y: number } {
    const king = this.screenOf(zoneId, pos);
    return { x: king.x + 27, y: king.y - 41 };
  }

  /** Small response on the existing high-detail king asset; it does not replace the asset. */
  private pulseKing(unitId: number, damaged = false): void {
    const view = this.views.get(unitId);
    if (!view) return;
    const body = view.body as Phaser.GameObjects.Image;
    if (!(body instanceof Phaser.GameObjects.Image)) return;
    body.setTint(damaged ? 0xffb2b9 : 0xb9edff);
    this.tweens.add({
      targets: view.root,
      scale: damaged ? 1.035 : 1.025,
      duration: 80,
      yoyo: true
    });
    this.time.delayedCall(damaged ? 170 : 210, () => {
      if (body.active) body.clearTint();
    });
  }

  private kingCastFlash(from: { x: number; y: number }, strong = false): void {
    const glow = this.add.circle(from.x, from.y, strong ? 14 : 9, 0x48cfff, 0.42).setDepth(DEPTH_FX);
    const core = this.add.star(from.x, from.y, 4, strong ? 5 : 3, strong ? 13 : 9, 0xeaffff, 0.98).setDepth(DEPTH_FX);
    this.tweens.add({ targets: glow, scale: strong ? 2.8 : 2.1, alpha: 0, duration: strong ? 240 : 150, onComplete: () => glow.destroy() });
    this.tweens.add({ targets: core, scale: 0.35, alpha: 0, duration: strong ? 210 : 120, onComplete: () => core.destroy() });
  }

  /** Draws a readable, hand-drawn lightning path without relying on raster chroma keying. */
  private strokeKingArc(g: Phaser.GameObjects.Graphics, from: { x: number; y: number }, to: { x: number; y: number }, width: number, color: number, alpha: number): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    const steps = Math.max(3, Math.min(8, Math.round(length / 22)));
    g.lineStyle(width, color, alpha);
    g.beginPath();
    g.moveTo(from.x, from.y);
    for (let i = 1; i < steps; i++) {
      const progress = i / steps;
      const offset = Phaser.Math.FloatBetween(-7, 7) * Math.sin(progress * Math.PI);
      g.lineTo(from.x + dx * progress + nx * offset, from.y + dy * progress + ny * offset);
    }
    g.lineTo(to.x, to.y);
    g.strokePath();
  }

  private kingImpact(at: { x: number; y: number }, strong = false): void {
    const ring = this.add.circle(at.x, at.y, strong ? 13 : 9, 0x58d9ff, 0.28).setStrokeStyle(1.5, 0xe9ffff, 0.95).setDepth(DEPTH_FX);
    const spark = this.add.star(at.x, at.y, 5, strong ? 4 : 3, strong ? 17 : 11, 0xf5ffff, 0.96).setDepth(DEPTH_FX);
    this.tweens.add({ targets: ring, scale: strong ? 2.35 : 1.8, alpha: 0, duration: strong ? 270 : 180, onComplete: () => ring.destroy() });
    this.tweens.add({ targets: spark, scale: 0.45, alpha: 0, duration: strong ? 230 : 150, onComplete: () => spark.destroy() });
  }

  /** Single-target Royal Arc: the king's normal, clearly visible attack. */
  private playKingBolt(from: { x: number; y: number }, to: { x: number; y: number }, strong = false): void {
    this.kingCastFlash(from, strong);
    const arc = this.add.graphics().setDepth(DEPTH_FX);
    this.strokeKingArc(arc, from, to, strong ? 8 : 5, 0x126ee8, 0.5);
    this.strokeKingArc(arc, from, to, strong ? 3.2 : 2, 0xbffbff, 0.98);
    this.tweens.add({ targets: arc, alpha: 0, duration: strong ? 260 : 160, onComplete: () => arc.destroy() });
    this.time.delayedCall(strong ? 70 : 45, () => this.kingImpact(to, strong));
  }

  /** Mana chain spell: strong primary arc plus short, readable jumps between leaked creeps. */
  private playKingChain(from: { x: number; y: number }, targets: Array<{ x: number; y: number }>): void {
    if (targets.length === 0) return;
    this.kingCastFlash(from, true);
    const arc = this.add.graphics().setDepth(DEPTH_FX);
    let previous = from;
    for (const target of targets) {
      this.strokeKingArc(arc, previous, target, previous === from ? 7 : 5, 0x146fe7, 0.52);
      this.strokeKingArc(arc, previous, target, previous === from ? 2.8 : 2.1, 0xd4ffff, 0.98);
      this.kingImpact(target, previous === from);
      previous = target;
    }
    this.tweens.add({ targets: arc, alpha: 0, duration: 300, onComplete: () => arc.destroy() });
  }

  /** Mana AOE spell: rune telegraph followed by compact sky-lances at the affected leak group. */
  private playKingSigil(center: { x: number; y: number }, targets: Array<{ x: number; y: number }>, radius: number): void {
    const sigil = this.add.graphics().setDepth(DEPTH_FX);
    const screenRadius = Math.max(30, radius * 27);
    sigil.lineStyle(3, 0x1577e6, 0.5).strokeCircle(center.x, center.y, screenRadius);
    sigil.lineStyle(1.5, 0xc5ffff, 0.95).strokeCircle(center.x, center.y, screenRadius * 0.73);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = center.x + Math.cos(a) * screenRadius * 0.73;
      const y = center.y + Math.sin(a) * screenRadius * 0.73;
      sigil.fillStyle(0xe2ffff, 0.98).fillCircle(x, y, 2.2);
    }
    this.tweens.add({ targets: sigil, scale: 1.12, alpha: 0, duration: 440, onComplete: () => sigil.destroy() });
    const strikes = targets.length > 0 ? targets : [center];
    for (const [index, target] of strikes.entries()) {
      this.time.delayedCall(90 + index * 45, () => {
        const pillar = this.add.rectangle(target.x, target.y - 31, 6, 74, 0x6fe9ff, 0.82).setDepth(DEPTH_FX);
        pillar.setStrokeStyle(1, 0xf2ffff, 0.98);
        this.tweens.add({ targets: pillar, scaleX: 2.2, alpha: 0, duration: 190, onComplete: () => pillar.destroy() });
        this.kingImpact(target, true);
      });
    }
  }

  private setFighterFrame(unitId: number, frame: keyof typeof FIGHTER_SHEET_FRAME, resetDelay = 180): void {
    const view = this.views.get(unitId);
    const unit = this.sim.state.units.get(unitId);
    if (!view?.spriteBody || unit?.kind !== 'fighter') return;
    const sheet = fighterSheet(unit.defId);
    if (!sheet) return;
    view.resetFrameTimer?.remove();
    const anim = frame === 'attack' || frame === 'death' ? frame : undefined;
    const animConfig = anim ? sheet.anims?.[anim] : undefined;
    if (anim && animConfig) {
      view.fighterAnim = anim;
      view.spriteBody.play(fighterSheetAnimKey(sheet, anim), false);
      resetDelay = Math.max(resetDelay, ((animConfig.end - animConfig.start + 1) / animConfig.frameRate) * 1000 + 40);
    } else {
      view.fighterAnim = undefined;
      view.spriteBody.stop();
      view.spriteBody.setFrame(fighterSheetFrame(sheet, frame));
    }
    if (frame === 'idle') {
      view.resetFrameTimer = undefined;
      return;
    }
    view.resetFrameTimer = this.time.delayedCall(resetDelay, () => {
      if (view.spriteBody?.active) {
        view.spriteBody.stop();
        view.spriteBody.setFrame(fighterSheetFrame(sheet, 'idle'));
        view.fighterAnim = undefined;
      }
      view.resetFrameTimer = undefined;
    });
  }

  private refreshFighterAnim(u: CombatUnit, view: UnitView): void {
    const sheet = fighterSheet(u.defId);
    if (!view.spriteBody || !sheet?.anims?.walk || view.resetFrameTimer) return;
    if (u.state === 'moving') {
      if (view.fighterAnim !== 'walk' || !view.spriteBody.anims.isPlaying) {
        view.fighterAnim = 'walk';
        view.spriteBody.play(fighterSheetAnimKey(sheet, 'walk'), true);
      }
      return;
    }
    if (view.fighterAnim === 'walk') {
      view.spriteBody.stop();
      view.spriteBody.setFrame(fighterSheetFrame(sheet, 'idle'));
      view.fighterAnim = undefined;
    }
  }

  private refreshKingFrame(_u: CombatUnit, _view: UnitView): void {
    // The high-detail king is intentionally a static image. Attack feedback is handled by pulseKing().
  }

  private setKingFrame(unitId: number, frame: KingSheetFrame, _resetDelay = 220): void {
    const view = this.views.get(unitId);
    const unit = this.sim.state.units.get(unitId);
    if (!view || unit?.kind !== 'king') return;
    this.pulseKing(unitId, frame === 'damaged');
  }

  private playWaveAnim(unitId: number, anim: WaveSheetAnim): void {
    const unit = this.sim.state.units.get(unitId);
    const view = this.views.get(unitId);
    if (!unit || unit.kind !== 'creep' || !view?.spriteBody) return;
    const sheet = waveSheet(unit.defId);
    if (!sheet) return;
    view.waveAnim = anim;
    view.spriteBody.play(waveSheetAnimKey(sheet, anim), anim === 'walk');
  }

  private refreshWaveAnim(u: CombatUnit, view: UnitView): void {
    if (!view.spriteBody || view.deathUntil || !waveSheet(u.defId)) return;
    if (u.state === 'attacking') return;
    if (view.waveAnim !== 'walk' || !view.spriteBody.anims.isPlaying) this.playWaveAnim(u.id, 'walk');
  }

  private handleEvents(events: GameEvent[]): void {
    for (const ev of events) {
      switch (ev.type) {
        case 'attack': {
          if (!this.zoneVisible(ev.zoneId)) break;
          sfx.play('hit');
          const to = this.screenOf(ev.zoneId, ev.toPos);
          const attacker = this.sim.state.units.get(ev.fromId);
          const playHit = () => this.playHitImpact(ev.attackType, to.x, to.y);
          this.playWaveAnim(ev.fromId, 'attack');
          this.setFighterFrame(ev.fromId, 'attack', 180);
          this.setFighterFrame(ev.toId, 'hit', 150);
          this.setKingFrame(ev.fromId, 'brace', 180);
          this.setKingFrame(ev.toId, 'damaged', 170);
          if (attacker?.kind === 'king') {
            this.playKingBolt(this.kingScepterTip(ev.zoneId, ev.fromPos), to);
            break;
          }
          if (ev.ranged) {
            const from = this.screenOf(ev.zoneId, ev.fromPos);
            const proj = this.createProjectile(from, ev.attackType);
            this.tweens.add({
              targets: proj,
              x: to.x,
              y: to.y,
              rotation: ev.attackType === 'pierce' ? Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y) : Math.PI,
              duration: ev.attackType === 'magic' ? 170 : 130,
              onComplete: () => {
                proj.destroy();
                playHit();
              }
            });
          } else {
            const view = this.views.get(ev.fromId);
            if (view) {
              this.tweens.add({ targets: view.root, scale: 1.22, duration: 70, yoyo: true });
            }
            this.playMeleeSlash(this.screenOf(ev.zoneId, ev.fromPos), to, ev.attackType);
            playHit();
          }
          // Per-unit signatures keep the shared combat rules readable without changing balance.
          if (attacker?.defId === 'shield_guard') {
            const ring = this.add.circle(to.x, to.y, 14, 0x78b9ff, 0.18).setDepth(DEPTH_FX);
            this.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 180, onComplete: () => ring.destroy() });
          } else if (attacker?.defId === 'hammer_recruit') {
            const shock = this.add.rectangle(to.x, to.y, 26, 5, 0xd9a94d, 0.7).setDepth(DEPTH_FX);
            this.tweens.add({ targets: shock, scaleX: 2, alpha: 0, duration: 150, onComplete: () => shock.destroy() });
          } else if (attacker?.defId === 'ballista_scout') {
            const bolt = this.add.line(to.x, to.y, -16, 6, 16, -6, 0xddeeff, 0.95).setDepth(DEPTH_FX);
            this.tweens.add({ targets: bolt, alpha: 0, duration: 130, onComplete: () => bolt.destroy() });
          } else if (attacker?.defId === 'banner_bearer') {
            const pulse = this.add.circle(this.screenOf(ev.zoneId, ev.fromPos).x, this.screenOf(ev.zoneId, ev.fromPos).y, 10, 0x6f8fb5, 0.22).setDepth(DEPTH_FX);
            this.tweens.add({ targets: pulse, scale: 2.4, alpha: 0, duration: 260, onComplete: () => pulse.destroy() });
          } else if (attacker?.defId === 'steel_hound') {
            const streak = this.add.line(to.x, to.y, -20, 0, 8, 0, 0x94d8ff, 0.8).setDepth(DEPTH_FX);
            this.tweens.add({ targets: streak, alpha: 0, duration: 110, onComplete: () => streak.destroy() });
          } else if (attacker?.defId === 'fortress_golem') {
            const crater = this.add.circle(to.x, to.y, 18, 0x7d8a98, 0.18).setDepth(DEPTH_FX);
            this.tweens.add({ targets: crater, scale: 1.8, alpha: 0, duration: 240, onComplete: () => crater.destroy() });
          } else if (attacker?.factionId === 'ember') {
            const from = this.screenOf(ev.zoneId, ev.fromPos);
            const color = attacker.defId === 'sun_archer' ? 0xffdc72 : attacker.defId === 'ash_guard' ? 0x7b6258 : 0xff743b;
            const size = attacker.defId === 'phoenix_vessel' ? 20 : attacker.defId === 'ember_mage' ? 18 : 12;
            const flare = this.add.circle(to.x, to.y, size, color, 0.35).setDepth(DEPTH_FX);
            this.tweens.add({ targets: flare, scale: attacker.defId === 'ember_mage' ? 2.2 : 1.55, alpha: 0, duration: attacker.defId === 'fire_imp' ? 120 : 230, onComplete: () => flare.destroy() });
            if (attacker.defId === 'phoenix_vessel' || attacker.defId === 'sun_archer') {
              const trail = this.add.line((from.x + to.x) / 2, (from.y + to.y) / 2, -14, 0, 14, 0, color, 0.85).setDepth(DEPTH_FX).setRotation(Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y));
              this.tweens.add({ targets: trail, alpha: 0, duration: 180, onComplete: () => trail.destroy() });
            }
          } else if (attacker?.kind === 'creep') {
            const colors: Record<string, number> = {
              grubling: 0xb7e36b, stone_beetle: 0x9da6ad, swift_stalker: 0xd6e7ff,
              bulwark_brute: 0xd28c52, gloomspawn: 0x9d65d6, gloom_ogre: 0x7b4aa5,
              horde_runt: 0xe0bd75, horde_bruiser: 0xb56e49
            };
            const fx = this.add.circle(to.x, to.y, attacker.defId === 'bulwark_brute' || attacker.defId === 'gloom_ogre' ? 18 : 10, colors[attacker.defId] ?? 0xd9534f, 0.3).setDepth(DEPTH_FX);
            this.tweens.add({ targets: fx, scale: attacker.defId === 'swift_stalker' ? 1.8 : 1.35, alpha: 0, duration: attacker.defId === 'swift_stalker' ? 120 : 210, onComplete: () => fx.destroy() });
          }
          break;
        }
        case 'death': {
          if (!this.zoneVisible(ev.zoneId)) break;
          sfx.play('death');
          const sp = this.screenOf(ev.zoneId, ev.pos);
          const view = this.views.get(ev.unitId);
          if (ev.kind === 'creep' && view?.spriteBody) {
            this.playWaveAnim(ev.unitId, 'death');
            view.deathUntil = this.time.now + 420;
            this.tweens.add({
              targets: view.root,
              alpha: 0,
              duration: 420,
              onComplete: () => {
                view.root.destroy();
                this.views.delete(ev.unitId);
              }
            });
          }
          this.setFighterFrame(ev.unitId, 'death', 260);
          const puff = this.add
            .circle(sp.x, sp.y, 9, ev.kind === 'creep' ? COLORS.hostile : 0xbfcbe8, 0.8)
            .setDepth(DEPTH_FX);
          this.tweens.add({
            targets: puff,
            scale: 1.9,
            alpha: 0,
            duration: 260,
            onComplete: () => puff.destroy()
          });
          const unit = this.sim.state.units.get(ev.unitId);
          if (
            unit &&
            unit.kind === 'creep' &&
            unit.defenderPlayerId === this.sim.state.humanPlayerId &&
            unit.bounty >= 0.5
          ) {
            this.floatText(sp.x, sp.y - 12, `+${Math.round(unit.bounty)}g`, COLORS.gold);
          }
          break;
        }
        case 'leak': {
          if (ev.laneId === this.humanLaneId()) {
            sfx.play('leak');
            const flash = this.add
              .rectangle(L.lane.left, L.lane.top + (CFG.grid.rows - 1) * L.lane.cellH, L.lane.w, L.lane.cellH, 0xef5f6a, 0.45)
              .setOrigin(0)
              .setDepth(DEPTH_FX);
            this.tweens.add({ targets: flash, alpha: 0, duration: 420, onComplete: () => flash.destroy() });
            this.floatText(L.lane.left + L.lane.w / 2, L.lane.top + L.lane.h - 30, t('game.leak'), COLORS.danger);
          }
          break;
        }
        case 'kingSpell': {
          if (!this.zoneVisible(ev.zoneId)) break;
          sfx.play('kingSpell');
          const target = this.screenOf(ev.zoneId, ev.targetPos ?? ev.pos);
          const effectTargets = (ev.effectTargets ?? [ev.targetPos ?? ev.pos]).map((p) => this.screenOf(ev.zoneId, p));
          const kingId = this.sim.state.teams[ev.teamId]?.kingUnitId;
          if (kingId !== undefined) this.setKingFrame(kingId, 'brace', 260);
          const sceptre = this.kingScepterTip(ev.zoneId, ev.pos);
          if (ev.style === 'laser') {
            this.playKingBolt(sceptre, target, true);
          } else if (ev.style === 'chain') {
            this.playKingChain(sceptre, effectTargets);
          } else {
            this.kingCastFlash(sceptre, true);
            this.playKingSigil(target, effectTargets, ev.radius);
          }
          break;
        }
        case 'heal': {
          if (!this.zoneVisible(ev.zoneId)) break;
          sfx.play('heal');
          const sp = this.screenOf(ev.zoneId, ev.pos);
          this.playEffectSprite(SUPPORT_EFFECT_SPRITES.heal.key, sp.x, sp.y, 38, 360);
          this.floatText(sp.x, sp.y - 14, '+', COLORS.ok);
          break;
        }
      }
    }
  }

  private floatText(x: number, y: number, s: string, color: string): void {
    const t = txt(this, x, y, s, 12, color).setOrigin(0.5).setDepth(DEPTH_FX).setFontStyle('bold');
    this.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  // ---------- main loop ----------

  update(_time: number, delta: number): void {
    this.sim.update(delta);
    const state = this.sim.state;

    if (state.phase !== this.lastPhase) {
      if (state.phase === 'battle') {
        this.placementSelection = null;
        this.shop.clearSelection();
        this.hideActionMenu();
        this.shop.setMode('battle');
        this.hideReport();
        sfx.play('waveStart');
      } else if (state.phase === 'build') {
        this.shop.setMode('build');
        if (this.lastPhase === 'battle') {
          this.showWaveReport();
          sfx.play('buildStart');
        }
      }
      this.lastPhase = state.phase;
    }

    this.handleEvents(this.sim.drainEvents());
    this.syncUnits();
    this.drawMapOverlays();
    this.drawHighlights();
    this.topBar.update(state);
    const mythiumWhole = Math.floor(state.players[state.humanPlayerId].mythium);
    if (mythiumWhole > this.lastShownMythium) {
      this.lastShownMythium = mythiumWhole;
      this.floatText(L.board.left + 54, L.board.top + 790, '+1', COLORS.mythium);
    }
    this.statusCards.update(state);
    this.shop.update(state);
    if (this.actionMenu.visible) this.refreshActionMenu();
    this.drawPeek();

    if (state.phase === 'ended' && !this.endedHandled) {
      this.endedHandled = true;
      const win = state.winnerTeamId === this.humanTeamId();
      sfx.play(win ? 'victory' : 'defeat');
      this.time.delayedCall(1100, () => {
        this.scene.start('Result', {
          win,
          reason: state.winReason,
          wavesPlayed: state.waveNumber,
          setup: this.setup
        });
      });
    }
  }
}
