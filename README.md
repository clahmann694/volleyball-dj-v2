# Volleyball DJ V2

Soundboard-Web-App zum Auflegen bei Volleyball-Spielen – für Mac und iPad. Nachfolger von [volleyball-dj-soundboard](https://github.com/clahmann694/volleyball-dj-soundboard), neu gebaut mit React 19, TypeScript und Vite.

## Was die App kann

**Beim Start** fragt die App, für welche Mannschaft du auflegst – Herren 1 oder Damen 1. Danach siehst du nur die Tasten dieser Mannschaft. Wechseln geht jederzeit über die Mannschaft oben rechts.

**DJ-Ansicht** (im Spiel)
- Gleich große 3D-Tasten in sechs Farben (Rot, Orange, Gelb, Grün, Blau, Lila), frei beschriftbar – „Block", „Ass", „krasser Angriff"; passen mehr Tasten in eine Zeile, als nebeneinander Platz haben, wird umgebrochen
- Tippen spielt den Sound, nochmal tippen stoppt. Tasten mit mehreren Sounds wählen zufällig – oder du wählst gezielt in der Seitenleiste.
- Je Taste einstellbar: **Einzeln** (ein Sound, dann Stille), **Der Reihe nach** (Playlist, läuft endlos) oder **Zufällig endlos** (nie zweimal derselbe hintereinander)
- Transportleiste: was läuft, Restzeit, **Pause/Weiter**, **Fade out**, großer **STOP**-Button (am Mac auch Leertaste), Lautstärke
- Der Bildschirm bleibt im Spielbetrieb an

**Dev-Ansicht** (Einrichtung)
- Tasten anlegen, beschriften, Farbe wählen, löschen – optional mit Kleingedrucktem unter dem Namen („z.B. kurzer Aufschlag, Lob"), damit jeder weiß, welche Situation gemeint ist
- Jede Taste Herren 1, Damen 1 oder beiden zuordnen; Umschalter zeigt, was eine Mannschaft sieht
- Anordnung mit der Maus: Tasten an ihren Platz ziehen, in eine andere Zeile oder in eine neue
- Audiodateien per Datei-Dialog oder Drag & Drop hinzufügen (MP3, M4A, WAV, …) – auch Videos: daraus wird die Tonspur unverändert übernommen, ohne Qualitätsverlust
- Der Wechsel in die Dev-Ansicht fragt vorher nach – dort lässt sich alles ändern und löschen
- **Cue-Points** setzen: Wellenform, Klick = Start, Shift-Klick = Ende, Marker ziehen, Vorschau
- **Lautstärke je Sound** mit Pegelmessung und „Angleichen" – damit nicht jeder Song anders laut ist
- Sounds innerhalb einer Taste sortieren oder in eine andere Taste verschieben
- Komplette Einrichtung als `.vbdj`-Bundle exportieren/importieren (Buttons + Cue-Points + Audiodateien)

## Wo liegen die Sounds?

Im Browser des Geräts (IndexedDB) – **nicht** im Repo und **nicht** in der Cloud. Deshalb:
- funktioniert alles **offline in der Halle**,
- landen keine urheberrechtlich geschützten Dateien auf GitHub,
- musst du die Einrichtung pro Gerät einmal importieren (Bundle vom Mac aufs iPad).

**iPad:** Die App über „Teilen → Zum Home-Bildschirm" installieren. Sonst darf Safari die gespeicherten Dateien nach 7 Tagen ohne Nutzung löschen.

## Entwicklung

```bash
npm install
npm run dev          # http://localhost:3000
npm run type-check
npm test             # End-to-End-Tests (startet Vite auf Port 3100, braucht Google Chrome)
npm run build        # Produktions-Build nach dist/
```

Der Dev-Server läuft nur, solange das Terminal offen ist. Für den Einsatz auf dem iPad muss die App gehostet werden (z. B. GitHub Pages aus `dist/`) – die Sounds bleiben trotzdem lokal auf dem Gerät.

## Technik

React 19 · TypeScript · Vite 7 · Tailwind CSS · Howler.js (Cue-Points als Sprites) · IndexedDB · JSZip · vite-plugin-pwa

Details zur Architektur in [CLAUDE.md](CLAUDE.md).

## Roadmap

- [x] Soundboard mit frei anordenbaren 3D-Tasten (Ziehen mit der Maus), Mehrfach-Sounds
- [x] Cue-Point-Editor mit Wellenform
- [x] Lokaler Import, Export/Import als Bundle, PWA
- [ ] Native Mac-App (Tauri) mit direktem Ordnerzugriff
- [x] Pause/Weiter, Playlist-Modi, Lautstärke je Sound, Sounds sortieren
- [ ] Startverzögerung verkürzen, Tastenkürzel pro Taste
- [ ] Timer (automatischer Stopp nach X Sekunden)
