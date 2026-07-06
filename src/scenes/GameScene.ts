import Phaser from 'phaser';
import { SUPPORT_EFFECT_SPRITES, hitEffectKey } from '../assets/effectSprites';
import { FIGHTER_SHEET_FRAME, fighterSheet } from '../assets/fighterSheets';
import { fighterSpriteKey } from '../assets/unitSprites';
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
}

const DEPTH_LANE_INPUT = 1;
const DEPTH_HIGHLIGHT = 2;
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
    const laneArenaTop = L.lane.top;
    const laneArenaH = L.arena.top + L.arena.h - laneArenaTop;
    this.add
      .image(L.lane.left, laneArenaTop, 'lane-arena-board')
      .setOrigin(0)
      .setDisplaySize(L.lane.w, laneArenaH);

    const g = this.add.graphics();
    const { left, top, cellW, cellH } = L.lane;
    const w = L.lane.w;
    const rowRect = (row: number, count: number, color: number, alpha: number) =>
      g.fillStyle(color, alpha).fillRect(left, top + row * cellH, w, cellH * count);

    rowRect(0, 1, COLORS.spawnZone, 0.1);
    rowRect(1, 3, COLORS.approachZone, 0.04);
    rowRect(CFG.grid.buildRowStart, CFG.grid.buildRowEnd - CFG.grid.buildRowStart + 1, COLORS.buildZone, 0.06);
    rowRect(CFG.grid.rows - 1, 1, COLORS.leakZone, 0.09);

    g.lineStyle(1, COLORS.gridLine, 0.28);
    for (let c = 0; c <= CFG.grid.cols; c++) {
      g.lineBetween(left + c * cellW, top, left + c * cellW, top + L.lane.h);
    }
    for (let r = 0; r <= CFG.grid.rows; r++) {
      g.lineBetween(left, top + r * cellH, left + w, top + r * cellH);
    }
    g.lineStyle(2, COLORS.panelStroke, 1).strokeRect(left, top, w, L.lane.h);

    txt(this, left + w / 2, top + cellH / 2, t('zone.spawn'), 10, '#c98a96').setOrigin(0.5).setAlpha(0.9);
    txt(this, left + w / 2, top + (CFG.grid.buildRowStart + 0.1) * cellH, t('zone.build'), 10, '#6f9a78')
      .setOrigin(0.5, 0)
      .setAlpha(0.7);
    txt(this, left + w / 2, top + (CFG.grid.rows - 0.5) * cellH, t('zone.leak'), 10, '#c98a96')
      .setOrigin(0.5)
      .setAlpha(0.9);

    // King arena strip.
    const a = L.arena;
    this.add.rectangle(a.left, a.top, a.w, a.h, 0x1c1f30, 0.12).setOrigin(0).setStrokeStyle(2, 0x5a5330);
    txt(this, a.left + 6, a.top + 4, t('zone.arena'), 10, '#c9b76a').setAlpha(0.9);
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
      radius = 17;
      hpBarW = 54;
      body = this.add.rectangle(0, 0, 34, 30, COLORS.king).setStrokeStyle(2, 0xffffff, 0.7);
      root.add(body);
      root.add(txt(this, 0, 0, '♛', 18, '#3a2f10').setOrigin(0.5));
    } else if (u.kind === 'fighter') {
      const faction = factionById(u.factionId ?? 'ironclad');
      const sheet = fighterSheet(u.defId);
      const spriteKey = fighterSpriteKey(u.defId);
      radius = u.tier === 1 ? 16 : 14;
      root.add(this.add.ellipse(0, radius - 2, radius * 1.55, 7, 0x05070b, 0.32));
      if (sheet) {
        if (u.tier === 1) {
          root.add(this.add.circle(0, 0, radius + 3, 0xf5c542, 0.18).setStrokeStyle(2, 0xf5c542, 0.75));
        }
        const sprite = this.add.sprite(0, 0, sheet.key, FIGHTER_SHEET_FRAME.idle).setDisplaySize(radius * 2.8, radius * 2.8);
        body = sprite;
        root.add(body);
      } else if (spriteKey) {
        if (u.tier === 1) {
          root.add(this.add.circle(0, 0, radius + 3, 0xf5c542, 0.18).setStrokeStyle(2, 0xf5c542, 0.75));
        }
        body = this.add.image(0, 0, spriteKey).setDisplaySize(radius * 2.55, radius * 2.55);
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
      const spriteKey = waveSpriteKey(u.defId);
      radius = Math.min(17, Math.max(8, u.collisionRadius * 33));
      hpBarW = Math.max(20, radius * 2.1);
      root.add(this.add.ellipse(0, radius - 2, radius * 1.6, 7, 0x05070b, 0.28));
      if (spriteKey) {
        const spriteSize = Math.max(30, radius * 3.15);
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
    }

    for (const [id, view] of this.views) {
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

  private setFighterFrame(unitId: number, frame: keyof typeof FIGHTER_SHEET_FRAME, resetDelay = 180): void {
    const view = this.views.get(unitId);
    if (!view?.spriteBody) return;
    view.resetFrameTimer?.remove();
    view.spriteBody.setFrame(FIGHTER_SHEET_FRAME[frame]);
    if (frame === 'idle') {
      view.resetFrameTimer = undefined;
      return;
    }
    view.resetFrameTimer = this.time.delayedCall(resetDelay, () => {
      if (view.spriteBody?.active) view.spriteBody.setFrame(FIGHTER_SHEET_FRAME.idle);
      view.resetFrameTimer = undefined;
    });
  }

  private handleEvents(events: GameEvent[]): void {
    for (const ev of events) {
      switch (ev.type) {
        case 'attack': {
          if (!this.zoneVisible(ev.zoneId)) break;
          sfx.play('hit');
          const to = this.screenOf(ev.zoneId, ev.toPos);
          const playHit = () => this.playEffectSprite(hitEffectKey(ev.attackType), to.x, to.y, 34);
          this.setFighterFrame(ev.fromId, 'attack', 180);
          this.setFighterFrame(ev.toId, 'hit', 150);
          if (ev.ranged) {
            const from = this.screenOf(ev.zoneId, ev.fromPos);
            const proj = this.add.circle(from.x, from.y, 3.5, this.projectileColor(ev.attackType)).setDepth(DEPTH_FX);
            this.tweens.add({
              targets: proj,
              x: to.x,
              y: to.y,
              duration: 130,
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
            playHit();
          }
          break;
        }
        case 'death': {
          if (!this.zoneVisible(ev.zoneId)) break;
          sfx.play('death');
          const sp = this.screenOf(ev.zoneId, ev.pos);
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
          const sp = this.screenOf(ev.zoneId, ev.pos);
          const ring = this.add.circle(sp.x, sp.y, 12, 0xf5c542, 0.35).setDepth(DEPTH_FX);
          this.tweens.add({
            targets: ring,
            scale: 5,
            alpha: 0,
            duration: 400,
            onComplete: () => ring.destroy()
          });
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

    this.syncUnits();
    this.drawHighlights();
    this.handleEvents(this.sim.drainEvents());
    this.topBar.update(state);
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
