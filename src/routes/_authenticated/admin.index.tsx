import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarPlus, Loader2, Ticket, TrendingUp, Users } from "lucide-react";
import { adminListEvents } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { formatDateTimeShort, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-muted-foreground">Übersicht</p>
          <h1 className="font-display text-3xl font-700">Events</h1>
        </div>
        <Button asChild>
          <Link to="/admin/events/new">
            <CalendarPlus className="size-4" />
            Neues Event
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
              className="block rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-600">{event.title}</h2>
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
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTimeShort(event.starts_at)}
                    {event.venue_name ? ` · ${event.venue_name}` : ""} · /event/{event.slug}
                  </p>
                </div>
                <dl className="flex gap-6 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Verkauft</dt>
                    <dd className="font-600">
                      {event.ticketsSold}
                      {event.capacity ? ` / ${event.capacity}` : ""}
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
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-700">{value}</p>
    </div>
  );
}
