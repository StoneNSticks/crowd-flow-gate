import { useState } from "react";
import { CalendarDays, Download, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { QrCode } from "@/components/QrCode";
import { AddToCalendarButton } from "@/components/AddToCalendarButton";
import { Button } from "@/components/ui/button";
import type { PublicTicket } from "@/lib/tickets.functions";
import { formatDateTime, formatPrice } from "@/lib/format";
import { downloadTicketPdf } from "@/lib/ticket-pdf";

export function TicketCard({ ticket }: { ticket: PublicTicket }) {
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="surface-ink px-5 py-4">
        <p className="text-eyebrow text-accent">{ticket.ticket_type_name ?? "Ticket"}</p>
        <h2 className="mt-1 font-display text-lg font-600">{ticket.event.title}</h2>
      </div>

      <div className="flex flex-col items-center px-5 py-6">
        <span className={`rounded-full px-3 py-1 text-xs font-600 ${state.className}`}>
          {state.label}
        </span>
        <div className="mt-5">
          <QrCode value={ticket.code} size={224} />
        </div>
        <p className="mt-4 break-all text-center font-mono text-xs text-muted-foreground">
          {ticket.code}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-5 w-full"
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
        <AddToCalendarButton event={ticket.event} className="mt-2 w-full" />
      </div>

      <dl className="space-y-3 border-t border-dashed border-border px-5 py-5 text-sm">
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
    <div className="flex items-start justify-between gap-4">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className={`max-w-[60%] text-right font-500 ${mono ? "break-all font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
