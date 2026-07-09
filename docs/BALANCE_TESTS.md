# Balance Test Scripts

This project has three headless scripts that can be run without Phaser rendering. They are meant to make balance changes measurable before checking the game feel in the browser.

## Quick Commands

```bash
npx -y tsx simcheck.ts
npm run balance:sim
npm run balance:experiments
```

`npm run build` should still be run after code or data changes, because the balance scripts do not validate Phaser scene wiring, assets, or browser packaging.

## `simcheck.ts`

Purpose: fast smoke test for the deterministic simulation.

What it does:
- Runs full matches in `1v1` and `2v2`.
- Covers `normal`, `hard`, and `easy` AI.
- Uses several player factions.
- Performs crude player actions during build phases: buys affordable fighters, then attempts a worker.
- Verifies that matches end, winners are set, combat happened, AI built fighters, AI economy/sends work, and king damage is consistent with leaks.

Use this when:
- A system-level gameplay change might break the simulation loop.
- Movement, combat, phase changes, AI building, sending, leaks, or king logic changed.

Limitations:
- It is not a player-fun test.
- It does not judge whether fighter prices, worker timing, or mercenary costs feel satisfying.
- The player build logic is intentionally crude, so leaking in this script is a warning signal, not a final balance verdict.

## `balance-sim.ts`

Purpose: deterministic faction/economy sweep for the current source balance.

Command:

```bash
npm run balance:sim
```

Output directory:

```text
diagnostics/balance/
```

Generated files:
- `runs.json`: full per-run and per-wave data.
- `waves.csv`: flat per-wave rows for spreadsheet analysis.
- `strategy-summary.csv`: aggregated faction/strategy view.
- `wave-summary.csv`: aggregated faction/strategy/wave view.
- `report.md`: generated markdown summary.

What it tests:
- All factions.
- Multiple economy strategies:
  - `no_workers`: spends practical gold on defense.
  - `single_worker_after_wave_1`: buys one extra worker from wave 2 onward.
  - `single_worker_after_wave_2`: buys one extra worker from wave 3 onward.
  - `worker_each_wave_after_1`: buys one worker every wave from wave 2 onward.
  - `safe_worker`: reaches recommended fighter value first, then buys one worker if affordable.
  - `greedy_workers`: buys a worker whenever affordable before defense.
- Multiple deterministic seeds.
- Isolated wave pressure: enemy pressure is disabled so the script focuses on base waves, player economy, faction fighter value, and worker timing.
- Human auto-send is enabled, so generated mythium is turned into sends/income whenever possible.

Important metrics:
- Leak rate per faction/strategy/wave.
- Average leaks per wave.
- King damage per wave.
- Fighter value after build.
- Recommended fighter value.
- Worker count and income by wave 5.
- Worker-buy leak rate.

Use this when:
- Changing fighter costs or early fighter stats.
- Changing worker cost, start gold, worker mythium rate, income pacing, or wave strength.
- Checking whether buying workers is punished too hard.

Limitations:
- It does not include normal AI pressure.
- The scripted buyer chooses fighters heuristically, not like a skilled human.
- It measures survival/economy pressure, not whether each round gives the player enough satisfying actions.

## `balance-experiments.ts`

Purpose: compare balance presets without permanently changing source data.

Command:

```bash
npm run balance:experiments
```

Output directory:

```text
diagnostics/balance-experiments/
```

Generated files:
- `waves.csv`: full flat per-wave rows.
- `preset-summary.csv`: top-level preset comparison.
- `strategy-summary.csv`: preset/scenario/faction/strategy breakdown.
- `report.md`: generated markdown summary.

What it tests:
- Presets such as:
  - current source balance.
  - previous reference values.
  - lower worker cost.
  - higher mythium generation.
  - higher start gold.
  - selected wave adjustments.
- Two scenarios:
  - `isolated_waves`: enemy pressure disabled.
  - `normal_ai_pressure`: regular AI pressure included.
- Same broad strategy family as `balance-sim.ts`.

Important metrics:
- Overall leak rate.
- Early wave leak rate.
- No-worker leak rate.
- Early-worker leak rate.
- Safe-worker leak rate.
- Greedy-worker leak rate.
- Worker-buy leak rate.
- Average workers by wave 5.
- Average income by wave 8.
- Faction leak spread.
- Average king damage.

Use this when:
- Comparing possible economy patches before editing `src/data/`.
- Testing whether a lower worker cost or higher mythium rate improves the early loop.
- Testing whether a wave nerf solves leaks without making no-worker defense too strong.

Limitations:
- Presets are hardcoded in the script, so new hypotheses must be added there.
- It is good for comparing directions, not for declaring final tuning.
- A preset that wins the table still needs mobile playtesting.

## Current Balance Questions To Investigate

The current player-feel concern is that the early loop may be too restrictive:
- Fighter/tower prices may be too high relative to early income.
- Players often feel they can build at most one fighter or one worker per round.
- Buying workers may be punished by leaks too often.
- Mythium pacing may feel flat because the cheapest send is reachable, but the next meaningful send jumps from 20 to 60 mythium and later sends are even farther away.
- The player needs more satisfying decisions per round: build, worker, send, upgrade, or save should all feel like real options instead of forced scarcity.

Suggested next analysis:
- Compare current fighter costs against early wave recommended value and actual gold available per wave.
- Check whether each faction has at least two affordable useful build choices in waves 1-4.
- Check how often a reasonable player can buy a worker without immediately leaking.
- Check whether mercenary costs should have smaller steps, especially between 20 and 60 mythium.
- Consider whether early waves should be balanced around letting the player buy both a small fighter and a worker sometimes, not always choosing only one action.

## Source Files Most Relevant For Balance

- `src/data/gameConfig.ts`: start gold, worker cost, mythium rate, leak rules, king stats.
- `src/data/fighters.ts`: fighter costs, stats, upgrades, roles.
- `src/data/waves.ts`: wave count, HP, damage, armor, recommended fighter value.
- `src/data/mercenaries.ts`: mythium costs, income reward, send stats.
- `src/data/damageMatrix.ts`: attack-vs-armor multipliers.
- `src/data/aiProfiles.ts`: AI build/send/economy behavior.
- `src/core/Simulation.ts`: deterministic headless simulation facade.
