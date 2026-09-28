import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarPlus, Loader2, Ticket, TrendingUp, Users } from "lucide-react";
import { adminListEvents } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { formatDateTimeShort, formatMoney } from "@/lib/format";
import { BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: `Events verwalten | ${BRAND_NAME}` },
      { name: "description", content: "Events, Tickets und Verkaufszahlen verwalten." },
      { property: "og:title", content: `Events verwalten | ${BRAND_NAME}` },
      { property: "og:description", content: "Geschützte Eventübersicht." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const listEvents = useServerFn(adminListEvents);
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => listEvents(),
  });

  useMutation({ mutationFn: async () => queryClient.invalidateQueries() });

  const totals = (data ?? []).reduce(
    (acc, e) => ({
      sold: acc.sold + e.ticketsSold,
      revenue: acc.revenue + e.revenueCents,
      redeemed: acc.redeemed + e.ticketsRedeemed,
    }),
    { sold: 0, revenue: 0, redeemed: 0 },
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <p className="text-eyebrow text-muted-foreground">Übersicht</p>
          <h1 className="font-display text-2xl font-700 sm:text-3xl">Events</h1>
        </div>
        <Button className="px-3 sm:px-4" asChild>
          <Link to="/admin/events/new">
            <CalendarPlus className="size-4" />
            Neues Event
          </Link>
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
        <Stat icon={<Ticket className="size-4" />} label="Verkaufte Tickets" value={String(totals.sold)} />
        <Stat icon={<Users className="size-4" />} label="Eingelöst" value={String(totals.redeemed)} />
        <Stat
          icon={<TrendingUp className="size-4" />}
          label="Umsatz"
          value={formatMoney(totals.revenue)}
        />
      </div>

      {isPending && (
        <div className="mt-10 flex justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {error && (
        <p className="mt-8 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {(error as Error).message}
        </p>
      )}

      {data && data.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <h2 className="font-display text-lg font-600">Noch kein Event angelegt</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Lege dein erstes Event an, ergänze Ticketkategorien und teile den Link.
          </p>
          <Button asChild className="mt-5">
            <Link to="/admin/events/new">Event anlegen</Link>
          </Button>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="mt-8 space-y-3">
          {data.map((event) => (
            <Link
              key={event.id}
              to="/admin/events/$id"
              params={{ id: event.id }}
             className="block min-w-0 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md sm:p-5"
            >
               <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                 <div className="min-w-0">
                   <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                     <h2 className="break-words font-display text-base font-600 sm:text-lg">{event.title}</h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.7rem] font-600 ${
                        event.is_active
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {event.is_active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>
                   <p className="mt-1 break-all text-xs text-muted-foreground sm:text-sm">
                    {formatDateTimeShort(event.starts_at)}
                    {event.venue_name ? `, ${event.venue_name}` : ""} | /event/{event.slug}
                  </p>
                </div>
                 <dl className="grid grid-cols-3 gap-3 text-sm lg:min-w-72 lg:gap-6">
                  <div>
                    <dt className="text-muted-foreground">
                      {event.participation_mode === "open_free" ? "Teilnahme" : "Verkauft"}
                    </dt>
                    <dd className="font-600">
                      {event.participation_mode === "open_free"
                        ? "Offen"
                        : `${event.ticketsSold}${event.capacity ? ` / ${event.capacity}` : ""}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Eingelöst</dt>
                    <dd className="font-600">{event.ticketsRedeemed}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Umsatz</dt>
                    <dd className="font-600">{formatMoney(event.revenueCents)}</dd>
                  </div>
                </dl>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-3.5 sm:p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
       <p className="mt-2 break-words font-display text-xl font-700 sm:text-2xl">{value}</p>
    </div>
  );
}
