# Passwort, verbesserte Event-Erstellung und QR-Test

## 1. Passwort ändern
Das Passwort für alex.crasher007@gmail.com wird auf `Stone007.` gesetzt. Admin-Rechte bleiben bestehen.

## 2. Event anlegen in einem Schritt
Heute muss ein Event zuerst gespeichert werden, und die Ticketarten kommen erst danach auf der Detailseite dazu. Neu:

- Auf der Seite „Neues Event" gibt es direkt einen Bereich **Ticketarten**: Zeilen mit Name, Preis in Euro, Kontingent, optionaler Beschreibung; Zeilen hinzufügen, entfernen und in der Reihenfolge verschieben.
- Drei Vorschläge auf Knopfdruck (Early Bird / Standard / VIP), damit nichts von Hand getippt werden muss.
- Live-Übersicht: Gesamtkontingent aller Ticketarten und möglicher Maximal-Umsatz; Warnung, wenn die Summe der Kontingente über der maximalen Ticketzahl des Events liegt.
- Speichern legt Event und alle Ticketarten zusammen an; bei einem Fehler wird nichts halb angelegt.
- Hinweis pro Zeile, wie der Preis später im Bezahlfenster erscheint (Eventname — Ticketart), plus Warnung bei Beträgen unter 0,50 €, weil solche Zahlungen abgelehnt werden.
- Gratis-Ticketarten (0 €) bleiben möglich, werden aber als „nur in Kombination mit bezahlten Tickets" markiert.

## 3. Ticketarten auf der Detailseite verbessern
- Bestehende Ticketarten sind direkt bearbeitbar (Name, Preis, Kontingent, Beschreibung, Reihenfolge) statt nur aktivieren/deaktivieren.
- Pro Ticketart: verkauft / Kontingent / verbleibend und erzielter Umsatz.
- Der alte Hinweistext zu Rückzahlungen unter der Ticketliste wird entfernt — Tickets sind nicht erstattbar.

## 4. Bezahlung
Preise bleiben dort, wo sie hingehören: in deinen Ticketarten. Der Kauf übernimmt sie automatisch, deshalb ist kein zweiter Produktkatalog nötig — du änderst Preise nur an einer Stelle.

## 5. QR-Codes testen
Kompletter Testdurchlauf im Testmodus:
1. Testevent mit mehreren Ticketarten über die neue Seite anlegen.
2. Kauf mit Testkarte abschließen.
3. Prüfen: Erfolgsseite zeigt Ticket mit QR-Code, dauerhafter Ticket-Link funktioniert.
4. Den QR-Code auslesen und im Scan-Modus einlösen: erst „Gültig", nach dem Bestätigen „Eingelöst", beim zweiten Mal „Bereits verwendet" mit Zeitstempel, bei erfundenem Code „Ungültiger Code".

Ergebnis wird dir mit Screenshots gemeldet; gefundene Fehler behebe ich direkt.

## Technische Details
- Passwort über die Admin-API des Auth-Dienstes setzen.
- Neue Serverfunktion `adminCreateEventWithTypes` (admin-geprüft), die Event und Ticketarten in einem Aufruf anlegt; bestehende `adminSaveTicketType` bleibt für Einzeländerungen.
- `EventForm` erhält einen optionalen `ticketTypes`-Abschnitt (Zeilen-State, Euro↔Cent-Umrechnung, Validierung mit Zod serverseitig gespiegelt).
- Detailseite: `TicketTypes` als editierbares Formular pro Zeile, Verkaufszahlen aus `adminGetEvent` (pro `ticket_type_id` zählen, `status <> 'cancelled'`).
- E2E-Test via Playwright gegen localhost inkl. QR-Dekodierung aus dem gerenderten Bild.
