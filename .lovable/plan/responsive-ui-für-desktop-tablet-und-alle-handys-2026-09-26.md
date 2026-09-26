# Responsive UI für Desktop, Tablet und alle Handys

## Ziel
Goethe Connected wird auf kleinen Handys, großen Smartphones, Tablets, Laptops und Desktop-Bildschirmen sauber, kompakt und leicht bedienbar. Inhalte und Funktionen bleiben erhalten.

Festgelegt:
- Nachtblau und Amber bleiben die Markenfarben.
- Sora bleibt die Überschriftenschrift, Manrope wird die gut lesbare Fließtextschrift.
- Der Aufbau wird kompakter und zeigt Veranstaltungen schneller.
- Die verworfenen Beispielentwürfe werden nicht verwendet.

## Umsetzung

### 1. Gemeinsame Gestaltungsgrundlage
- Abstände, Textgrößen, Inhaltsbreiten, Ecken und Schatten für alle Bildschirmgrößen vereinheitlichen.
- Die Schrift auf Sora und Manrope umstellen und lange Wörter, E-Mail-Adressen, Codes und Titel sicher umbrechen.
- Fokuszustände, Mindestgrößen für Touch-Bedienung und reduzierte Bewegung berücksichtigen.
- Wiederkehrende Kopfzeilen, Seitenbreiten, Statistikfelder, Formbereiche und Aktionsleisten konsistent gestalten.

### 2. Öffentliche Seiten
- Kopfzeile auf sehr schmalen Handys ohne abgeschnittenes Logo oder überlaufende Navigation neu ordnen.
- Startseite deutlich kompakter machen, damit „Kommende Veranstaltungen“ früher sichtbar ist.
- Eventkarten für eine Spalte auf Handys, zwei auf Tablets und drei auf großen Bildschirmen optimieren.
- Eventdetailseite, Ticketwahl, Käuferformular und feste mobile Kaufleiste für kurze und lange Inhalte absichern.
- Ticketansicht, QR-Code, PDF- und Kalenderbutton so skalieren, dass auch 320-Pixel-Breiten funktionieren.
- Kauf-Erfolg, Kauf-Fehler, Anmeldung, Impressum und Datenschutz in die gleichen Abstands- und Lesbarkeitsregeln einpassen.

### 3. Verwaltung
- Verwaltungsnavigation auf kleinen Geräten klar und berührungsfreundlich halten, ohne abgeschnittene Bezeichnungen.
- Übersichten, Kennzahlen und Eventzeilen auf Handys untereinander, auf Tablets und Desktop dichter anordnen.
- Event-Erstellung und Bearbeitung für kleine Displays optimieren: Teilnahmeart, Datum, Ort, Bild, Ticketarten, Preise und Kontingente erhalten stabile Raster.
- Tabs und Aktionsbuttons auf schmalen Geräten scrollbar oder gestapelt darstellen.
- Teilnehmerliste auf Handys als gut lesbare Einträge statt als breite Tabelle zeigen; die Tabelle bleibt auf größeren Bildschirmen erhalten.
- CSV-Export, öffentliche Seite, Speichern, Löschen und Stornieren sinnvoll positionieren.
- Scanansicht für Einhandbedienung, Kamerafläche, manuelle Eingabe und lange Ergebniswerte optimieren.

### 4. Prüfung
- Öffentliche Startseite, Eventseite, Ticketseite, Anmeldung und alle zentralen Verwaltungsansichten prüfen.
- Mindestens bei 320, 375, 390, 430, 768, 1024 und 1280 Pixel Breite testen.
- Auf horizontales Scrollen, abgeschnittene Texte, überlappende Elemente, feste Leisten und Touch-Ziele kontrollieren.
- Kalenderdownload, PDF-Download, CSV-Export, Ticketwahl, Formulare, Tabs und Scanablauf funktional unverändert prüfen.
- Abschließend aktuellen Build- und Laufzeitstatus kontrollieren.

## Technische Details
- Die vorhandenen semantischen Farbvariablen und bestehenden Bedienelemente bleiben maßgeblich.
- Responsive Regeln werden direkt in den betroffenen Ansichten und gemeinsamen Bausteinen umgesetzt; es entstehen keine parallelen Sonderseiten für Geräteklassen.
- Die Datenbank, Ticketlogik, Zahlungen, Rollen und URLs werden nicht verändert.
