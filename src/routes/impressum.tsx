import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site/PublicLayout";
import { BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [
      { title: `Impressum | ${BRAND_NAME}` },
      { name: "description", content: `Impressum und Anbieterkennzeichnung der ${BRAND_NAME}.` },
      { property: "og:title", content: `Impressum | ${BRAND_NAME}` },
      { property: "og:description", content: `Impressum der ${BRAND_NAME}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ImpressumPage,
});

function ImpressumPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <p className="text-eyebrow text-muted-foreground">Rechtliches</p>
        <h1 className="mt-2 text-3xl font-700">Impressum</h1>

        <div className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <strong className="font-600">Platzhalter:</strong> Bitte ersetze die folgenden Angaben
            durch die echte Anschrift und Telefonnummer des Veranstalters.
        </div>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-600 text-foreground">Angaben gemäß § 5 DDG</h2>
            <p className="mt-2">
              {BRAND_NAME}
              <br />
              Musterstraße 1<br />
              12345 Musterstadt
              <br />
              Deutschland
            </p>
          </section>
          <section>
            <h2 className="text-base font-600 text-foreground">Kontakt</h2>
            <p className="mt-2">
              E-Mail: tickets@example.com
              <br />
              Telefon: +49 000 000000
            </p>
          </section>
          <section>
            <h2 className="text-base font-600 text-foreground">Vertreten durch</h2>
            <p className="mt-2">Alexander Albert</p>
          </section>
          <section>
            <h2 className="text-base font-600 text-foreground">
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <p className="mt-2">Alexander Albert, Anschrift wie oben</p>
          </section>
          <section>
            <h2 className="text-base font-600 text-foreground">Streitschlichtung</h2>
            <p className="mt-2">
              Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor
              einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
