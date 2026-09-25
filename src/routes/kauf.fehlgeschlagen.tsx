import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { XCircle } from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/kauf/fehlgeschlagen")({
  validateSearch: z.object({ event: z.string().optional() }),
  head: () => ({
    meta: [
      { title: `Zahlung abgebrochen | ${BRAND_NAME}` },
      {
        name: "description",
        content: "Die Zahlung wurde nicht abgeschlossen. Du kannst den Ticketkauf erneut starten.",
      },
      { property: "og:title", content: `Zahlung abgebrochen | ${BRAND_NAME}` },
      { property: "og:description", content: "Die Zahlung wurde nicht abgeschlossen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FailurePage,
});

function FailurePage() {
  const { event } = Route.useSearch();

  return (
    <PublicLayout>
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <XCircle className="size-6" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-700">Zahlung nicht abgeschlossen</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Es wurde kein Betrag abgebucht und es wurden keine Tickets ausgestellt. Du kannst den Kauf
          jederzeit erneut starten.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          {event ? (
            <Button asChild size="lg">
              <Link to="/event/$slug" params={{ slug: event }}>
                Erneut versuchen
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link to="/">Veranstaltungen ansehen</Link>
            </Button>
          )}
          <Button variant="outline" size="lg" asChild>
            <Link to="/">Zur Startseite</Link>
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
}
