import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarDays, Clock, Loader2, MapPin, Minus, Plus, ShieldCheck } from "lucide-react";
import { getPublicEvent, type PublicEventDetail } from "@/lib/public-events.functions";
import { startCheckout } from "@/lib/checkout.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { CheckoutDialog } from "@/components/checkout/CheckoutDialog";
import { AddToCalendarButton } from "@/components/AddToCalendarButton";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_NAME } from "@/lib/brand";
import { formatDate, formatDateTime, formatPrice, formatTime } from "@/lib/format";

const eventQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public-event", slug],
    queryFn: () => getPublicEvent({ data: { slug } }),
  });

const MAX_TICKETS_PER_ORDER = 3;

export const Route = createFileRoute("/event/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(eventQuery(params.slug)),
  head: ({ loaderData }) => {
    const detail = loaderData as PublicEventDetail | null | undefined;
    if (!detail) {
      return {
        meta: [
          { title: `Veranstaltung nicht verfügbar | ${BRAND_NAME}` },
          { name: "description", content: "Diese Veranstaltung ist nicht verfügbar." },
          { property: "og:title", content: `Veranstaltung nicht verfügbar | ${BRAND_NAME}` },
          { property: "og:description", content: "Diese Veranstaltung ist nicht verfügbar." },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { event } = detail;
    const when = `${formatDate(event.starts_at)}, ${formatTime(event.starts_at)}${
      event.venue_name ? ` · ${event.venue_name}` : ""
    }`;
    const description = `${when}. ${(event.description ?? "").slice(0, 150)}`.trim();
    const image =
      event.cover_image_url && event.cover_image_url.startsWith("https://")
        ? event.cover_image_url
        : null;
    return {
      meta: [
        { title: `${event.title} | ${BRAND_NAME}` },
        { name: "description", content: description },
        { property: "og:title", content: event.title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:locale", content: "de_DE" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: event.title },
        { name: "twitter:description", content: description },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
  errorComponent: ({ error }) => (
    <PublicLayout>
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-700">Veranstaltung konnte nicht geladen werden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Unbekannter Fehler"}
        </p>

      </div>
    </PublicLayout>
  ),
  component: EventPage,
});

function EventPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(eventQuery(slug));

  if (!data) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-700">Veranstaltung nicht gefunden</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dieser Link ist nicht mehr gültig oder die Veranstaltung ist nicht öffentlich.
          </p>
          <Button variant="outline" className="mt-6" asChild>
            <Link to="/">Alle Veranstaltungen</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const { event, ticketTypes, salesState } = data;

  return (
    <PublicLayout>
      {event.cover_image_url ? (
        <div className="relative aspect-[16/10] max-h-[420px] w-full overflow-hidden bg-muted sm:aspect-[21/9]">
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="hero-gradient h-24 w-full sm:h-36" />
      )}

      <div className="mx-auto grid max-w-6xl gap-7 px-4 pb-32 pt-6 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] lg:gap-10 lg:pb-16">
        <div className="min-w-0">
          <p className="text-eyebrow text-muted-foreground">{formatDate(event.starts_at)}</p>
          <h1 className="mt-2 break-words font-display text-2xl font-700 leading-tight sm:text-3xl lg:text-4xl">
            {event.title}
          </h1>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoRow
              icon={<CalendarDays className="size-5" />}
              label="Termin"
              value={formatDateTime(event.starts_at)}
            />
            <InfoRow
              icon={<Clock className="size-5" />}
              label="Einlass / Ende"
              value={
                event.ends_at
                  ? `bis ${formatTime(event.ends_at)}`
                  : `Beginn ${formatTime(event.starts_at)}`
              }
            />
            {(event.venue_name || event.address) && (
              <InfoRow
                icon={<MapPin className="size-5" />}
                label="Ort"
                value={[event.venue_name, event.address].filter(Boolean).join(", ")}
                className="sm:col-span-2"
              />
            )}
          </dl>

          <AddToCalendarButton event={event} className="mt-4 w-full min-[420px]:w-auto" />

          {event.description && (
            <div className="mt-6 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground sm:mt-8 sm:text-[0.975rem]">
              {event.description}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <PurchasePanel detail={data} />
        </div>
      </div>

      <MobileBar detail={data} salesState={salesState} types={ticketTypes} />
    </PublicLayout>
  );
}

function PurchasePanel({ detail }: { detail: PublicEventDetail }) {
  const { ticketTypes, salesState, event } = detail;
  const navigate = useNavigate();
  const checkout = useServerFn(startCheckout);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const total = useMemo(
    () =>
      ticketTypes.reduce((sum, t) => sum + (quantities[t.id] ?? 0) * t.price_cents, 0),
    [quantities, ticketTypes],
  );
  const count = Object.values(quantities).reduce((a, b) => a + b, 0);
  const closed = salesState !== "open";
  const openFree = event.participation_mode === "open_free";
  const freeTicket = event.participation_mode === "free_ticket";

  function change(id: string, delta: number, max: number) {
    setQuantities((q) => {
      const current = q[id] ?? 0;
      const others = Object.values(q).reduce((a, b) => a + b, 0) - current;
      const next = Math.min(Math.max(current + delta, 0), Math.min(max, MAX_TICKETS_PER_ORDER - others));
      return { ...q, [id]: next };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (count === 0) {
      toast.error("Bitte wähle mindestens ein Ticket.");
      return;
    }
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Bitte gib Name und eine gültige E-Mail-Adresse an.");
      return;
    }
    setBusy(true);
    try {
      const res = await checkout({
        data: {
          slug: event.slug,
          buyerName: name.trim(),
          buyerEmail: email.trim(),
          // Free bookings never touch the payment provider, so they work without it.
          environment: total === 0 ? "sandbox" : getStripeEnvironment(),
          returnUrl: `${window.location.origin}/kauf/erfolg?session={CHECKOUT_SESSION_ID}`,
          items: Object.entries(quantities)
            .filter(([, qty]) => qty > 0)
            .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })),
        },
      });
      if ("error" in res) throw new Error(res.error);
      if ("freeSessionId" in res) {
        navigate({ to: "/kauf/erfolg", search: { session: res.freeSessionId } });
      } else {
        setClientSecret(res.clientSecret);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kauf konnte nicht gestartet werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="tickets" className="card-surface scroll-mt-24 p-4 sm:p-6">
      <h2 className="font-display text-lg font-700">{openFree ? "Teilnahme" : "Tickets"}</h2>

      {openFree && (
        <div className="mt-4 rounded-xl border border-success/40 bg-success/10 p-4">
          <p className="font-600 text-success">Offen &amp; kostenlos</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Keine Anmeldung erforderlich. Komm einfach zum angegebenen Termin und Ort vorbei.
          </p>
        </div>
      )}

      {closed && <SalesNotice detail={detail} />}

      {openFree ? null : ticketTypes.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Für diese Veranstaltung sind noch keine Tickets eingerichtet.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-5">
          <ul className="space-y-3">
            {ticketTypes.map((type) => {
              const qty = quantities[type.id] ?? 0;
              const soldOut = type.remaining <= 0;
              return (
                <li
                  key={type.id}
                   className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border p-3"
                >
                   <div className="min-w-0">
                     <p className="break-words font-600">{type.name}</p>
                    {type.description && (
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    )}
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {type.price_cents === 0 ? "Kostenlos" : formatPrice(type.price_cents)} ·{" "}
                      {soldOut ? "ausverkauft" : `${type.remaining} verfügbar`}
                    </p>
                  </div>
                   <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={closed || soldOut || qty === 0}
                      onClick={() => change(type.id, -1, type.remaining)}
                      aria-label={`Ein ${type.name}-Ticket weniger`}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-6 text-center font-600">{qty}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={closed || soldOut || qty >= type.remaining || count >= MAX_TICKETS_PER_ORDER}
                      onClick={() => change(type.id, 1, type.remaining)}
                      aria-label={`Ein ${type.name}-Ticket mehr`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="buyer-name">Name *</Label>
              <Input
                id="buyer-name"
                required
                maxLength={120}
                value={name}
                disabled={closed}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vor- und Nachname"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="buyer-email">E-Mail *</Label>
              <Input
                id="buyer-email"
                type="email"
                required
                maxLength={200}
                value={email}
                disabled={closed}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@beispiel.de"
              />
              <p className="text-xs text-muted-foreground">
                An diese Adresse senden wir dein Ticket mit QR-Code.
              </p>
            </div>
          </div>

           <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">
              {count} {count === 1 ? "Ticket" : "Tickets"}
            </span>
            <span className="font-display text-xl font-700">{formatPrice(total)}</span>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={closed || busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {closed ? salesButtonLabel(detail) : freeTicket ? "Kostenlos anmelden" : "Jetzt kaufen"}
          </Button>

          {freeTicket ? (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              Dein persönliches QR-Ticket wird sofort erstellt.
            </p>
          ) : (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              Sichere Zahlung, keine Kartendaten bei uns gespeichert.
            </p>
          )}

          {!freeTicket && (
            <p className="rounded-lg bg-muted/60 p-3 text-center text-xs text-muted-foreground">
              Alle Tickets sind vom Umtausch ausgeschlossen: Ein Storno oder eine
              Rückerstattung ist nach dem Kauf nicht möglich.
            </p>
          )}
        </form>
      )}

      <CheckoutDialog clientSecret={clientSecret} onClose={() => setClientSecret(null)} />
    </div>
  );
}

function SalesNotice({ detail }: { detail: PublicEventDetail }) {
  const { salesState, event } = detail;
  const salesStart = event.sales_start_at;
  const text =
    salesState === "paused"
      ? "Der Ticketverkauf ist aktuell pausiert. Schau später wieder vorbei."
      : salesState === "not_started"
      ? salesStart
        ? `Der Verkauf startet am ${formatDateTime(salesStart)}.`
        : "Der Verkauf hat noch nicht begonnen."
      : salesState === "ended"
        ? "Der Verkauf für diese Veranstaltung ist beendet."
        : salesState === "sold_out"
          ? "Diese Veranstaltung ist ausverkauft."
          : "Für diese Veranstaltung sind derzeit keine Tickets im Verkauf.";
  return (
    <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3.5 text-sm">{text}</p>
  );
}

function salesButtonLabel(detail: PublicEventDetail): string {
  switch (detail.salesState) {
    case "sold_out":
      return "Ausverkauft";
    case "paused":
      return "Verkauf pausiert";
    case "not_started":
      return "Verkauf noch nicht gestartet";
    case "ended":
      return "Verkauf beendet";
    default:
      return "Nicht verfügbar";
  }
}

function MobileBar({
  detail,
  salesState,
  types,
}: {
  detail: PublicEventDetail;
  salesState: string;
  types: PublicEventDetail["ticketTypes"];
}) {
  const min = types.length ? Math.min(...types.map((t) => t.price_cents)) : null;
  const openFree = detail.event.participation_mode === "open_free";
  const freeTicket = detail.event.participation_mode === "free_ticket";
  return (
     <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-3 py-2.5 shadow-bar backdrop-blur lg:hidden">
       <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
         <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {openFree ? "Offenes Treffen" : salesState === "sold_out" ? "Ausverkauft" : "Tickets"}
          </p>
          <p className="font-display text-base font-700">
            {openFree ? "Freier Eintritt" : min === null ? "Nicht angegeben" : min === 0 ? "Kostenlos" : `ab ${formatPrice(min)}`}
          </p>
        </div>
        {!openFree && (
           <Button asChild size="lg" className="max-w-[58vw]" disabled={salesState !== "open"}>
            <a href="#tickets">
              {salesState === "open"
                ? freeTicket
                  ? "Kostenlos anmelden"
                  : "Tickets wählen"
                : salesButtonLabel(detail)}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 gap-3 rounded-xl border border-border bg-card p-3.5 sm:p-4 ${className ?? ""}`}>
      <span className="shrink-0 text-accent">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words font-500">{value}</dd>
      </div>
    </div>
  );
}
