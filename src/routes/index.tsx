import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, QrCode, ShieldCheck } from "lucide-react";
import { listPublicEvents } from "@/lib/public-events.functions";
import { PublicLayout } from "@/components/site/PublicLayout";
import { EventCard } from "@/components/site/EventCard";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

const eventsQuery = queryOptions({
  queryKey: ["public-events"],
  queryFn: () => listPublicEvents(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery),
  head: () => ({
    meta: [
      { title: `${BRAND_NAME} — Tickets für kommende Veranstaltungen` },
      {
        name: "description",
        content:
          "Alle kommenden Veranstaltungen auf einen Blick: Tickets online kaufen, personalisiertes Ticket mit QR-Code erhalten und direkt am Eingang einlösen.",
      },
      { property: "og:title", content: `${BRAND_NAME} — Tickets für kommende Veranstaltungen` },
      {
        property: "og:description",
        content: "Tickets online kaufen und mit QR-Code direkt am Eingang einlösen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <PublicLayout>
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-700">Events konnten nicht geladen werden</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </PublicLayout>
  ),
  component: HomePage,
});

function HomePage() {
  const { data: events } = useSuspenseQuery(eventsQuery);
  const upcoming = events.filter((e) => e.salesState !== "ended");
  const past = events.filter((e) => e.salesState === "ended");

  return (
    <PublicLayout>
      <section className="surface-ink">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-eyebrow text-accent">Veranstaltungen &amp; Tickets</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-700 leading-[1.08] tracking-tight sm:text-5xl">
            Tickets kaufen, Ticket aufs Handy, rein in die Veranstaltung.
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink-muted sm:text-lg">{BRAND_TAGLINE}</p>
          <ul className="mt-9 grid gap-4 sm:grid-cols-3">
            <Feature
              icon={<CalendarDays className="size-5" />}
              title="Alle Termine"
              text="Kommende Veranstaltungen mit Preisen und Restplätzen."
            />
            <Feature
              icon={<QrCode className="size-5" />}
              title="Ticket mit QR-Code"
              text="Personalisiert, sofort nach der Zahlung verfügbar."
            />
            <Feature
              icon={<ShieldCheck className="size-5" />}
              title="Sicherer Einlass"
              text="Jeder Code ist einmalig und nur einmal einlösbar."
            />
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="font-display text-2xl font-700">Kommende Veranstaltungen</h2>
        {upcoming.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Derzeit sind keine Veranstaltungen im Verkauf. Schau bald wieder vorbei.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mt-16 font-display text-xl font-700 text-muted-foreground">
              Vergangene Veranstaltungen
            </h2>
            <div className="mt-6 grid gap-5 opacity-70 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}
      </section>
    </PublicLayout>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <li className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
        {icon}
      </span>
      <h3 className="mt-3 font-display text-base font-600">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{text}</p>
    </li>
  );
}
