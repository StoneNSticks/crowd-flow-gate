# Goethe Event Initiative — Ticketing-Plattform

Eine eigenständige Ticketing-Webapp: öffentliche Eventseiten, Online-Kauf mit Karte, personalisierte Tickets mit QR-Code, Admin-Bereich und mobiler Einlass-Scanner. Kein Fremd-Branding, kein Badge, kein Watermark.

## Öffentliche Seiten

- **Startseite**: Übersicht aller aktiven/kommenden Events, großes Bild, Datum, Ort, Preis ab.
- **Eventseite** (`/event/sommerfest-2026`): Coverbild groß, Name, Beschreibung, Datum & Uhrzeit, Ort mit Adresse, alle Ticketkategorien mit Preis und Restplätzen, gut sichtbarer Kaufbereich (auf dem Handy als fixierte Leiste unten).
  - Zustände klar sichtbar: „Ausverkauft", „Verkauf startet am …", „Verkauf beendet".
- **Kauf**: Kategorie + Anzahl wählen, Name und E-Mail (Pflicht), dann Weiterleitung zur sicheren Bezahlseite.
- **Erfolgsseite**: zeigt die Tickets sofort mit QR-Code, Event-Details und Ticket-ID.
- **Fehlerseite** bei abgebrochener/fehlgeschlagener Zahlung mit „Erneut versuchen".
- **Ticket-Link** (`/ticket/<id>`): Käufer kann sein Ticket jederzeit erneut aufrufen; zeigt auch „eingelöst"/„storniert".
- **Impressum** und **Datenschutz** als Platzhalterseiten (Inhalte trägst du später ein — ich fülle nur Struktur und Beispieltext ein und markiere ihn als Platzhalter).

## Admin-Bereich (Login geschützt)

- Login per E-Mail/Passwort. Zwei Rollen: **Admin** (alles) und **Scanner** (nur Scan-Modus).
- **Events**: anlegen, bearbeiten, deaktivieren, löschen; Bild-Upload; beliebig viele Ticketkategorien mit eigenem Preis und Kontingent; Verkaufsstart/-ende.
- **Dashboard pro Event**: verkaufte Tickets, Umsatz, verbleibende Kapazität, eingelöst vs. offen.
- **Ticketliste pro Event**: Käufername, E-Mail, Kategorie, Status, Suche; einzelnes Ticket stornieren (inkl. Rückzahlung über den Zahlungsanbieter, wo möglich).
- **Scan-Modus**: mobil optimiert, Kamera-QR-Scan plus manuelle Code-Eingabe als Fallback.
  - Grün „Gültig" mit Käufername und Kategorie → Button „Einlass bestätigen".
  - Rot „Bereits verwendet" mit Zeitstempel der ersten Einlösung.
  - Rot „Ungültiger Code".
  - Deutliche Lade- und Fehlerzustände bei schlechter Verbindung.

## Tickets & E-Mail

- Ticket-Codes werden erst nach bestätigter Zahlung erzeugt, kryptographisch zufällig und nicht erratbar.
- Jedes Ticket wird als QR-Code dargestellt.
- Ticket-E-Mail mit QR-Code und Event-Details geht automatisch an den Käufer. Dafür brauche ich eine Absender-Domain, die dir gehört — die richten wir im Zuge des Baus ein; bis zur Freigabe der Domain sind die Tickets über Erfolgsseite und persönlichen Link verfügbar.

## Sicherheit

- Einlösen wird ausschließlich serverseitig geprüft und atomar gesetzt: ein Ticket kann nur einmal eingelöst werden, auch bei Doppelklick oder zwei Scannern gleichzeitig.
- Admin-Routen komplett hinter Login; Scanner-Rolle kommt nicht an Umsatz- und Käuferlisten.
- Keine Kartendaten in der App — die Zahlung läuft vollständig beim Zahlungsanbieter; Tickets entstehen erst über die verifizierte Zahlungsbestätigung, nicht über die Rückleitung im Browser.

## Design

Modern, klar, vertrauenswürdig: neutrales eigenes Branding „Goethe Event Initiative", großzügige Eventbilder, klare Preis-/Kaufhierarchie, tiefes Nachtblau mit warmem Akzent, kräftige Headline-Typografie. Mobile-first, da die meisten Käufer über geteilte Links kommen.

## Technische Umsetzung

- **Backend**: Lovable Cloud (Datenbank, Auth, Bild-Storage, Serverlogik).
- **Tabellen**: `events` (slug, Titel, Beschreibung, Start/Ende, Ort, Adresse, Bild, Verkaufsfenster, Status), `ticket_types` (event_id, Name, Preis in Cent, Kontingent, Sortierung), `orders` (Käufer, Betrag, Zahlungs-Session, Status), `tickets` (order_id, event_id, ticket_type_id, Käufername/-mail, `code`, Status `valid|redeemed|cancelled`, `redeemed_at`, `redeemed_by`), `user_roles` + `has_role()` (Rollen in eigener Tabelle, nie im Profil).
- **RLS**: anon darf nur aktive Events und Ticketkategorien lesen; Tickets/Orders nie öffentlich lesbar — öffentlicher Ticketabruf und Scan laufen über Serverfunktionen. Admin-Leserechte über `has_role`.
- **Zahlung**: Lovable-Payments (Stripe Checkout, Seller-Land Deutschland). Checkout-Session per Serverfunktion; Ticket-Erstellung im verifizierten Webhook unter `/api/public/...`, idempotent pro Session.
- **Kapazität**: Restplätze serverseitig gegen verkaufte Tickets geprüft, Reservierung beim Checkout-Start, Verfall bei Abbruch.
- **Codes**: `crypto.getRandomValues`, 128-Bit base32, unique Index.
- **Scan/Einlösen**: Serverfunktion mit `UPDATE … WHERE status='valid'` und Rückgabe des betroffenen Rows — reine Serverentscheidung.
- **QR**: `qrcode` (Web/Data-URL für Seite und E-Mail).
- **E-Mail**: Lovable-Email-Infrastruktur mit React-Email-Template; Versand im Webhook, idempotent pro Ticket.
- **Kein Lovable-Badge**: Badge-Sichtbarkeit wird deaktiviert.

## Reihenfolge

1. Cloud aktivieren, Schema + RLS, Rollen, Storage-Bucket.
2. Design-System und öffentliche Seiten (Start, Event, Impressum/Datenschutz).
3. Auth + Admin (Events, Kategorien, Dashboard, Ticketliste, Storno).
4. Zahlung: Checkout-Serverfunktion, Webhook, Erfolgs-/Fehlerseite, Ticketseite.
5. E-Mail-Domain + Ticket-E-Mail.
6. Scan-Modus.
7. Demo-Event zum Testen, Durchlauf prüfen.
