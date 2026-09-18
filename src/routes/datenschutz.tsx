import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site/PublicLayout";
import { BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({
    meta: [
      { title: `Datenschutz — ${BRAND_NAME}` },
      {
        name: "description",
        content: `Informationen zum Umgang mit personenbezogenen Daten beim Ticketkauf bei ${BRAND_NAME}.`,
      },
      { property: "og:title", content: `Datenschutz — ${BRAND_NAME}` },
      { property: "og:description", content: "Datenschutzhinweise zum Ticketkauf." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DatenschutzPage,
});

function DatenschutzPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <p className="text-eyebrow text-muted-foreground">Rechtliches</p>
        <h1 className="mt-2 text-3xl font-700">Datenschutzerklärung</h1>

        <div className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <strong className="font-600">Platzhalter:</strong> Dieser Text ist eine Vorlage und muss
          vor dem Verkaufsstart rechtlich geprüft und vervollständigt werden.
        </div>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-600 text-foreground">Verantwortlicher</h2>
            <p className="mt-2">
              {BRAND_NAME}, Musterstraße 1, 12345 Musterstadt, tickets@example.com
            </p>
          </section>
          <section>
            <h2 className="text-base font-600 text-foreground">Welche Daten wir verarbeiten</h2>
            <p className="mt-2">
              Beim Ticketkauf verarbeiten wir Name und E-Mail-Adresse, um das Ticket zu
              personalisieren, es dir zuzusenden und den Einlass zu kontrollieren. Zusätzlich
              speichern wir den Kaufzeitpunkt, die gekaufte Ticketkategorie und den Status des
              Tickets (gültig, eingelöst, storniert).
            </p>
          </section>
          <section>
            <h2 className="text-base font-600 text-foreground">Zahlungsabwicklung</h2>
            <p className="mt-2">
              Die Zahlung wird von unserem Zahlungsdienstleister abgewickelt. Zahlungsdaten wie
              Kreditkartennummern werden ausschließlich dort verarbeitet und nicht von uns
              gespeichert.
            </p>
          </section>
          <section>
            <h2 className="text-base font-600 text-foreground">Rechtsgrundlage</h2>
            <p className="mt-2">
              Die Verarbeitung erfolgt zur Erfüllung des Kaufvertrags (Art. 6 Abs. 1 lit. b DSGVO).
            </p>
          </section>
          <section>
            <h2 className="text-base font-600 text-foreground">Speicherdauer</h2>
            <p className="mt-2">
              Wir speichern Kauf- und Ticketdaten solange dies für die Veranstaltung und für
              gesetzliche Aufbewahrungsfristen erforderlich ist.
            </p>
          </section>
          <section>
            <h2 className="text-base font-600 text-foreground">Deine Rechte</h2>
            <p className="mt-2">
              Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der
              Verarbeitung, Datenübertragbarkeit und Widerspruch. Wende dich dazu an die oben
              genannte E-Mail-Adresse.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
