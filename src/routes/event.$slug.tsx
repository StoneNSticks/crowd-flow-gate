import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarDays, Clock, Loader2, MapPin, Minus, Plus, ShieldCheck } from "lucide-react";
import { getPublicEvent, type PublicEventDetail } from "@/lib/public-events.functions";
import { startCheckout } from "@/lib/checkout.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { CheckoutDialog } from "@/components/checkout/CheckoutDialog";
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

export const Route = createFileRoute("/event/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(eventQuery(params.slug)),
  head: ({ loaderData }) => {
    const detail = loaderData as PublicEventDetail | null | undefined;
    if (!detail) {
      return {
        meta: [
          { title: `Veranstaltung nicht verfügbar — ${BRAND_NAME}` },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { event } = detail;
    const description =
      (event.description ?? "").slice(0, 180) ||
      `Tickets für ${event.title} am ${formatDate(event.starts_at)}${
        event.venue_name ? ` in ${event.venue_name}` : ""
      }.`;
    const image =
      event.cover_image_url && event.cover_image_url.startsWith("https://")
        ? event.cover_image_url
        : null;
    return {
      meta: [
        { title: `${event.title} — Tickets | ${BRAND_NAME}` },
        { name: "description", content: description },
        { property: "og:title", content: `${event.title} — Tickets` },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
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
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
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
        <div className="relative aspect-[16/9] max-h-[420px] w-full overflow-hidden bg-muted sm:aspect-[21/9]">
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="hero-gradient h-32 w-full sm:h-40" />
      )}

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-28 pt-8 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:pb-16">
        <div>
          <p className="text-eyebrow text-muted-foreground">{formatDate(event.starts_at)}</p>
          <h1 className="mt-2 font-display text-3xl font-700 leading-tight sm:text-4xl">
            {event.title}
          </h1>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
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

          {event.description && (
            <div className="mt-8 whitespace-pre-line text-[0.975rem] leading-relaxed text-muted-foreground">
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

  function change(id: string, delta: number, max: number) {
    setQuantities((q) => {
      const next = Math.min(Math.max((q[id] ?? 0) + delta, 0), Math.min(max, 10));
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
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/kauf/erfolg?session={CHECKOUT_SESSION_ID}`,
          items: Object.entries(quantities)
            .filter(([, qty]) => qty > 0)
            .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })),
        },
      });
      if ("error" in res) throw new Error(res.error);
      setClientSecret(res.clientSecret);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kauf konnte nicht gestartet werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="tickets" className="card-surface p-5 sm:p-6">
      <h2 className="font-display text-lg font-700">Tickets</h2>

      {closed && <SalesNotice detail={detail} />}

      {ticketTypes.length === 0 ? (
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
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5"
                >
                  <div>
                    <p className="font-600">{type.name}</p>
                    {type.description && (
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    )}
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {type.price_cents === 0 ? "Kostenlos" : formatPrice(type.price_cents)} ·{" "}
                      {soldOut ? "ausverkauft" : `${type.remaining} verfügbar`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
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
                      disabled={closed || soldOut || qty >= Math.min(type.remaining, 10)}
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

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">
              {count} {count === 1 ? "Ticket" : "Tickets"}
            </span>
            <span className="font-display text-xl font-700">{formatPrice(total)}</span>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={closed || busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {closed ? salesButtonLabel(detail) : "Jetzt kaufen"}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Sichere Zahlung, keine Kartendaten bei uns gespeichert.
          </p>
        </form>
      )}

      <CheckoutDialog clientSecret={clientSecret} onClose={() => setClientSecret(null)} />
    </div>
  );
}

function SalesNotice({ detail }: { detail: PublicEventDetail }) {
  const { salesState, event } = detail;
  const text =
    salesState === "not_started"
      ? `Der Verkauf startet am ${formatDateTime(event.sales_start_at!)}.`
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
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {salesState === "sold_out" ? "Ausverkauft" : "Tickets"}
          </p>
          <p className="font-display text-base font-700">
            {min === null ? "—" : min === 0 ? "Kostenlos" : `ab ${formatPrice(min)}`}
          </p>
        </div>
        <Button asChild size="lg" disabled={salesState !== "open"}>
          <a href="#tickets">{salesState === "open" ? "Tickets wählen" : salesButtonLabel(detail)}</a>
        </Button>
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
    <div className={`flex gap-3 rounded-xl border border-border bg-card p-4 ${className ?? ""}`}>
      <span className="text-accent">{icon}</span>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 font-500">{value}</dd>
      </div>
    </div>
  );
}
