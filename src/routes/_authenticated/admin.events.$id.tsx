import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import {
  adminCancelTicket,
  adminDeleteEvent,
  adminDeleteTicketType,
  adminGetEvent,
  adminSaveEvent,
  adminSaveTicketType,
} from "@/lib/admin.functions";
import { EventForm, type EventFormValues } from "@/components/admin/EventForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTimeShort, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/events/$id")({
  component: EventDetailPage,
});

function EventDetailPage() {
  const { id } = Route.useParams();
  const getEvent = useServerFn(adminGetEvent);
  const saveEvent = useServerFn(adminSaveEvent);
  const deleteEvent = useServerFn(adminDeleteEvent);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isPending, error } = useQuery({
    queryKey: ["admin-event", id],
    queryFn: () => getEvent({ data: { id } }),
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-event", id] }),
      queryClient.invalidateQueries({ queryKey: ["admin-events"] }),
    ]);

  const saveMutation = useMutation({
    mutationFn: (values: EventFormValues) => saveEvent({ data: { ...values, id } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Änderungen gespeichert.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent({ data: { id } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Event gelöscht.");
      navigate({ to: "/admin" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isPending) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-700">Event nicht gefunden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as Error | null)?.message ?? "Bitte zurück zur Übersicht."}
        </p>
        <Button variant="outline" className="mt-6" asChild>
          <Link to="/admin">Zur Übersicht</Link>
        </Button>
      </div>
    );
  }

  const { event, ticketTypes, tickets, stats } = data as any;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Zurück zur Übersicht
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-eyebrow text-muted-foreground">
            {formatDateTimeShort(event.starts_at)}
          </p>
          <h1 className="font-display text-3xl font-700">{event.title}</h1>
        </div>
        <Button variant="outline" asChild>
          <a href={`/event/${event.slug}`} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            Öffentliche Seite
          </a>
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Verkauft" value={`${stats.sold}${stats.capacity ? ` / ${stats.capacity}` : ""}`} />
        <Stat label="Eingelöst" value={`${stats.redeemed}`} />
        <Stat label="Offen" value={`${stats.open}`} />
        <Stat label="Umsatz" value={formatMoney(stats.revenueCents)} />
      </div>

      <Tabs defaultValue="tickets" className="mt-8">
        <TabsList>
          <TabsTrigger value="tickets">Tickets ({tickets.length})</TabsTrigger>
          <TabsTrigger value="types">Kategorien ({ticketTypes.length})</TabsTrigger>
          <TabsTrigger value="settings">Einstellungen</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-5">
          <TicketList eventId={id} tickets={tickets} onChanged={refresh} />
        </TabsContent>

        <TabsContent value="types" className="mt-5">
          <TicketTypes eventId={id} types={ticketTypes} onChanged={refresh} />
        </TabsContent>

        <TabsContent value="settings" className="mt-5">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
            <EventForm
              initial={toFormValues(event)}
              busy={saveMutation.isPending}
              onSubmit={(values) => saveMutation.mutate(values)}
            />
          </div>
          <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
            <h2 className="font-600">Event löschen</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Löscht das Event mit allen Kategorien und Tickets. Besser: Event auf „inaktiv“ setzen.
            </p>
            <Button
              variant="destructive"
              className="mt-4"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm("Event wirklich endgültig löschen?")) deleteMutation.mutate();
              }}
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Endgültig löschen
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TicketList({
  eventId,
  tickets,
  onChanged,
}: {
  eventId: string;
  tickets: any[];
  onChanged: () => Promise<unknown>;
}) {
  const cancelTicket = useServerFn(adminCancelTicket);
  const refundOrder = useServerFn(adminRefundOrder);
  const [query, setQuery] = useState("");

  const mutation = useMutation({
    mutationFn: (ticketId: string) => cancelTicket({ data: { id: ticketId } }),
    onSuccess: async () => {
      await onChanged();
      toast.success("Ticket storniert.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const refundMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await refundOrder({
        data: { ticketId, environment: getStripeEnvironment() },
      });
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: async (res) => {
      await onChanged();
      toast.success(
        res.refunded
          ? "Betrag erstattet, Tickets der Bestellung sind ungültig."
          : "Tickets der Bestellung sind ungültig (keine Zahlung gefunden).",
      );
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) =>
      [t.holder_name, t.holder_email, t.code, t.ticket_type_name]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(q)),
    );
  }, [query, tickets]);

  return (
    <div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Suche nach Name, E-Mail, Code oder Kategorie"
        className="max-w-sm"
      />
      {filtered.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {tickets.length === 0 ? "Noch keine Tickets verkauft." : "Keine Treffer."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-500">Käufer</th>
                <th className="px-4 py-3 font-500">Kategorie</th>
                <th className="px-4 py-3 font-500">Status</th>
                <th className="px-4 py-3 font-500">Gekauft</th>
                <th className="px-4 py-3 font-500">Code</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-500">{t.holder_name}</div>
                    <div className="text-xs text-muted-foreground">{t.holder_email}</div>
                  </td>
                  <td className="px-4 py-3">{t.ticket_type_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                    {t.redeemed_at && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTimeShort(t.redeemed_at)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTimeShort(t.created_at)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{t.code.slice(0, 10)}…</td>
                  <td className="px-4 py-3 text-right">
                    {t.status !== "cancelled" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={mutation.isPending}
                        onClick={() => {
                          if (confirm(`Ticket von ${t.holder_name} stornieren?`))
                            mutation.mutate(t.id);
                        }}
                      >
                        Stornieren
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Rückzahlungen werden beim Zahlungsdienstleister ausgelöst; das Ticket wird hier sofort
        ungültig. Event-ID: {eventId.slice(0, 8)}
      </p>
    </div>
  );
}

function TicketTypes({
  eventId,
  types,
  onChanged,
}: {
  eventId: string;
  types: any[];
  onChanged: () => Promise<unknown>;
}) {
  const saveType = useServerFn(adminSaveTicketType);
  const deleteType = useServerFn(adminDeleteTicketType);
  const [draft, setDraft] = useState({ name: "", price: "", quantity: "" });

  const save = useMutation({
    mutationFn: (payload: any) => saveType({ data: payload }),
    onSuccess: async () => {
      await onChanged();
      setDraft({ name: "", price: "", quantity: "" });
      toast.success("Kategorie gespeichert.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteType({ data: { id } }),
    onSuccess: async (res: any) => {
      await onChanged();
      toast.success(
        res?.deactivated
          ? "Kategorie deaktiviert (es existieren bereits Tickets)."
          : "Kategorie gelöscht.",
      );
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      {types.map((t) => (
        <div
          key={t.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <div>
            <p className="font-600">
              {t.name}{" "}
              {!t.is_active && (
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground">
                  inaktiv
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatMoney(t.price_cents)} · Kontingent {t.quantity}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                save.mutate({
                  id: t.id,
                  event_id: eventId,
                  name: t.name,
                  description: t.description ?? null,
                  price_cents: t.price_cents,
                  quantity: t.quantity,
                  sort_order: t.sort_order,
                  is_active: !t.is_active,
                })
              }
            >
              {t.is_active ? "Deaktivieren" : "Aktivieren"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm(`Kategorie „${t.name}“ entfernen?`)) remove.mutate(t.id);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}

      <form
        className="rounded-2xl border border-dashed border-border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const price = Number(draft.price.replace(",", "."));
          const quantity = Number(draft.quantity);
          if (!draft.name.trim() || Number.isNaN(price) || Number.isNaN(quantity)) {
            toast.error("Bitte Name, Preis und Kontingent angeben.");
            return;
          }
          save.mutate({
            event_id: eventId,
            name: draft.name.trim(),
            description: null,
            price_cents: Math.round(price * 100),
            quantity,
            sort_order: types.length,
            is_active: true,
          });
        }}
      >
        <h3 className="font-600">Kategorie hinzufügen</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Standard"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Preis (€)</Label>
            <Input
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              placeholder="19,90"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kontingent</Label>
            <Input
              value={draft.quantity}
              onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
              placeholder="100"
              inputMode="numeric"
            />
          </div>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Hinzufügen
          </Button>
        </div>
      </form>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    valid: { label: "Gültig", className: "bg-success/15 text-success" },
    redeemed: { label: "Eingelöst", className: "bg-primary/10 text-primary" },
    cancelled: { label: "Storniert", className: "bg-destructive/10 text-destructive" },
  };
  const entry = map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-600 ${entry.className}`}>
      {entry.label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-700">{value}</p>
    </div>
  );
}

function toFormValues(event: any): EventFormValues {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    venue_name: event.venue_name,
    address: event.address,
    cover_image_url: event.cover_image_url,
    sales_start_at: event.sales_start_at,
    sales_end_at: event.sales_end_at,
    max_tickets: event.max_tickets,
    is_active: event.is_active,
  };
}
