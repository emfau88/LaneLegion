import { ARENA_ENCOUNTERS } from '../data/arenaEncounters';
import { createArenaBattle } from '../model/createArenaBattle';
import {
  advanceArenaRun,
  arenaRunPlacements,
  buyArenaOffer,
  cloneArenaRun,
  createArenaRun,
  deployArenaFighter,
  deployedFighters,
  fieldLimitForFight,
  rerollArenaShop,
  reserveFighters,
  upgradeArenaFighter
} from '../model/ArenaRunSystem';
import type { ArenaPlacement } from '../model/ArenaTypes';
import { drainArenaEvents, startArenaBattle, tickArenaBattle } from '../systems/ArenaBattleSystem';

const layouts: Record<string, ArenaPlacement[]> = {
  protected: [
    { definitionId: 'shield_guard', col: 3, row: 3 },
    { definitionId: 'ranger', col: 1, row: 5 },
    { definitionId: 'fire_mage', col: 5, row: 5 },
    { definitionId: 'healer', col: 3, row: 5 }
  ],
  exposedBackline: [
    { definitionId: 'shield_guard', col: 6, row: 5 },
    { definitionId: 'ranger', col: 1, row: 3 },
    { definitionId: 'fire_mage', col: 3, row: 3 },
    { definitionId: 'healer', col: 0, row: 3 }
  ],
  tightCenter: [
    { definitionId: 'shield_guard', col: 3, row: 3 },
    { definitionId: 'ranger', col: 2, row: 4 },
    { definitionId: 'fire_mage', col: 4, row: 4 },
    { definitionId: 'healer', col: 3, row: 4 }
  ],
  splitCorners: [
    { definitionId: 'shield_guard', col: 0, row: 3 },
    { definitionId: 'ranger', col: 0, row: 5 },
    { definitionId: 'fire_mage', col: 6, row: 5 },
    { definitionId: 'healer', col: 6, row: 3 }
  ]
};

interface Result {
  outcome: string;
  time: number;
  playerSurvivors: string[];
  enemySurvivors: string[];
}

const simulate = (placements: ArenaPlacement[], fightIndex = 0): Result => {
  const state = createArenaBattle(placements, fightIndex);
  startArenaBattle(state);
  while (state.phase === 'battle') {
    tickArenaBattle(state, 1 / 30);
    drainArenaEvents(state);
  }
  return {
    outcome: state.phase,
    time: Number(state.time.toFixed(2)),
    playerSurvivors: state.units.filter((unit) => unit.team === 'player' && unit.alive).map((unit) => unit.definitionId),
    enemySurvivors: state.units.filter((unit) => unit.team === 'enemy' && unit.alive).map((unit) => unit.definitionId)
  };
};

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(message);
};

const formationResults = Object.entries(layouts).map(([name, placements]) => {
  const first = simulate(placements, 2);
  const second = simulate(placements, 2);
  assert(JSON.stringify(first) === JSON.stringify(second), `${name} is not deterministic`);
  return { name, ...first };
});

const verifyRunEconomy = (): void => {
  const run = createArenaRun();
  assert(run.fighters.length === 1 && deployedFighters(run).length === 1, 'A run must begin with one starter fighter');
  assert(fieldLimitForFight(run.fightIndex) === 2, 'Fight one must have a two-fighter team cap');
  assert(run.shopOffers.length === 3, 'Shop must begin with exactly three offers');
  const beforeReroll = run.shopOffers.map((offer) => offer.definitionId).join(',');
  assert(rerollArenaShop(run), 'The first reroll should succeed');
  assert(run.rerollsLeft === 0 && run.gold === 4, 'Reroll must cost one gold and be usable once');
  assert(run.shopOffers.map((offer) => offer.definitionId).join(',') !== beforeReroll, 'Reroll must change the offers');
  assert(!rerollArenaShop(run), 'A second reroll in the same fight must fail');

  const purchaseRun = createArenaRun();
  const affordable = purchaseRun.shopOffers.find((offer) => offer.cost <= purchaseRun.gold);
  assert(Boolean(affordable), 'Initial shop needs an affordable offer');
  const goldBefore = purchaseRun.gold;
  assert(buyArenaOffer(purchaseRun, affordable!.id), 'Affordable offer should be purchasable');
  assert(purchaseRun.fighters.length === 2, 'Purchase must add one fighter');
  assert(deployedFighters(purchaseRun).length === 2, 'The first recruit must fill the second field slot');
  assert(purchaseRun.gold === goldBefore - affordable!.cost, 'Purchase must deduct its listed cost');

  purchaseRun.gold = 20;
  const benchOffer = purchaseRun.shopOffers[0];
  assert(Boolean(benchOffer) && buyArenaOffer(purchaseRun, benchOffer.id), 'A recruit above the current cap should be purchasable');
  assert(deployedFighters(purchaseRun).length === 2 && reserveFighters(purchaseRun).length === 1, 'Extra recruits must enter reserve');
  const reserveId = reserveFighters(purchaseRun)[0].id;
  assert(!deployArenaFighter(purchaseRun, reserveId, { col: 0, row: 4 }), 'The current team cap must block reserve deployment');
  assert(upgradeArenaFighter(purchaseRun, 1), 'A tier-I fighter should upgrade once');
  assert(!upgradeArenaFighter(purchaseRun, 1), 'A fighter must not upgrade twice');
  assert(advanceArenaRun(purchaseRun), 'A cleared non-boss fight should advance the run');
  assert(purchaseRun.fightIndex === 1 && purchaseRun.rerollsLeft === 1, 'Next fight must refresh shop and reroll');
  assert(fieldLimitForFight(purchaseRun.fightIndex) === 3, 'Winning fight one must unlock a third field slot');
  assert(deployArenaFighter(purchaseRun, reserveId, { col: 0, row: 4 }), 'The unlocked slot must accept a reserve fighter');
};

const campaign = createArenaRun();
const campaignResults = ARENA_ENCOUNTERS.map((encounter, fightIndex) => {
  const recruitmentPriorities = [
    ['ranger', 'fire_mage', 'healer', 'shield_guard'],
    ['healer', 'ranger', 'fire_mage', 'shield_guard'],
    ['fire_mage', 'ranger', 'healer', 'shield_guard'],
    ['shield_guard', 'ranger', 'fire_mage', 'healer']
  ][fightIndex];
  while (deployedFighters(campaign).length < fieldLimitForFight(fightIndex)) {
    const offer = [...campaign.shopOffers]
      .filter((candidate) => candidate.cost <= campaign.gold)
      .sort((a, b) => recruitmentPriorities.indexOf(a.definitionId) - recruitmentPriorities.indexOf(b.definitionId))[0];
    assert(Boolean(offer), `Fight ${fightIndex + 1} needs an affordable reinforcement`);
    assert(buyArenaOffer(campaign, offer.id), `Fight ${fightIndex + 1} reinforcement should be purchasable`);
  }
  assert(
    deployedFighters(campaign).length === fieldLimitForFight(fightIndex),
    `Fight ${fightIndex + 1} should enter combat at its team cap`
  );
  if (fightIndex === 2) assert(upgradeArenaFighter(campaign, 1), 'Fight-three Shield Guard upgrade should be affordable');
  const run = cloneArenaRun(campaign);
  const placements = arenaRunPlacements(run);
  const first = simulate(placements, fightIndex);
  const second = simulate(placements, fightIndex);
  assert(JSON.stringify(first) === JSON.stringify(second), `${encounter.name} is not deterministic`);
  const result = {
    fight: fightIndex + 1,
    name: encounter.name,
    teamSize: deployedFighters(campaign).length,
    teamCap: fieldLimitForFight(fightIndex),
    gold: campaign.gold,
    ...first
  };
  if (!encounter.boss) assert(advanceArenaRun(campaign), `Fight ${fightIndex + 1} should advance`);
  return result;
});

verifyRunEconomy();
console.log(JSON.stringify({ formationResults, campaignResults }, null, 2));

assert(formationResults.every((result) => result.time <= 40.05), 'Arena battle exceeded its time cap');
assert(formationResults.find((result) => result.name === 'protected')?.outcome === 'victory', 'Protected formation should win');
assert(formationResults.find((result) => result.name === 'exposedBackline')?.outcome === 'defeat', 'Exposed backline should lose');
assert(campaignResults.every((result) => result.outcome === 'victory'), 'Prepared roster should clear all four fights');
assert(campaignResults.every((result) => result.time >= 12 && result.time <= 30), 'Campaign fights should last roughly 12-30 seconds');
