# Lane Legion — Verbesserungs-Roadmap

Stand: 2026-07-06. Basis: Abgleich des Projekts mit Legion TD 2 (Steam) als Referenz
und UX-Review der aktuellen UI. Ziel: spielbares, verständliches Android-Spiel mit
dem Suchtfaktor des LTD2-Loops.

Grundsatz der Reihenfolge: **Erst verständlich machen, dann gut machen, dann groß
machen, dann verpacken.** Neuer Content (mehr Wellen, mehr Einheiten) lohnt sich
erst, wenn Neulinge das vorhandene Spiel lesen können und der Kern-Loop trägt.

---

## Phase 1 — Verständlichkeit (die UI spricht Spieler-, nicht Entwicklersprache)

> Weshalb zuerst: Das Konter-System (Angriffs- vs. Rüstungstyp) ist die zentrale
> Entscheidung des Spiels und aktuell als Kürzel (`PRC → / LGT ▣`) unlesbar.
> Jede weitere Balance- oder Content-Arbeit ist wertlos, solange Spieler die
> Kerninfo nicht verstehen. Außerdem: kleinster Aufwand, größte Sofortwirkung.

1. **Icons + Farben statt Kürzel für Angriffs-/Rüstungstypen**
   - Je Typ ein Symbol mit fester Farbe, zentral in `src/ui/theme.ts` definiert.
   - Überall ersetzen: FighterCard, InfoPanel, Unit-Detail-Popup.
2. **Konter-Anzeige auf den Fighter-Cards**
   - Während der Build-Phase pro Karte „▲ stark / ▼ schwach gegen nächste Welle“
     (Daten aus `damageMatrix.ts` + `waves.ts` sind vorhanden).
3. **Eine Sprache durchziehen (Deutsch) + Strings zentralisieren**
   - Aktuell Mix aus „READY“/„SEND“ und „Arbeiter kaufen“. Alle UI-Texte in eine
     Datei (`src/ui/strings.ts`) — zugleich Vorstufe für spätere Lokalisierung.
4. **Ressourcen-Legende / Erst-Spiel-Overlay**
   - Eine Zeile: „Gold = bauen · ◆ Mythium = senden · ↑ Income = Gold pro Welle“.
   - Beim allerersten Start 3–4 geführte Einblendungen (Kämpfer bauen → Worker
     kaufen → Send ausführen → Income steigt). Flag in `localStorage`.

## Phase 2 — Kern-Loop schärfen (das Spiel *fühlt* sich wie Legion TD an)

> Weshalb jetzt: Mit 10 Wellen lohnt Ökonomie kaum (1 Worker = 50 Gold ≈ 7
> Mythium/Welle → Payoff kommt zu spät), das Match endet unspektakulär per
> HP-Vergleich, und die flache Damage-Matrix (±25 %/15 %) lässt Konter kaum
> spürbar werden. Das sind die drei größten spielmechanischen Hebel.

5. **Wellen auf 15–21 erweitern + King-Kill beendet das Match sofort**
   - Neue Wellen in `waves.ts` mit Creep-Fähigkeiten (Heiler, Magieresistenz,
     Schnellläufer-Boss …), Endboss-Dramaturgie.
   - `PhaseSystem`/`KingSystem`: König tot ⇒ sofortiges Match-Ende (wie LTD2).
   - Worker-/Income-Kurve auf die neue Länge nachbalancieren (`simcheck.ts` nutzen).
6. **Damage-Matrix schärfen**
   - Von 1.25/0.85 auf ca. 1.5/0.7, damit richtige/falsche Konter sichtbar
     durchschlagen. Nur `damageMatrix.ts` + Nachbalancieren.
7. **Value-/Leak-Feedback ins HUD + Nach-Wellen-Zusammenfassung**
   - TopBar: „Wert 320 / empfohlen 360 ⚠“ (Daten existieren bereits).
   - Nach jeder Welle Kurz-Panel: wer leakte wie viel, King-Schaden, Income-Zuwachs.

## Phase 3 — Spielgefühl (Feel & Lesbarkeit im Kampf)

> Weshalb jetzt: Ohne Audio und mit kleinem Kampfgeschehen bleibt auch ein gut
> balanciertes Spiel flach. Billigster „Feel“-Gewinn auf Mobile.

8. **Sound & Haptik** — ~10–15 kurze SFX (Treffer, Leak, King-Alarm, Wellenstart,
   Kauf) + 1–2 Musik-Loops, Vibration bei Leak/King-Schaden. Phaser-Audio reicht.
9. **Battle-Lesbarkeit & Tempo** — 2×-Speed-Button, deutliche Leak-Animation
   (Creep → Arena), King-HP prominenter in der Battle-Phase, optionale
   Schadenszahlen.

## Phase 4 — Wiederspielwert (warum spielt man Partie 10?)

> Weshalb jetzt: Erst wenn eine Partie gut ist, lohnt Varianz zwischen Partien.

10. **Mehr Kämpfer + Roll-/Draft-Modus** — pro Fraktion auf 8–10 Kämpfer; dazu
    ein Modus „aus 10 zufälligen Kämpfern 6 wählen“ (fraktionsübergreifend,
    LTD2-„Mastermind“-Prinzip). Fast rein datengetrieben (`fighters.ts`).
11. **Send-Taktik vertiefen** — Gegner-Peek um Value/Leak-Historie erweitern;
    KI sendet gezielt auf Schwäche; Merc-Kombos belohnen. `spendAllOnIncome`
    bleibt als Komfort, darf aber nicht optimal sein.
12. **Meta-Progression offline** — Schwierigkeits-Leiter mit Sternen pro
    Fraktion × Difficulty, kleine Achievements, lokale Statistiken. Nur
    `localStorage`, kein Backend.

## Phase 5 — Android-Release

> Weshalb zuletzt: Verpacken lohnt erst, wenn Inhalt und Feel stimmen. Technisch
> klein, da kein Backend existiert.

13. **Capacitor-Wrapper + PWA** — `@capacitor/android` um den `dist/`-Build;
    PWA-Manifest + Service-Worker für Offline; Android-Back-Button, Fullscreen,
    Safe-Areas; Performance-Check auf schwachem Gerät (Ziel: stabile 60 fps).

---

## Laufend / Hygiene

- Uncommittete Änderungen (neue `src/assets/`, BootScene/Card-Umbauten) **vor**
  Phase 1 committen.
- `GameScene.ts` (634 Zeilen) beim nächsten größeren Umbau in Renderer-Module
  splitten (Units/FX/Popups).
- Nach jeder Balance-Änderung `npx -y tsx simcheck.ts` laufen lassen.

## Empfehlung in einem Satz

**1→4 (Verständlichkeit) sofort, dann 5–7 (Loop), 8–9 (Feel), 10–12
(Wiederspielwert), zuletzt 13 (Android-Packaging).**
