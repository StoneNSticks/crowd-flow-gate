import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { getTicketsBySession } from "@/lib/tickets.functions";
import { PublicLayout } from "@/components/site/PublicLayout";
import { TicketCard } from "@/components/ticket/TicketCard";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/kauf/erfolg")({
  validateSearch: z.object({ session: z.string().optional() }),
  head: () => ({
    meta: [
      { title: `Ticket bestätigt | ${BRAND_NAME}` },
      {
        name: "description",
        content: "Deine Tickets sind bereit: QR-Code anzeigen, speichern oder per E-Mail erhalten.",
      },
      { property: "og:title", content: `Ticket bestätigt | ${BRAND_NAME}` },
      { property: "og:description", content: "Deine Tickets mit QR-Code sind bereit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { session } = Route.useSearch();
  const fetchTickets = useServerFn(getTicketsBySession);

  const { data, isPending } = useQuery({
    queryKey: ["order-tickets", session],
    queryFn: () => fetchTickets({ data: { sessionId: session ?? "" } }),
    enabled: Boolean(session),
    refetchInterval: (query) => (query.state.data?.status === "paid" ? false : 2500),
  });

  if (!session) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-700">Kein Kauf gefunden</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Bitte öffne die Bestätigungsseite über den Link nach der Zahlung.
          </p>
          <Button variant="outline" className="mt-6" asChild>
            <Link to="/">Zur Startseite</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const tickets = data?.tickets ?? [];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="size-6" />
          <p className="font-display text-lg font-700">Ticket erfolgreich erstellt</p>
        </div>
        <h1 className="mt-3 font-display text-2xl font-700">
          {tickets.length > 1 ? "Deine Tickets" : "Dein Ticket"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dein Ticket ist bereit. Am Eingang wird nur der QR-Code gescannt.
        </p>

        {(isPending || data?.status !== "paid") && tickets.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Dein Ticket wird erstellt. Es erscheint in wenigen Sekunden automatisch.
            </p>
          </div>
        )}

        <div className="mt-8 space-y-6">
          {tickets.map((ticket) => (
            <div key={ticket.id}>
              <TicketCard ticket={ticket} />
              <div className="mt-3 text-center">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/ticket/$id" params={{ id: ticket.id }}>
                    Dauerhafter Ticket-Link
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 rounded-lg bg-muted/60 p-4 text-center text-xs text-muted-foreground">
          Hinweis: Tickets sind vom Umtausch ausgeschlossen. Ein Storno oder eine
          Rückerstattung ist nach dem Kauf nicht möglich.
        </p>
      </div>
    </PublicLayout>
  );
}
