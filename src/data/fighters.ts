import type { FighterDefinition, FighterTierStats } from '../model/UnitDefinition';
import type { AttackType, ArmorType, Role } from '../model/Types';

const t = (
  name: string,
  cost: number,
  hp: number,
  damage: number,
  attackSpeed: number,
  range: number,
  moveSpeed: number,
  extra?: Partial<FighterTierStats>
): FighterTierStats => ({ name, cost, hp, damage, attackSpeed, range, moveSpeed, ...extra });

const def = (
  id: string,
  factionId: string,
  role: Role,
  attackType: AttackType,
  armorType: ArmorType,
  desc: string,
  base: FighterTierStats,
  upgrade: FighterTierStats
): FighterDefinition => ({ id, factionId, role, attackType, armorType, desc, tiers: [base, upgrade] });

export const FIGHTERS: FighterDefinition[] = [
  // ---------- Ironclad Legion ----------
  def(
    'shield_guard', 'ironclad', 'tank', 'impact', 'armored',
    'Cheap frontline tank. Holds the line early.',
    t('Shield Guard', 50, 320, 8, 0.8, 0.9, 1.2),
    t('Iron Bastion', 90, 700, 14, 0.8, 0.9, 1.2)
  ),
  def(
    'hammer_recruit', 'ironclad', 'melee', 'impact', 'armored',
    'Sturdy melee damage dealer. Cracks armored enemies.',
    t('Hammer Recruit', 65, 180, 20, 0.9, 0.9, 1.3),
    t('Warhammer Veteran', 110, 340, 42, 0.9, 0.9, 1.3)
  ),
  def(
    'ballista_scout', 'ironclad', 'ranged', 'pierce', 'light',
    'Long range single-target shooter. Fragile.',
    t('Ballista Scout', 70, 90, 24, 0.8, 3.2, 1.1),
    t('Siege Marksman', 120, 150, 52, 0.8, 3.4, 1.1)
  ),
  def(
    'banner_bearer', 'ironclad', 'support', 'impact', 'armored',
    'Aura: nearby fighters attack faster.',
    t('Banner Bearer', 90, 200, 6, 0.8, 1.2, 1.1, { passive: { kind: 'atkSpeedAura', radius: 2.0, pct: 0.12 } }),
    t('Legion Standard', 140, 360, 10, 0.8, 1.2, 1.1, { passive: { kind: 'atkSpeedAura', radius: 2.4, pct: 0.2 } })
  ),
  def(
    'steel_hound', 'ironclad', 'melee', 'pierce', 'light',
    'Fast bruiser that intercepts runners.',
    t('Steel Hound', 55, 150, 16, 1.2, 0.9, 1.8),
    t('Ironfang Hound', 95, 280, 32, 1.2, 0.9, 1.9)
  ),
  def(
    'fortress_golem', 'ironclad', 'tank', 'impact', 'massive',
    'Expensive late-game colossus. Nearly unkillable.',
    t('Fortress Golem', 250, 1500, 30, 0.7, 1.0, 1.0),
    t('Citadel Golem', 350, 3000, 55, 0.7, 1.0, 1.0)
  ),

  // ---------- Ember Covenant ----------
  def(
    'spark_adept', 'ember', 'ranged', 'magic', 'arcane',
    'Cheap magic damage from range.',
    t('Spark Adept', 50, 90, 18, 1.0, 2.6, 1.1),
    t('Flame Adept', 90, 150, 38, 1.0, 2.6, 1.1)
  ),
  def(
    'ember_mage', 'ember', 'aoe', 'magic', 'arcane',
    'Splash damage caster. Melts clustered enemies.',
    t('Ember Mage', 100, 100, 22, 0.7, 2.8, 1.0, { splash: { radius: 1.0, pct: 0.6 } }),
    t('Pyre Oracle', 170, 170, 44, 0.7, 2.8, 1.0, { splash: { radius: 1.2, pct: 0.7 } })
  ),
  def(
    'ash_guard', 'ember', 'tank', 'impact', 'armored',
    'Mid-tier tank keeping enemies off the casters.',
    t('Ash Guard', 70, 380, 12, 0.8, 0.9, 1.2),
    t('Cinder Bulwark', 120, 800, 22, 0.8, 0.9, 1.2)
  ),
  def(
    'fire_imp', 'ember', 'melee', 'magic', 'light',
    'Cheap filler damage. Dies fast, hits fast.',
    t('Fire Imp', 40, 80, 13, 1.1, 1.6, 1.4),
    t('Flame Imp', 70, 140, 26, 1.1, 1.6, 1.4)
  ),
  def(
    'sun_archer', 'ember', 'ranged', 'pierce', 'light',
    'Reliable physical ranged damage.',
    t('Sun Archer', 65, 85, 22, 0.9, 3.0, 1.1),
    t('Solar Ranger', 115, 140, 46, 0.9, 3.2, 1.1)
  ),
  def(
    'phoenix_vessel', 'ember', 'ranged', 'magic', 'arcane',
    'Expensive scaling damage carry.',
    t('Phoenix Vessel', 260, 300, 60, 0.9, 2.4, 1.1),
    t('Phoenix Avatar', 360, 550, 120, 0.9, 2.4, 1.1)
  ),

  // ---------- Wildroot Clans ----------
  def(
    'rootling', 'wildroot', 'tank', 'impact', 'light',
    'Cheap swarm tank. Buy several.',
    t('Rootling', 40, 220, 7, 0.9, 0.9, 1.2),
    t('Thornling', 70, 430, 13, 0.9, 0.9, 1.2)
  ),
  def(
    'briar_warrior', 'wildroot', 'melee', 'pierce', 'light',
    'Aggressive melee fighter.',
    t('Briar Warrior', 60, 170, 17, 1.0, 0.9, 1.4),
    t('Thornblade', 100, 320, 34, 1.0, 0.9, 1.4)
  ),
  def(
    'moss_shaman', 'wildroot', 'support', 'magic', 'arcane',
    'Periodically heals the most wounded nearby fighter.',
    t('Moss Shaman', 90, 140, 8, 0.8, 2.4, 1.0, { passive: { kind: 'healPulse', radius: 2.5, amount: 30, interval: 2.0 } }),
    t('Elder Shaman', 150, 240, 14, 0.8, 2.4, 1.0, { passive: { kind: 'healPulse', radius: 2.8, amount: 65, interval: 2.0 } })
  ),
  def(
    'barkback_beast', 'wildroot', 'tank', 'impact', 'massive',
    'Thick-hided tank that shrugs off blows.',
    t('Barkback Beast', 120, 650, 16, 0.8, 0.9, 1.1),
    t('Ancient Barkback', 190, 1300, 28, 0.8, 0.9, 1.1)
  ),
  def(
    'vine_spitter', 'wildroot', 'ranged', 'pierce', 'light',
    'Ranged attacker spitting corrosive thorns.',
    t('Vine Spitter', 70, 90, 20, 1.0, 3.0, 1.1),
    t('Venom Vine', 120, 150, 40, 1.0, 3.0, 1.1)
  ),
  def(
    'grove_titan', 'wildroot', 'tank', 'impact', 'massive',
    'Late-game sustain tank. Regenerates through wars.',
    t('Grove Titan', 270, 1700, 26, 0.7, 1.0, 1.0),
    t('Worldroot Titan', 370, 3300, 48, 0.7, 1.0, 1.0)
  ),

  // ---------- Shadow Pact ----------
  def(
    'duskblade', 'shadow', 'melee', 'pierce', 'light',
    'Cheap assassin-style melee damage.',
    t('Duskblade', 50, 130, 19, 1.1, 0.9, 1.6),
    t('Nightblade', 90, 240, 40, 1.1, 0.9, 1.6)
  ),
  def(
    'hex_acolyte', 'shadow', 'ranged', 'magic', 'arcane',
    'Debuff mage. Every hit saps enemy attack speed.',
    t('Hex Acolyte', 75, 95, 16, 1.0, 2.6, 1.1),
    t('Hexbinder', 130, 160, 34, 1.0, 2.6, 1.1)
  ),
  def(
    'hollow_guard', 'shadow', 'tank', 'impact', 'armored',
    'Risky tank: strong for its price, but no sustain.',
    t('Hollow Guard', 60, 300, 15, 0.9, 0.9, 1.2),
    t('Hollow Warden', 100, 620, 28, 0.9, 0.9, 1.2)
  ),
  def(
    'shade_archer', 'shadow', 'ranged', 'pierce', 'light',
    'Long-range physical damage from the dark.',
    t('Shade Archer', 70, 85, 24, 0.9, 3.2, 1.1),
    t('Gloom Sniper', 125, 140, 50, 0.9, 3.4, 1.1)
  ),
  def(
    'leech_priest', 'shadow', 'support', 'magic', 'arcane',
    'Aura: nearby fighters heal for part of their damage.',
    t('Leech Priest', 95, 160, 10, 0.8, 2.2, 1.0, { passive: { kind: 'lifestealAura', radius: 2.2, pct: 0.15 } }),
    t('Blood Oracle', 150, 280, 18, 0.8, 2.2, 1.0, { passive: { kind: 'lifestealAura', radius: 2.5, pct: 0.25 } })
  ),
  def(
    'void_horror', 'shadow', 'melee', 'magic', 'massive',
    'Expensive monster that grows terrifying late.',
    t('Void Horror', 280, 900, 55, 0.8, 1.2, 1.1),
    t('Abyss Horror', 380, 1700, 105, 0.8, 1.2, 1.1)
  )
];

const byId = new Map(FIGHTERS.map((f) => [f.id, f]));

export const fighterById = (id: string): FighterDefinition => {
  const f = byId.get(id);
  if (!f) throw new Error(`Unknown fighter: ${id}`);
  return f;
};

export const fightersOfFaction = (factionId: string): FighterDefinition[] =>
  FIGHTERS.filter((f) => f.factionId === factionId);
