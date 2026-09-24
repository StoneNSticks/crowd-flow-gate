# EventFlow Pro

Baue eine vollständige Event-Ticketing-Webapp. Verwende KEIN sichtbares "Made with Lovable"-Branding, keinen Lovable-Badge/Footer/Watermark irgendwo in der App.



## GRUNDKONZEPT

Eine Plattform, auf der ich (Admin) Events anlege und darüber Tickets verkaufe. Käufer bezahlen online, erhalten danach ein einzigartiges, personalisiertes Ticket mit Scan-Code. An der Tür kann ein Admin/Türsteher den Code scannen, sieht sofort ob er gültig ist, und kann ihn dann als "benutzt" markieren (Ticket wird deaktiviert, kann nicht doppelt verwendet werden).



## 1. ÖFFENTLICHE TICKETSEITE (pro Event, teilbar per Link)

- Jedes Event hat eine eigene, hübsch gestaltete Landingpage unter einer eigenen URL/Slug (z. B. /event/sommerfest-2026)

- Zeigt: Eventname, Beschreibung, Datum & Uhrzeit, Ort (mit Adresse), Coverbild/Banner, Preis(e), verfügbare Restplätze

- Wenn Tickets ausverkauft sind: klar sichtbarer "Ausverkauft"-Status, Kaufbutton deaktiviert

- Wenn der Verkauf noch nicht gestartet oder bereits beendet ist: entsprechender Hinweis

- Responsive Design, sieht auf dem Handy genauso gut aus wie am Desktop (die meisten Käufer kommen über geteilte Links auf dem Handy)

- Kein Hinweis auf die Baubasis/Tool – die Seite soll wie eine eigenständige, professionelle Ticketing-Website wirken



## 2. KAUFPROZESS

- Käufer wählt Ticket-Typ/-Anzahl (falls mehrere Kategorien wie "Standard", "VIP", "Early Bird" existieren)

- Formular für Name und E-Mail (Pflichtfelder, damit das Ticket personalisiert werden kann)

- Bezahlung über Stripe Checkout (Kreditkarte; optional weitere Methoden je nach Region)

- Nach erfolgreicher Zahlung: automatische Generierung eines einzigartigen Ticket-Codes pro Ticket (z. B. UUID oder kryptographisch zufälliger String – NICHT einfach hochzählen, damit niemand Codes erraten kann)

- Ticket wird als QR-Code dargestellt (codiert den einzigartigen Ticket-Code)

- Bestätigungsseite nach Kauf zeigt das Ticket direkt an (mit QR-Code, Eventdetails, Ticket-ID)

- Ticket wird zusätzlich per E-Mail an den Käufer verschickt (inkl. QR-Code als Bild/Anhang)

- Käufer kann sein Ticket über einen individuellen Link später erneut aufrufen (z. B. /ticket/[ticket-id])



## 3. DATENMODELL (Datenbank)

- **Events**: id, name, beschreibung, datum, uhrzeit, ort, bild-url, slug, preis, max_tickets, verkaufsstart, verkaufsende, status (aktiv/inaktiv)

- **Ticket-Typen** (falls unterstützt): id, event_id, name (z. B. "VIP"), preis, kontingent

- **Tickets**: id, event_id, ticket_typ_id, käufer_name, käufer_email, einzigartiger_code, status (gültig/eingelöst/storniert), erstellt_am, eingelöst_am, eingelöst_von (welcher Admin/Scanner)

- **Admins/Scanner-Nutzer**: id, email, rolle (Admin vs. nur Scan-Berechtigung)



## 4. ADMIN-PANEL (geschützt durch Login)

- Login-System für Admins (E-Mail/Passwort, ggf. mit Rollen: "Admin" kann alles, "Scanner" darf nur scannen)

- Übersicht aller Events (anlegen, bearbeiten, löschen/deaktivieren)

- Pro Event einstellbar: Name, Beschreibung, Datum, Uhrzeit, Ort, Bild, Preis, Ticket-Kontingent, mehrere Ticket-Kategorien mit eigenen Preisen

- Dashboard mit Verkaufsstatistik pro Event: verkaufte Tickets, Umsatz, verbleibende Kapazität, eingelöste vs. offene Tickets

- Liste aller verkauften Tickets pro Event (mit Käuferdaten, Status, Suchfunktion)

- Möglichkeit, ein Ticket manuell zu stornieren/zu refunden



## 5. SCAN-FUNKTION (für Türsteher/Einlass)

- Eigener Scan-Modus im Admin-Bereich, optimiert für Mobilgeräte (Kamera-Zugriff für QR-Scan)

- Nach dem Scannen: sofortiges, klares visuelles Feedback

  - ✅ Grün + "Gültig" wenn Ticket noch nicht eingelöst wurde

  - ❌ Rot + "Bereits verwendet" wenn Ticket schon gescannt wurde (inkl. Zeitstempel der ersten Einlösung)

  - ⚠️ Rot + "Ungültiger Code" wenn der Code nicht existiert

- Nach gültigem Scan: Button zum Bestätigen/Einlösen → Ticket wird sofort als "eingelöst" markiert und kann danach nicht erneut verwendet werden

- Zeigt zusätzlich Käufername und Ticket-Typ an, damit der Türsteher abgleichen kann

- Funktioniert auch bei schlechter Internetverbindung möglichst robust (Ladezustände klar anzeigen)



## 6. SICHERHEIT

- Ticket-Codes müssen kryptographisch zufällig und nicht erratbar sein

- Ein Ticket kann nur EINMAL eingelöst werden – serverseitige Prüfung, keine reine Frontend-Logik

- Admin-Bereich komplett durch Authentifizierung geschützt, keine öffentlich erreichbaren Admin-Routen

- Zahlungsabwicklung ausschließlich über Stripe, keine Kartendaten selbst speichern



## 7. ZUSÄTZLICHE SEITEN

- Einfache Startseite mit Übersicht aller aktiven/kommenden Events (falls mehrere gleichzeitig laufen)

- Erfolgsseite nach Kauf inkl. Ticket-Anzeige

- Fehlerseite falls Zahlung fehlschlägt, mit Möglichkeit, es erneut zu versuchen

- Kurze Impressum/Datenschutz-Platzhalterseite (rechtlich meist Pflicht bei Ticketverkauf)



## DESIGN

- Modern, klar, vertrauenswürdig – wie eine professionelle Ticketing-Plattform (Eventbrite-Stil), nicht wie eine Bastelseite

- Eigenes, neutrales Branding (kein Hinweis auf das Tool, mit dem die App gebaut wurde)

- Klare visuelle Hierarchie: Eventbild groß, Preis/Kaufbutton immer gut sichtbar

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4a95315f-5060-4a98-8084-5f0bd79dbe87).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
