import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Users } from "lucide-react";
import type { PublicEventSummary } from "@/lib/public-events.functions";
import { formatDateTimeShort, formatPrice } from "@/lib/format";

export function EventCard({ event }: { event: PublicEventSummary }) {
  const soldOut = event.salesState === "sold_out";
  const openFree = event.participation_mode === "open_free";
  const freeTicket = event.participation_mode === "free_ticket";

  return (
    <Link
      to="/event/$slug"
      params={{ slug: event.slug }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
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
        {(openFree || freeTicket) && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-success px-3 py-1 text-xs font-600 text-success-foreground">
            <Users className="size-3.5" />
            {openFree ? "Offen & kostenlos" : "Kostenloses Ticket"}
          </span>
        )}
      </div>

       <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
         <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
           <CalendarDays className="size-4 shrink-0" />
          {formatDateTimeShort(event.starts_at)}
        </p>
         <h3 className="mt-2 break-words font-display text-lg font-600 leading-snug">{event.title}</h3>
        {event.venue_name && (
           <p className="mt-1.5 flex min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
             <MapPin className="mt-0.5 size-4 shrink-0" />
            {event.venue_name}
          </p>
        )}
         <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 pt-1">
          <span className="font-display text-base font-700">
            {openFree
              ? "Freier Eintritt"
              : event.minPriceCents === null
              ? "Nicht angegeben"
              : event.minPriceCents === 0
                ? "Kostenlos"
                : `ab ${formatPrice(event.minPriceCents)}`}
          </span>
           <span className="text-right text-xs text-muted-foreground sm:text-sm">
            {openFree
              ? "keine Anmeldung"
              : soldOut
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
