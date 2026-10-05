import { useState } from "react";
import { CalendarDays, Download, Loader2, MapPin, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { QrCode } from "@/components/QrCode";
import { AddToCalendarButton } from "@/components/AddToCalendarButton";
import { Button } from "@/components/ui/button";
import type { PublicTicket } from "@/lib/tickets.functions";
import { formatDateTime, formatPrice } from "@/lib/format";
import { downloadTicketPdf } from "@/lib/ticket-pdf";

export function TicketCard({
  ticket,
  fromCache = false,
}: {
  ticket: PublicTicket;
  fromCache?: boolean;
}) {
  const [creating, setCreating] = useState(false);

  async function download() {
    setCreating(true);
    try {
      await downloadTicketPdf(ticket);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "PDF konnte nicht erstellt werden.",
      );
    } finally {
      setCreating(false);
    }
  }

  const state =
    ticket.status === "valid"
      ? { label: "Gültig", className: "bg-success/15 text-success" }
      : ticket.status === "redeemed"
        ? { label: "Bereits eingelöst", className: "bg-primary/10 text-primary" }
        : { label: "Storniert", className: "bg-destructive/10 text-destructive" };

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="surface-ink px-4 py-4 sm:px-5">
        <p className="text-eyebrow text-accent">{ticket.ticket_type_name ?? "Ticket"}</p>
        <h2 className="mt-1 break-words font-display text-base font-600 sm:text-lg">{ticket.event.title}</h2>
      </div>

      <div className="flex min-w-0 flex-col items-center px-3 py-5 sm:px-5 sm:py-6">
        <span className={`rounded-full px-3 py-1 text-xs font-600 ${state.className}`}>
          {state.label}
        </span>
        {fromCache && (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-500 text-muted-foreground">
            <WifiOff className="size-3.5" />
            Offline angezeigt
          </span>
        )}
        <div className="mt-5 max-w-full overflow-hidden rounded-md">
          <QrCode value={ticket.code} size={224} />
        </div>
        <p className="mt-4 break-all text-center font-mono text-xs text-muted-foreground">
          {ticket.code}
        </p>

        <Button
          type="button"
          variant="outline"
           className="mt-5 h-auto min-h-11 w-full whitespace-normal py-2 text-center"
          disabled={creating}
          onClick={() => void download()}
        >
          {creating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Ticket als PDF herunterladen
        </Button>
        <AddToCalendarButton event={ticket.event} ticket={{ id: ticket.id, code: ticket.code, typeName: ticket.ticket_type_name }} className="mt-2 h-auto min-h-11 w-full whitespace-normal py-2 text-center" />
      </div>

      <dl className="space-y-3 border-t border-dashed border-border px-4 py-5 text-sm sm:px-5">
        <Row label="Name" value={ticket.holder_name} />
        <Row label="E-Mail" value={ticket.holder_email} />
        <Row
          label="Termin"
          value={formatDateTime(ticket.event.starts_at)}
          icon={<CalendarDays className="size-4" />}
        />
        {(ticket.event.venue_name || ticket.event.address) && (
          <Row
            label="Ort"
            value={[ticket.event.venue_name, ticket.event.address].filter(Boolean).join(", ")}
            icon={<MapPin className="size-4" />}
          />
        )}
        <Row label="Preis" value={ticket.price_cents === 0 ? "Kostenlos" : formatPrice(ticket.price_cents)} />
        <Row label="Ticket-ID" value={ticket.id} mono />
        {ticket.redeemed_at && (
          <Row label="Eingelöst am" value={formatDateTime(ticket.redeemed_at)} />
        )}
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3">
      <dt className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className={`min-w-0 break-words text-right font-500 ${mono ? "break-all font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
