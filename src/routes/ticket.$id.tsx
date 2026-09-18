import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/site/PublicLayout";
import { TicketCard } from "@/components/ticket/TicketCard";
import { getTicketById } from "@/lib/tickets.functions";
import { BRAND_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";

const ticketQuery = (id: string) =>
  queryOptions({
    queryKey: ["ticket", id],
    queryFn: () => getTicketById({ data: { id } }),
  });

export const Route = createFileRoute("/ticket/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(ticketQuery(params.id)),
  head: () => ({
    meta: [
      { title: `Dein Ticket — ${BRAND_NAME}` },
      {
        name: "description",
        content: "Dein persönliches Ticket mit QR-Code für den Einlass zur Veranstaltung.",
      },
      { property: "og:title", content: `Dein Ticket — ${BRAND_NAME}` },
      { property: "og:description", content: "Persönliches Ticket mit QR-Code." },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <PublicLayout>
      <Message
        title="Ticket konnte nicht geladen werden"
        text="Bitte prüfe den Link aus deiner Bestätigung und versuche es erneut."
      />
    </PublicLayout>
  ),
  component: TicketPage,
});

function TicketPage() {
  const { id } = Route.useParams();
  const { data: ticket } = useSuspenseQuery(ticketQuery(id));

  if (!ticket) {
    return (
      <PublicLayout>
        <Message
          title="Ticket nicht gefunden"
          text="Dieser Ticket-Link ist ungültig. Bitte nutze den Link aus deiner Bestätigung."
        />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <p className="text-eyebrow text-muted-foreground">Dein Ticket</p>
        <h1 className="mt-2 font-display text-2xl font-700">{ticket.event.title}</h1>
        <div className="mt-6">
          <TicketCard ticket={ticket} />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Speichere diesen Link oder mach einen Screenshot — am Eingang wird nur der QR-Code
          gescannt.
        </p>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" asChild>
            <Link to="/event/$slug" params={{ slug: ticket.event.slug }}>
              Zur Veranstaltung
            </Link>
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-700">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      <Button variant="outline" className="mt-6" asChild>
        <Link to="/">Zur Startseite</Link>
      </Button>
    </div>
  );
}
