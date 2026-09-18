import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin } from "lucide-react";
import type { PublicEventSummary } from "@/lib/public-events.functions";
import { formatDateTimeShort, formatPrice } from "@/lib/format";

export function EventCard({ event }: { event: PublicEventSummary }) {
  const soldOut = event.salesState === "sold_out";

  return (
    <Link
      to="/event/$slug"
      params={{ slug: event.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="hero-gradient h-full w-full" />
        )}
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-destructive px-3 py-1 text-xs font-600 text-destructive-foreground">
            Ausverkauft
          </span>
        )}
        {event.salesState === "not_started" && (
          <span className="absolute left-3 top-3 rounded-full bg-warning px-3 py-1 text-xs font-600 text-ink">
            Verkauf startet bald
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-4" />
          {formatDateTimeShort(event.starts_at)}
        </p>
        <h3 className="mt-2 font-display text-lg font-600 leading-snug">{event.title}</h3>
        {event.venue_name && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {event.venue_name}
          </p>
        )}
        <div className="mt-4 flex items-end justify-between pt-1">
          <span className="font-display text-base font-700">
            {event.minPriceCents === null
              ? "—"
              : event.minPriceCents === 0
                ? "Kostenlos"
                : `ab ${formatPrice(event.minPriceCents)}`}
          </span>
          <span className="text-sm text-muted-foreground">
            {soldOut
              ? "keine Tickets"
              : event.totalRemaining <= 10
                ? `nur ${event.totalRemaining} übrig`
                : "Tickets verfügbar"}
          </span>
        </div>
      </div>
    </Link>
  );
}
