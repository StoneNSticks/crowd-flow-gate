import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPublicEvents } from "@/lib/public-events.functions";
import { PublicLayout } from "@/components/site/PublicLayout";
import { EventCard } from "@/components/site/EventCard";
import { BRAND_NAME } from "@/lib/brand";

const eventsQuery = queryOptions({
  queryKey: ["public-events"],
  queryFn: () => listPublicEvents(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery),
  head: () => ({
    meta: [
      { title: `${BRAND_NAME} | Studentische Initiative in Frankfurt` },
      {
        name: "description",
        content:
          "Goethe Connected bringt Studierende zusammen: Treffen, Partys und Veranstaltungen zum Kennenlernen. Alle kommenden Events auf einen Blick.",
      },
      { property: "og:title", content: `${BRAND_NAME} | Wir bringen Studierende zusammen` },
      {
        property: "og:description",
        content: "Treffen, Partys und Events von Studierenden für Studierende. Komm vorbei und sei dabei.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "de_DE" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${BRAND_NAME} | Wir bringen Studierende zusammen` },
      { name: "twitter:description", content: "Treffen, Partys und Events von Studierenden für Studierende." },
    ],
  }),
  errorComponent: ({ error }) => (
    <PublicLayout>
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-700">Events konnten nicht geladen werden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Unbekannter Fehler"}
        </p>

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
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
          <p className="text-eyebrow text-accent">Studentische Initiative</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-700 leading-tight sm:text-4xl lg:text-5xl">
            Wir bringen Studierende zusammen.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-ink-muted sm:text-base lg:text-lg">
            Goethe Connected ist eine Initiative von Studierenden für Studierende. Wir organisieren Treffen, Partys und
            Veranstaltungen, bei denen man neue Leute kennenlernt. Komm vorbei und sei dabei.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
        <h2 className="font-display text-2xl font-700">Kommende Veranstaltungen</h2>
        {upcoming.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Derzeit sind keine Veranstaltungen im Verkauf. Schau bald wieder vorbei.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mt-12 font-display text-xl font-700 text-muted-foreground">
              Vergangene Veranstaltungen
            </h2>
            <div className="mt-5 grid gap-4 opacity-70 sm:grid-cols-2 xl:grid-cols-3">
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

