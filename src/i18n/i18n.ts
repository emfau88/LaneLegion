/**
 * Minimal i18n layer for UI chrome strings. Default language: German.
 * Pure UI concern — never import this from src/systems, src/core or src/model.
 * Content strings (unit names, wave hints, ...) live in ./names.ts keyed by id.
 */
export type Lang = 'de' | 'en';

const STORAGE_KEY = 'laneLegion.lang';

let lang: Lang = 'de';
try {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (stored === 'de' || stored === 'en') lang = stored;
} catch {
  /* storage unavailable (private mode etc.) — keep default */
}

export const getLang = (): Lang => lang;

export const setLang = (l: Lang): void => {
  lang = l;
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* ignore */
  }
};

export interface Localized {
  de: string;
  en: string;
}

/** Pick the current language variant of a localized string. */
export const tr = (l: Localized): string => l[lang];

const STRINGS = {
  // ---------- common ----------
  'common.back': { de: '◀ Zurück', en: '◀ Back' },
  'common.on': { de: 'AN', en: 'ON' },
  'common.off': { de: 'AUS', en: 'OFF' },
  'common.tapToClose': { de: '(zum Schließen irgendwo tippen)', en: '(tap anywhere to close)' },

  // ---------- main menu ----------
  'menu.subtitle': { de: 'Offline Lane-Defense-Autobattler', en: 'Offline Lane Defense Autobattler' },
  'menu.gameMode': { de: 'Spielmodus', en: 'Game Mode' },
  'menu.hint2v2': {
    de: 'Im 2v2 kämpft ein KI-Verbündeter an deiner Seite. Teams teilen sich einen König.',
    en: 'In 2v2 an AI ally fights beside you. Teams share a king.'
  },
  'menu.difficulty': { de: 'KI-Schwierigkeit', en: 'AI Difficulty' },
  'menu.chooseFaction': { de: 'FRAKTION WÄHLEN ▶', en: 'CHOOSE FACTION ▶' },
  'menu.offline': {
    de: 'Komplett offline • keine Konten • kein Netzwerk',
    en: 'Fully offline • no accounts • no network'
  },
  'menu.language': { de: 'Sprache: DE', en: 'Language: EN' },
  'menu.sound': { de: 'Sound: {state}', en: 'Sound: {state}' },

  'diff.easy': { de: 'Leicht', en: 'Easy' },
  'diff.normal': { de: 'Normal', en: 'Normal' },
  'diff.hard': { de: 'Schwer', en: 'Hard' },

  // ---------- faction select ----------
  'select.title': { de: 'Wähle deine Fraktion', en: 'Choose Your Faction' },
  'select.subtitle': { de: '{mode} • KI: {diff}', en: '{mode} • {diff} AI' },
  'select.start': { de: 'MATCH STARTEN', en: 'START MATCH' },
  'select.difficultyLabel': { de: 'Schwierigkeit', en: 'Difficulty' },
  'select.passive': { de: 'Passiv: {desc}', en: 'Passive: {desc}' },

  // ---------- result ----------
  'result.victory': { de: 'SIEG', en: 'VICTORY' },
  'result.defeat': { de: 'NIEDERLAGE', en: 'DEFEAT' },
  'result.wavesPlayed': { de: 'Gespielte Wellen: {n}', en: 'Waves played: {n}' },
  'result.playAgain': { de: 'NOCHMAL SPIELEN', en: 'PLAY AGAIN' },
  'result.mainMenu': { de: 'HAUPTMENÜ', en: 'MAIN MENU' },
  'reason.kingDestroyed': { de: 'König zerstört', en: 'King destroyed' },
  'reason.moreKingHp': {
    de: 'Mehr König-HP nach der letzten Welle',
    en: 'More king HP after the final wave'
  },
  'reason.higherValue': { de: 'Höherer Gesamt-Kämpferwert', en: 'Higher total fighter value' },

  // ---------- top bar ----------
  'topbar.wave': { de: 'Welle {n}/{max}', en: 'Wave {n}/{max}' },
  'phase.build': { de: 'BAUEN', en: 'BUILD' },
  'phase.battle': { de: 'KAMPF', en: 'BATTLE' },
  'phase.end': { de: 'ENDE', en: 'END' },
  'topbar.ready': { de: 'BEREIT', en: 'READY' },
  'topbar.gold': { de: 'Gold {n}', en: 'Gold {n}' },
  'topbar.mythium': { de: 'Mythium {n}', en: 'Mythium {n}' },
  'topbar.income': { de: 'Eink. +{n}', en: 'Income +{n}' },
  'topbar.mythHint': { de: '◆ = Söldner senden', en: '◆ = send mercenaries' },
  'topbar.buyWorker': { de: 'Worker {cost}g  ({n})', en: 'Worker {cost}g  ({n})' },
  'topbar.you': { de: '♛ DU', en: '♛ YOU' },
  'topbar.enemy': { de: 'GEGNER ♛', en: 'ENEMY ♛' },
  'topbar.value': { de: 'Wert {own}/{rec}', en: 'Value {own}/{rec}' },
  'topbar.leaks': { de: 'Leaks: {n}', en: 'Leaks: {n}' },

  // ---------- action hints ----------
  'hint.needValue': { de: 'Bauen: Wert {own}/{rec}. Mehr Fighter setzen.', en: 'Build: value {own}/{rec}. Add fighters.' },
  'hint.workerReady': { de: 'Option: Worker kaufen oder BEREIT.', en: 'Option: buy worker or READY.' },
  'hint.nextSend': { de: 'Noch {n} Mythium bis zum ersten Send.', en: '{n} more mythium for first send.' },
  'hint.spendMythium': { de: 'Mythium ausgeben: Söldner oder König.', en: 'Spend mythium: mercs or king.' },
  'hint.battle': { de: 'Kampf laeuft. Leaks treffen den König.', en: 'Battle running. Leaks hit the king.' },
  'hint.leaking': { de: 'Leak! Dein König verteidigt jetzt mit.', en: 'Leak! Your king is defending now.' },

  // ---------- wave report ----------
  'report.title': { de: 'Welle {n} abgeschlossen', en: 'Wave {n} complete' },
  'report.leaksLine': { de: '{name}: {n} Leaks', en: '{name}: {n} leaks' },
  'report.noLeaks': { de: '{name}: dicht gehalten ✓', en: '{name}: held the line ✓' },
  'report.kingDmg': {
    de: 'König-Schaden — dein Team: {own} · Gegner: {enemy}',
    en: 'King damage — your team: {own} · enemy: {enemy}'
  },
  'report.income': { de: '+{n} Gold Einkommen erhalten', en: '+{n} gold income received' },

  // ---------- bottom shop ----------
  'tab.fighters': { de: 'Kämpfer', en: 'Fighters' },
  'tab.mercs': { de: 'Söldner', en: 'Mercs' },
  'tab.king': { de: 'König', en: 'King' },
  'tab.info': { de: 'Info', en: 'Info' },
  'shop.autoSend': { de: 'Auto-Senden: {state}', en: 'Auto-Send: {state}' },
  'shop.noSends': { de: 'Keine Sends geplant', en: 'No sends queued' },
  'shop.queued': { de: 'Geplant: {n} Send(s)', en: 'Queued: {n} send(s)' },
  'shop.menus': { de: 'Menues', en: 'Menus' },
  'shop.minimize': { de: 'zu', en: 'min' },
  'shop.queueTitle': { de: 'Sends für die nächste Welle planen:', en: 'Queue sends for next wave:' },
  'shop.mercHint': {
    de: 'Mythium ◆ nutzt du für Sends oder König-Upgrades. Sends greifen den Gegner nächste Welle an und geben Einkommen.',
    en: 'Use mythium ◆ for sends or king upgrades. Sends attack the enemy next wave and grant income.'
  },

  // ---------- mercenary card ----------
  'merc.income': { de: '+{n} Einkommen', en: '+{n} income' },
  'merc.send': { de: 'SENDEN', en: 'SEND' },

  // ---------- king panel ----------
  'king.level': { de: 'St. {n}/{max}', en: 'Lv {n}/{max}' },
  'king.max': { de: 'MAX', en: 'MAX' },
  'king.upgradeBtn': { de: 'Ausbauen {cost} ◆', en: 'Upgrade {cost} ◆' },
  'king.needMythium': { de: 'Fehlt {missing} ◆', en: 'Need {missing} ◆' },
  'king.hint': {
    de: 'Upgrades kosten Mythium ◆, nicht Gold. Du hast {n} ◆',
    en: 'Upgrades cost mythium ◆, not gold. You have {n} ◆'
  },
  'king.stats': {
    de: 'König: {dmg} Schaden  •  {regen} HP/s Regeneration  •  Zauber {spell} Schaden',
    en: 'King: {dmg} dmg  •  {regen} HP/s regen  •  spell {spell} dmg'
  },

  // ---------- info panel ----------
  'info.finalWave': { de: 'Letzte Welle läuft!', en: 'Final wave in progress!' },
  'info.finalHint': {
    de: 'Zerstöre den gegnerischen König oder halte deinen gesünder.',
    en: 'Kill the enemy king or keep yours healthier.'
  },
  'info.incoming': { de: 'Jetzt: Welle {n} — {name}', en: 'Incoming: Wave {n} — {name}' },
  'info.next': { de: 'Als Nächstes: Welle {n} — {name}', en: 'Next: Wave {n} — {name}' },
  'info.recValue': {
    de: 'Empfohlener Verteidigungswert: {rec}   (deiner: {own})',
    en: 'Recommended defense value: {rec}   (yours: {own})'
  },
  'info.compLine': { de: '{count}× {name}  ({hp} HP)', en: '{count}× {name}  ({hp} HP)' },
  'info.economyGuide': {
    de: 'Kurz: Gold baut Kämpfer/Worker. Worker erzeugen Mythium ◆. Mythium kaufst du als Sends oder König-Upgrades. Einkommen zahlt jede Runde mehr Gold.',
    en: 'Short version: gold buys fighters/workers. Workers generate mythium ◆. Spend mythium on sends or king upgrades. Income pays more gold each round.'
  },

  // ---------- fighter card / info popup ----------
  'card.stats': { de: '{hp} HP  {dmg} Schaden', en: '{hp} HP  {dmg} DMG' },
  'card.strong': { de: '▲ stark', en: '▲ strong' },
  'card.weak': { de: '▼ schwach', en: '▼ weak' },
  'popup.vsWave': {
    de: 'Gegen Welle {n}: {mult}× Schaden',
    en: 'Vs wave {n}: {mult}× damage'
  },
  'popup.attackArmor': { de: 'Angriff: {atk}   Rüstung: {arm}', en: 'Attack: {atk}   Armor: {arm}' },
  'popup.base': { de: 'Basis — {cost}g', en: 'Base — {cost}g' },
  'popup.upgrade': { de: 'Ausbau: {name} — +{cost}g', en: 'Upgrade: {name} — +{cost}g' },
  'popup.statLine': {
    de: '{hp} HP, {dmg} Schaden, {as}/s, Reichweite {range}',
    en: '{hp} HP, {dmg} dmg, {as}/s, range {range}'
  },

  // ---------- roles ----------
  'role.tank': { de: 'Tank', en: 'Tank' },
  'role.melee': { de: 'Nahkampf', en: 'Melee' },
  'role.ranged': { de: 'Fernkampf', en: 'Ranged' },
  'role.aoe': { de: 'Fläche', en: 'AOE' },
  'role.support': { de: 'Support', en: 'Support' },

  // ---------- attack / armor type names ----------
  'atk.pierce': { de: 'Stich', en: 'Pierce' },
  'atk.impact': { de: 'Wucht', en: 'Impact' },
  'atk.magic': { de: 'Magie', en: 'Magic' },
  'atk.pure': { de: 'Pur', en: 'Pure' },
  'arm.light': { de: 'Leicht', en: 'Light' },
  'arm.armored': { de: 'Gepanzert', en: 'Armored' },
  'arm.arcane': { de: 'Arkan', en: 'Arcane' },
  'arm.massive': { de: 'Massiv', en: 'Massive' },

  // ---------- damage matchups ----------
  'matchup.strongVs': { de: 'stark gegen {list}', en: 'strong vs {list}' },
  'matchup.weakVs': { de: 'schwach gegen {list}', en: 'weak vs {list}' },
  'matchup.takesMore': { de: 'anfällig für {list}', en: 'takes extra from {list}' },
  'matchup.takesLess': { de: 'widersteht {list}', en: 'resists {list}' },
  'matchup.neutral': { de: 'neutral gegen alles', en: 'neutral vs everything' },
  'info.legendPrefix': { de: 'Stark:', en: 'Strong:' },

  // ---------- lane status ----------
  'status.clear': { de: 'Frei', en: 'Clear' },
  'status.fighting': { de: 'Kämpft', en: 'Fighting' },
  'status.leaking': { de: 'Leakt', en: 'Leaking' },
  'status.dead': { de: 'Überrannt', en: 'Dead' },
  'lane.tapToView': { de: 'antippen zum Ansehen', en: 'tap to view' },

  // ---------- game scene ----------
  'zone.spawn': { de: 'GEGNER-SPAWN', en: 'ENEMY SPAWN' },
  'zone.build': { de: 'BAUZONE', en: 'BUILD ZONE' },
  'zone.leak': { de: 'LEAK-TOR ▼', en: 'LEAK GATE ▼' },
  'zone.arena': { de: '♛ KÖNIGSARENA — Leaks landen hier', en: '♛ KING ARENA — leaks land here' },
  'action.upgrade': { de: 'Ausbauen  {cost}g', en: 'Upgrade  {cost}g' },
  'action.maxed': { de: 'Voll ausgebaut', en: 'Fully upgraded' },
  'action.sell': { de: 'Verkaufen  +{n}g', en: 'Sell  +{n}g' },
  'game.leak': { de: 'LEAK!', en: 'LEAK!' }
} as const;

export type StringKey = keyof typeof STRINGS;

/** Translate a UI string, with optional {param} interpolation. */
export const t = (key: StringKey, params?: Record<string, string | number>): string => {
  let s: string = STRINGS[key][lang];
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
};
