/** Central tuning values. All gameplay balancing lives in data/, not in systems or UI. */
export const CFG = {
  grid: {
    cols: 6,
    rows: 10,
    /** Rows 4-8 are the build zone. Row 0 = spawn, rows 1-3 = approach, row 9 = leak gate. */
    buildRowStart: 4,
    buildRowEnd: 8,
    spawnCols: [1, 2, 3, 4],
    extraSpawnCol: 5
  },
  arena: {
    width: 6,
    height: 4,
    kingPos: { x: 2.75, y: 2.55 }
  },

  tickRate: 20,
  buildDuration: 30,
  maxBattleDuration: 90,
  maxWaves: 15,

  startGold: 130,
  startWorkers: 1,
  startIncome: 0,
  startMythium: 0,
  workerCost: 35,
  mythiumPerWorkerPerSec: 0.15,
  sellRefundRate: 0.7,

  /** Leaked creeps keep this fraction of their remaining HP. */
  leakHpFactor: 0.8,
  /** Gold the opposing lane player gets per leaked creep. */
  leakGoldBonus: 2,
  /** Gold per point of damage dealt to the enemy king (per opposing player). */
  kingDamageGoldRate: 0.01,

  king: {
    hp1v1: 6500,
    hp2v2: 10500,
    damage: 55,
    attackSpeed: 0.9,
    range: 2.4,
    aggroRadius: 3.2,
    collisionRadius: 0.55,
    regenBase: 4,
    manaMax: 100,
    manaRegen: 12,
    spellDamageBase: 120,
    spellRadius: 2.4
  },

  combat: {
    retargetInterval: 0.35,
    auraRefreshInterval: 0.5,
    /** Attack-speed slows can never reduce below this fraction. */
    minAttackSpeedFactor: 0.3,
    /** Extra threat bonus (distance discount) for tanks and for recent attackers. */
    tankThreatBonus: 1.5,
    recentDamageBonus: 0.8,
    /** New target must beat current target's score by this much before a creep switches. */
    retargetHysteresis: 0.7,
    /** Wildroot faction: fraction of max HP regenerated per second during battle. */
    wildrootRegenPct: 0.004,
    /** Ember faction: bonus multiplier on magic damage. */
    emberMagicBonus: 0.06,
    /** Ironclad faction: bonus max HP for tanks. */
    ironcladTankHpBonus: 0.08,
    /** Shadow faction on-hit slow. */
    shadowSlow: { pct: 0.03, duration: 3, maxStacks: 5 }
  },

  spawn: {
    waveInterval: 0.25,
    mercDelay: 0.75,
    mercInterval: 0.3
  },

  fighter: {
    collisionRadius: 0.3,
    aggro: { tank: 3.2, melee: 2.6, rangedBonus: 0.6, support: 1.6 },
    /** Ranged units advance at this fraction of move speed when out of range. */
    rangedAdvanceFactor: 0.6,
    /** Tanks never advance above this y while seeking (stay near the build zone edge). */
    tankMaxAdvanceY: 3.2,
    /** Fighters without a target gather near this defensive line instead of trickling in alone. */
    rallyMinY: 4.15,
    rallyLead: { melee: 1.15, ranged: 2.0 }
  },
  creep: {
    collisionRadius: 0.28,
    aggroRadius: 2.0
  }
};
