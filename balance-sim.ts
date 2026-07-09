/** Balancing harness: runs deterministic faction/economy strategy sweeps and writes diagnostics. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Simulation } from './src/core/Simulation';
import { FACTIONS } from './src/data/factions';
import { FIGHTERS, fighterById, fightersOfFaction } from './src/data/fighters';
import { CFG } from './src/data/gameConfig';
import { MERCENARIES } from './src/data/mercenaries';
import { WAVES, waveByNumber } from './src/data/waves';
import { kingOf } from './src/systems/KingSystem';
import { validCells } from './src/systems/PlacementSystem';
import { playerFighterValue } from './src/core/util';
import type { FighterDefinition } from './src/model/UnitDefinition';
import type { GameState, WaveReport } from './src/model/GameState';
import type { Role } from './src/model/Types';

type StrategyId =
  | 'no_workers'
  | 'single_worker_after_wave_1'
  | 'single_worker_after_wave_2'
  | 'worker_each_wave_after_1'
  | 'safe_worker'
  | 'greedy_workers';

interface Strategy {
  id: StrategyId;
  label: string;
  targetFactor: number;
}

interface WaveRow {
  faction: string;
  strategy: StrategyId;
  seed: number;
  wave: number;
  workersBefore: number;
  workersAfterBuild: number;
  workersAfterWave: number;
  goldBefore: number;
  goldAfterBuild: number;
  goldAfterWave: number;
  mythiumBefore: number;
  mythiumAfterBuild: number;
  mythiumAfterWave: number;
  incomeBefore: number;
  incomeAfterBuild: number;
  incomeAfterWave: number;
  valueBefore: number;
  valueAfterBuild: number;
  valueAfterWave: number;
  recommendedValue: number;
  leaks: number;
  kingDamage: number;
  battleSeconds: number;
  survivedWave: boolean;
  ended: boolean;
}

interface RunResult {
  faction: string;
  strategy: StrategyId;
  seed: number;
  waves: WaveRow[];
  finalWave: number;
  ended: boolean;
  winnerTeamId: string | null;
  humanKingHp: number;
}

const STRATEGIES: Strategy[] = [
  { id: 'no_workers', label: 'Spend all practical gold on defense', targetFactor: 1.25 },
  { id: 'single_worker_after_wave_1', label: 'Buy exactly one extra worker on wave 2, then defend', targetFactor: 1.08 },
  { id: 'single_worker_after_wave_2', label: 'Buy exactly one extra worker on wave 3, then defend', targetFactor: 1.08 },
  { id: 'worker_each_wave_after_1', label: 'Buy one worker every wave from wave 2 onward, then defend', targetFactor: 1.05 },
  { id: 'safe_worker', label: 'Defend to recommendation first, then buy one worker if affordable', targetFactor: 1.1 },
  { id: 'greedy_workers', label: 'Buy a worker whenever affordable before defense', targetFactor: 0.95 }
];

const SEEDS = Array.from({ length: 20 }, (_, i) => 1001 + i * 9973);
const OUT_DIR = join(process.cwd(), 'diagnostics', 'balance');
const HUMAN_PLAYER_ID = 'p1';

const ROLE_ROWS: Record<Role, number[]> = {
  tank: [4, 5],
  melee: [5, 6],
  ranged: [7, 8],
  aoe: [7, 8],
  support: [7, 6]
};
const COLS = [2, 3, 1, 4, 0, 5];

const fmt = (n: number): string => n.toFixed(2);

const csvEscape = (value: unknown): string => {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (rows: Record<string, unknown>[]): string => {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','))
  ].join('\n');
};

const affordable = (state: GameState, defs: FighterDefinition[]): FighterDefinition[] => {
  const gold = state.players[HUMAN_PLAYER_ID].gold;
  return defs.filter((d) => d.tiers[0].cost <= gold);
};

const fighterValueByRole = (state: GameState, role: Role): number => {
  let sum = 0;
  for (const u of state.units.values()) {
    if (u.kind === 'fighter' && u.ownerId === HUMAN_PLAYER_ID && u.role === role) {
      sum += u.investedGold;
    }
  }
  return sum;
};

const pickCell = (state: GameState, role: Role): { col: number; row: number } | null => {
  const laneId = state.players[HUMAN_PLAYER_ID].laneId;
  for (const row of ROLE_ROWS[role]) {
    for (const col of COLS) {
      if (state.lanes[laneId].grid[row][col] === null) return { col, row };
    }
  }
  return validCells(state, HUMAN_PLAYER_ID)[0] ?? null;
};

const wavePreferredAttacks = (waveNumber: number): Set<string> => {
  const wave = waveByNumber(waveNumber);
  const armorTypes = new Set(wave.groups.map((g) => g.stats.armorType));
  const preferred = new Set<string>();
  if (armorTypes.has('light')) preferred.add('pierce');
  if (armorTypes.has('armored')) preferred.add('impact');
  if (armorTypes.has('massive')) preferred.add('magic');
  if (preferred.size === 0) preferred.add('pure');
  return preferred;
};

const chooseFighter = (
  state: GameState,
  factionId: string,
  waveNumber: number,
  targetValue: number
): FighterDefinition | null => {
  const defs = affordable(state, fightersOfFaction(factionId));
  if (defs.length === 0) return null;

  const currentValue = playerFighterValue(state, HUMAN_PLAYER_ID);
  const tankValue = fighterValueByRole(state, 'tank');
  const needsTank = currentValue === 0 || tankValue < Math.max(45, currentValue * 0.34);
  const preferredAttacks = wavePreferredAttacks(waveNumber);
  const wave = waveByNumber(waveNumber);
  const enemyCount = wave.groups.reduce((sum, group) => sum + group.count, 0);

  const scored = defs.map((def) => {
    let score = def.tiers[0].cost;
    if (needsTank && def.role === 'tank') score += 120;
    if (!needsTank && def.role === 'tank') score -= 35;
    if (preferredAttacks.has(def.attackType)) score += 65;
    if (enemyCount >= 10 && def.role === 'aoe') score += 110;
    if (enemyCount <= 5 && def.role === 'aoe') score -= 50;
    if (currentValue > 140 && def.role === 'support') score += 35;
    if (currentValue + def.tiers[0].cost > targetValue + 80) score -= 25;
    return { def, score };
  });

  scored.sort((a, b) => b.score - a.score || b.def.tiers[0].cost - a.def.tiers[0].cost);
  return scored[0]?.def ?? null;
};

const buyOneFighter = (sim: Simulation, factionId: string, targetValue: number): boolean => {
  const state = sim.state;
  const pick = chooseFighter(state, factionId, state.waveNumber, targetValue);
  if (!pick) return false;
  const cell = pickCell(state, pick.role);
  if (!cell) return false;
  return sim.placeFighter(pick.id, cell.col, cell.row);
};

const buyDefenseToTarget = (sim: Simulation, factionId: string, targetValue: number): void => {
  let guard = 0;
  while (playerFighterValue(sim.state, HUMAN_PLAYER_ID) < targetValue && guard++ < 30) {
    if (!buyOneFighter(sim, factionId, targetValue)) break;
  }
};

const spendRemainingOnDefense = (sim: Simulation, factionId: string, targetValue: number): void => {
  let guard = 0;
  while (guard++ < 30) {
    if (!buyOneFighter(sim, factionId, targetValue)) break;
  }
};

const maybeBuyWorkerBeforeDefense = (sim: Simulation, strategy: Strategy): void => {
  const waveNumber = sim.state.waveNumber;
  const workers = sim.state.players[HUMAN_PLAYER_ID].workers;
  if (strategy.id === 'single_worker_after_wave_1' && waveNumber >= 2 && workers <= CFG.startWorkers) {
    sim.buyWorker();
  }
  if (strategy.id === 'single_worker_after_wave_2' && waveNumber >= 3 && workers <= CFG.startWorkers) {
    sim.buyWorker();
  }
  if (strategy.id === 'worker_each_wave_after_1' && waveNumber >= 2) sim.buyWorker();
  if (strategy.id === 'greedy_workers') sim.buyWorker();
};

const maybeBuyWorkerAfterDefense = (sim: Simulation, strategy: Strategy): void => {
  if (strategy.id !== 'safe_worker') return;
  const wave = waveByNumber(sim.state.waveNumber);
  const value = playerFighterValue(sim.state, HUMAN_PLAYER_ID);
  if (value >= wave.recommendedFighterValue && sim.state.players[HUMAN_PLAYER_ID].gold >= CFG.workerCost) {
    sim.buyWorker();
  }
};

const runBuildPlan = (sim: Simulation, factionId: string, strategy: Strategy): void => {
  const wave = waveByNumber(sim.state.waveNumber);
  const targetValue = wave.recommendedFighterValue * strategy.targetFactor;

  maybeBuyWorkerBeforeDefense(sim, strategy);
  buyDefenseToTarget(sim, factionId, targetValue);
  maybeBuyWorkerAfterDefense(sim, strategy);

  if (strategy.id === 'no_workers') {
    spendRemainingOnDefense(sim, factionId, targetValue + 220);
  }
};

const snapshot = (state: GameState) => {
  const p = state.players[HUMAN_PLAYER_ID];
  return {
    gold: p.gold,
    mythium: p.mythium,
    income: p.income,
    workers: p.workers,
    value: playerFighterValue(state, HUMAN_PLAYER_ID)
  };
};

const disableEnemyPressure = (state: GameState): void => {
  for (const pid of state.playerOrder) {
    if (pid === HUMAN_PLAYER_ID) continue;
    state.players[pid].isHuman = true;
    state.players[pid].autoSend = false;
    state.players[pid].pendingSends = [];
  }
  for (const teamId of state.teamOrder) {
    if (teamId === state.players[HUMAN_PLAYER_ID].teamId) continue;
    const king = kingOf(state, teamId);
    if (king) {
      king.maxHp = 999999;
      king.hp = 999999;
    }
  }
};

const runOne = (factionId: string, strategy: Strategy, seed: number): RunResult => {
  const sim = new Simulation({ mode: '1v1', difficulty: 'normal', playerFactionId: factionId, seed });
  disableEnemyPressure(sim.state);
  sim.toggleAutoSend();

  const rows: WaveRow[] = [];
  let builtForWave = 0;
  let beforeBuild = snapshot(sim.state);
  let afterBuild = snapshot(sim.state);
  let battleStartedAt = 0;

  for (let safety = 0; sim.state.phase !== 'ended' && safety < 90000; safety++) {
    const state = sim.state;
    if (state.phase === 'build' && builtForWave !== state.waveNumber) {
      builtForWave = state.waveNumber;
      beforeBuild = snapshot(state);
      runBuildPlan(sim, factionId, strategy);
      afterBuild = snapshot(state);
    }

    const phaseBefore = state.phase;
    const waveBefore = state.waveNumber;
    sim.update(250);
    sim.drainEvents();

    if (phaseBefore === 'build' && sim.state.phase === 'battle') {
      battleStartedAt = sim.state.time;
    }

    if (phaseBefore === 'battle' && (sim.state.phase === 'build' || sim.state.phase === 'ended')) {
      const report = sim.state.waveReport as WaveReport | null;
      const afterWave = snapshot(sim.state);
      const pReport = report?.perPlayer[HUMAN_PLAYER_ID];
      const playerTeam = sim.state.players[HUMAN_PLAYER_ID].teamId;
      const kingDamage = report?.kingDamage[playerTeam] ?? 0;
      rows.push({
        faction: factionId,
        strategy: strategy.id,
        seed,
        wave: waveBefore,
        workersBefore: beforeBuild.workers,
        workersAfterBuild: afterBuild.workers,
        workersAfterWave: afterWave.workers,
        goldBefore: beforeBuild.gold,
        goldAfterBuild: afterBuild.gold,
        goldAfterWave: afterWave.gold,
        mythiumBefore: beforeBuild.mythium,
        mythiumAfterBuild: afterBuild.mythium,
        mythiumAfterWave: afterWave.mythium,
        incomeBefore: beforeBuild.income,
        incomeAfterBuild: afterBuild.income,
        incomeAfterWave: afterWave.income,
        valueBefore: beforeBuild.value,
        valueAfterBuild: afterBuild.value,
        valueAfterWave: afterWave.value,
        recommendedValue: waveByNumber(waveBefore).recommendedFighterValue,
        leaks: pReport?.leaks ?? 0,
        kingDamage,
        battleSeconds: sim.state.time - battleStartedAt,
        survivedWave: sim.state.phase !== 'ended' || sim.state.winnerTeamId !== 'T2',
        ended: sim.state.phase === 'ended'
      });
    }
  }

  const king = kingOf(sim.state, sim.state.players[HUMAN_PLAYER_ID].teamId);
  return {
    faction: factionId,
    strategy: strategy.id,
    seed,
    waves: rows,
    finalWave: rows.at(-1)?.wave ?? sim.state.waveNumber,
    ended: sim.state.phase === 'ended',
    winnerTeamId: sim.state.winnerTeamId,
    humanKingHp: king?.hp ?? 0
  };
};

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const percentile = (values: number[], pct: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[idx];
};

const summarize = (runs: RunResult[]) => {
  const rows = runs.flatMap((run) => run.waves);
  const byFactionStrategy = new Map<string, WaveRow[]>();
  const byFactionStrategyWave = new Map<string, WaveRow[]>();

  for (const row of rows) {
    const key = `${row.faction}|${row.strategy}`;
    byFactionStrategy.set(key, [...(byFactionStrategy.get(key) ?? []), row]);
    const waveKey = `${row.faction}|${row.strategy}|${row.wave}`;
    byFactionStrategyWave.set(waveKey, [...(byFactionStrategyWave.get(waveKey) ?? []), row]);
  }

  const strategySummary = [...byFactionStrategy.entries()].map(([key, group]) => {
    const [faction, strategy] = key.split('|');
    const finalWaves = runs
      .filter((run) => run.faction === faction && run.strategy === strategy)
      .map((run) => run.finalWave);
    const workerRows = group.filter((row) => row.workersAfterBuild > row.workersBefore);
    const workerLeakRows = workerRows.filter((row) => row.leaks > 0);
    return {
      faction,
      strategy,
      runs: new Set(group.map((row) => row.seed)).size,
      avgFinalWave: fmt(mean(finalWaves)),
      leakRatePct: fmt((group.filter((row) => row.leaks > 0).length / group.length) * 100),
      avgLeaksPerWave: fmt(mean(group.map((row) => row.leaks))),
      avgKingDamagePerWave: fmt(mean(group.map((row) => row.kingDamage))),
      avgWorkersWave5: fmt(mean(group.filter((row) => row.wave === 5).map((row) => row.workersAfterWave))),
      avgIncomeWave5: fmt(mean(group.filter((row) => row.wave === 5).map((row) => row.incomeAfterWave))),
      avgMythiumWave5: fmt(mean(group.filter((row) => row.wave === 5).map((row) => row.mythiumAfterWave))),
      workerBuyCount: workerRows.length,
      workerBuyLeakRatePct: workerRows.length === 0 ? '0.00' : fmt((workerLeakRows.length / workerRows.length) * 100)
    };
  });

  const waveSummary = [...byFactionStrategyWave.entries()].map(([key, group]) => {
    const [faction, strategy, wave] = key.split('|');
    const values = group.map((row) => row.valueAfterBuild);
    return {
      faction,
      strategy,
      wave: Number(wave),
      samples: group.length,
      leakRatePct: fmt((group.filter((row) => row.leaks > 0).length / group.length) * 100),
      avgLeaks: fmt(mean(group.map((row) => row.leaks))),
      avgKingDamage: fmt(mean(group.map((row) => row.kingDamage))),
      avgBattleSeconds: fmt(mean(group.map((row) => row.battleSeconds))),
      avgValue: fmt(mean(values)),
      p90Value: fmt(percentile(values, 90)),
      recommendedValue: group[0]?.recommendedValue ?? 0,
      avgWorkers: fmt(mean(group.map((row) => row.workersAfterWave))),
      avgIncome: fmt(mean(group.map((row) => row.incomeAfterWave)))
    };
  });

  return { rows, strategySummary, waveSummary };
};

const writeMarkdown = (
  strategySummary: Record<string, unknown>[],
  waveSummary: Record<string, unknown>[]
): void => {
  const worstWaves = [...waveSummary]
    .sort((a, b) => Number(b.leakRatePct) - Number(a.leakRatePct) || Number(b.avgLeaks) - Number(a.avgLeaks))
    .slice(0, 20);
  const workerPain = [...strategySummary]
    .filter((row) => row.strategy !== 'no_workers')
    .sort((a, b) => Number(b.workerBuyLeakRatePct) - Number(a.workerBuyLeakRatePct))
    .slice(0, 12);

  const lines = [
    '# Balance Simulation Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Scope',
    '',
    `- Factions: ${FACTIONS.map((f) => f.id).join(', ')}`,
    `- Strategies: ${STRATEGIES.map((s) => s.id).join(', ')}`,
    `- Seeds per faction/strategy: ${SEEDS.length}`,
    `- Waves: ${WAVES[0].waveNumber}-${WAVES.at(-1)?.waveNumber}`,
    '- Enemy pressure is disabled so this isolates base wave, faction, gold and worker economy pressure.',
    '- Human auto-send is enabled, so generated mythium becomes income sends whenever possible.',
    '',
    '## Strategy Summary',
    '',
    '| Faction | Strategy | Runs | Avg final wave | Leak rate | Avg leaks | Avg workers W5 | Avg income W5 | Worker-buy leak rate |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...strategySummary.map(
      (row) =>
        `| ${row.faction} | ${row.strategy} | ${row.runs} | ${row.avgFinalWave} | ${row.leakRatePct}% | ${row.avgLeaksPerWave} | ${row.avgWorkersWave5} | ${row.avgIncomeWave5} | ${row.workerBuyLeakRatePct}% |`
    ),
    '',
    '## Highest Leak Hotspots',
    '',
    '| Faction | Strategy | Wave | Samples | Leak rate | Avg leaks | Avg value | Recommended | Avg workers |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...worstWaves.map(
      (row) =>
        `| ${row.faction} | ${row.strategy} | ${row.wave} | ${row.samples} | ${row.leakRatePct}% | ${row.avgLeaks} | ${row.avgValue} | ${row.recommendedValue} | ${row.avgWorkers} |`
    ),
    '',
    '## Worker Risk Hotspots',
    '',
    '| Faction | Strategy | Worker buys | Worker-buy leak rate | Leak rate | Avg workers W5 | Avg income W5 |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ...workerPain.map(
      (row) =>
        `| ${row.faction} | ${row.strategy} | ${row.workerBuyCount} | ${row.workerBuyLeakRatePct}% | ${row.leakRatePct}% | ${row.avgWorkersWave5} | ${row.avgIncomeWave5} |`
    ),
    '',
    '## Files',
    '',
    '- `runs.json`: full per-run and per-wave data.',
    '- `waves.csv`: flat per-wave rows for spreadsheet analysis.',
    '- `strategy-summary.csv`: aggregated faction/strategy view.',
    '- `wave-summary.csv`: aggregated faction/strategy/wave view.',
    '',
    '## Current Tuning Inputs',
    '',
    `- Start gold: ${CFG.startGold}`,
    `- Start workers: ${CFG.startWorkers}`,
    `- Worker cost: ${CFG.workerCost}`,
    `- Mythium per worker per second: ${CFG.mythiumPerWorkerPerSec}`,
    `- Cheapest send: ${MERCENARIES[0].cost} mythium for +${MERCENARIES[0].incomeGain} income`,
    ''
  ];

  writeFileSync(join(OUT_DIR, 'report.md'), lines.join('\n'));
};

const main = (): void => {
  mkdirSync(OUT_DIR, { recursive: true });
  const runs: RunResult[] = [];

  for (const faction of FACTIONS) {
    for (const strategy of STRATEGIES) {
      for (const seed of SEEDS) {
        runs.push(runOne(faction.id, strategy, seed));
      }
    }
  }

  const { rows, strategySummary, waveSummary } = summarize(runs);
  writeFileSync(join(OUT_DIR, 'runs.json'), JSON.stringify({ strategies: STRATEGIES, seeds: SEEDS, runs }, null, 2));
  writeFileSync(join(OUT_DIR, 'waves.csv'), toCsv(rows as unknown as Record<string, unknown>[]));
  writeFileSync(join(OUT_DIR, 'strategy-summary.csv'), toCsv(strategySummary));
  writeFileSync(join(OUT_DIR, 'wave-summary.csv'), toCsv(waveSummary));
  writeMarkdown(strategySummary, waveSummary);

  console.log(`Wrote ${runs.length} runs and ${rows.length} wave rows to ${OUT_DIR}`);
  console.log(`Fighters covered: ${FIGHTERS.map((f) => fighterById(f.id).id).length}`);
}

main();
