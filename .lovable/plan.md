# Goethe Connected, Rechtsangaben und kostenlose Events

## Ziel
Die Plattform heißt überall **Goethe Connected**. Alexander Albert wird als Verantwortlicher genannt. Das Demo-Event **Sommerfest 2027** wird vollständig entfernt. Beim Erstellen eines Events gibt es schnelle Optionen für bezahlte Tickets, kostenlose QR-Tickets und offene kostenlose Treffen ohne Anmeldung.

## Änderungen

### 1. Branding und Texte
- Den Namen zentral und in Seitentiteln, Vorschauen, PDFs und allen weiteren sichtbaren Stellen auf **Goethe Connected** ändern.
- Alle sichtbaren Gedankenstriche vom Typ „—“ entfernen und die Texte natürlich mit Punkt, Doppelpunkt, Komma oder Klammern formulieren.
- Auch dynamische Platzhalter und Titel im Bezahlfenster ohne Gedankenstrich ausgeben.
- Die vorgeschriebenen Seitendaten für Suchmaschinen und Linkvorschauen je Seite vervollständigen.

### 2. Verantwortlicher
- Im Impressum **Alexander Albert** unter „Vertreten durch“ und „Verantwortlich für den Inhalt“ eintragen.
- In der Datenschutzerklärung Alexander Albert als Verantwortlichen nennen.
- Die noch unbekannte Anschrift, Telefonnummer und Kontaktadresse bleiben deutlich als Platzhalter gekennzeichnet, damit keine Angaben erfunden werden.

### 3. Sommerfest entfernen
- Das vorhandene aktive Event **Sommerfest 2027** mit der URL `sommerfest-2027` aus der Datenbank löschen.
- Zugehörige Demo-Ticketarten und das vorhandene Testticket werden durch die bestehenden Verknüpfungen ebenfalls entfernt.
- Danach prüfen, dass das Sommerfest weder unter „Kommende Veranstaltungen“ noch direkt über seine bisherige URL erreichbar ist.

### 4. Schnelloptionen beim Erstellen
Im Formular „Neues Event“ kommt eine gut sichtbare Auswahl mit drei Modi:

1. **Event mit Verkauf**
   - Bestehender Ablauf mit Ticketarten, Preisen und Bezahlung.
2. **Kostenlos mit QR-Ticket**
   - Legt mit einem Klick eine kostenlose Ticketart an.
   - Besucher melden sich mit Name und E-Mail an.
   - Die Bezahlseite wird übersprungen; das persönliche QR-Ticket wird direkt und sicher ausgestellt.
3. **Offenes kostenloses Treffen**
   - Keine Anmeldung, kein Ticket und keine Bezahlseite.
   - Für Beispiele wie „Treffen im Park“.

Die Auswahl setzt sinnvolle Felder voraus, kann vor dem Speichern geändert werden und zeigt nur die jeweils passenden Eingaben.

### 5. Öffentliche Darstellung
- Kostenlose Events erhalten auf Startseite und Eventseite eine klare Kennzeichnung **„Offen & kostenlos“** oder **„Kostenloses Ticket“**.
- Offene Treffen zeigen statt des Kaufbereichs einen kompakten Hinweis **„Keine Anmeldung erforderlich“** mit Datum und Ort.
- Kostenlose QR-Events zeigen **„Kostenlos anmelden“**, stellen nach erfolgreicher Anmeldung das Ticket aus und führen direkt zur Ticketansicht.
- Kapazität, Restplätze, Verkaufszeitraum und Ausverkauft-Status funktionieren bei kostenlosen QR-Tickets genauso wie bei bezahlten Tickets.

## Technische Details
- Das Event-Datenmodell erhält einen abgesicherten Teilnahme-Modus mit Standardwert für bestehende Events: `paid`, `free_ticket` oder `open_free`.
- Öffentliche Abfragen, Admin-Abfragen und Formvalidierung werden um diesen Modus ergänzt.
- Die kostenlose Ticket-Ausstellung läuft serverseitig, prüft Eventstatus und Restkapazität erneut und erzeugt weiterhin kryptographisch zufällige, einmalig einlösbare Codes.
- Bezahlte Events bleiben unverändert an die eingebauten Zahlungen angebunden; offene Treffen umgehen Bestellungen und Tickets vollständig.
- Nach der Umsetzung werden Erstellen, öffentliche Anzeige und kostenloser QR-Ablauf auf Desktop und Mobil geprüft. Zusätzlich werden Anmeldung, QR-Anzeige und einmaliges Einlösen getestet.

## Sinnvolle spätere Idee
Eine freiwillige Teilnehmerzahl-Anzeige für offene Treffen könnte später ergänzt werden. Sie ist bewusst nicht Teil dieser Änderung, da offene Treffen zunächst ohne Anmeldung funktionieren sollen.
