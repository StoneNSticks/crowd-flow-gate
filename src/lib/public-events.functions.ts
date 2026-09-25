import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SalesState = "open" | "not_started" | "ended" | "sold_out" | "inactive";

export interface PublicTicketType {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  quantity: number;
  sold: number;
  remaining: number;
}

export interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  address: string | null;
  cover_image_url: string | null;
  sales_start_at: string | null;
  sales_end_at: string | null;
  max_tickets: number | null;
  participation_mode: "paid" | "free_ticket" | "open_free";
}

export interface PublicEventDetail {
  event: PublicEvent;
  ticketTypes: PublicTicketType[];
  minPriceCents: number | null;
  totalRemaining: number;
  salesState: SalesState;
}

export interface PublicEventSummary extends PublicEvent {
  minPriceCents: number | null;
  totalRemaining: number;
  salesState: SalesState;
}

const EVENT_COLUMNS =
  "id, slug, title, description, starts_at, ends_at, venue_name, address, cover_image_url, sales_start_at, sales_end_at, max_tickets, participation_mode";

function computeSalesState(
  event: PublicEvent,
  totalRemaining: number,
  hasTypes: boolean,
): SalesState {
  const now = Date.now();
  if (new Date(event.starts_at).getTime() < now - 6 * 60 * 60 * 1000) return "ended";
  if (event.participation_mode === "open_free") return "open";
  if (event.sales_start_at && new Date(event.sales_start_at).getTime() > now) return "not_started";
  if (event.sales_end_at && new Date(event.sales_end_at).getTime() < now) return "ended";
  if (!hasTypes) return "inactive";
  if (totalRemaining <= 0) return "sold_out";
  return "open";
}

export const listPublicEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicEventSummary[]> => {
    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const { data: events, error } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("is_active", true)
      .order("starts_at", { ascending: true });

    if (error) throw new Error(error.message);
    const rows = (events ?? []) as PublicEvent[];
    if (rows.length === 0) return [];

    const { data: types } = await supabase
      .from("ticket_types")
      .select("id, event_id, price_cents, quantity, is_active")
      .in(
        "event_id",
        rows.map((e) => e.id),
      )
      .eq("is_active", true);

    const sold = await soldMap(
      supabase,
      (types ?? []).map((t) => t.id),
    );

    return rows.map((event) => {
      const own = (types ?? []).filter((t) => t.event_id === event.id);
      const remaining = own.reduce(
        (sum, t) => sum + Math.max(0, t.quantity - (sold[t.id] ?? 0)),
        0,
      );
      const capped = capByEvent(event, own, sold, remaining);
      const prices = own.map((t) => t.price_cents);
      return {
        ...event,
        minPriceCents: prices.length ? Math.min(...prices) : null,
        totalRemaining: capped,
        salesState: computeSalesState(event, capped, own.length > 0),
      };
    });
  },
);

export const getPublicEvent = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<PublicEventDetail | null> => {
    const { getPublicClient } = await import("./supabase-public.server");
    const supabase = getPublicClient();

    const { data: event, error } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!event) return null;

    const { data: types } = await supabase
      .from("ticket_types")
      .select("id, name, description, price_cents, quantity, sort_order")
      .eq("event_id", event.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const sold = await soldMap(
      supabase,
      (types ?? []).map((t) => t.id),
    );

    const ticketTypes: PublicTicketType[] = (types ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      price_cents: t.price_cents,
      quantity: t.quantity,
      sold: sold[t.id] ?? 0,
      remaining: Math.max(0, t.quantity - (sold[t.id] ?? 0)),
    }));

    const rawRemaining = ticketTypes.reduce((s, t) => s + t.remaining, 0);
    const totalRemaining = capByEvent(
      event as PublicEvent,
      ticketTypes.map((t) => ({ id: t.id, quantity: t.quantity })),
      sold,
      rawRemaining,
    );

    return {
      event: event as PublicEvent,
      ticketTypes,
      minPriceCents: ticketTypes.length ? Math.min(...ticketTypes.map((t) => t.price_cents)) : null,
      totalRemaining,
      salesState: computeSalesState(event as PublicEvent, totalRemaining, ticketTypes.length > 0),
    };
  });

async function soldMap(
  supabase: ReturnType<typeof import("./supabase-public.server").getPublicClient>,
  ids: string[],
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const id of ids) {
    const { data } = await supabase.rpc("ticket_type_sold", { _ticket_type_id: id });
    out[id] = typeof data === "number" ? data : 0;
  }
  return out;
}

/** Honour the event-wide cap (max_tickets) on top of per-category quotas. */
function capByEvent(
  event: PublicEvent,
  types: { id: string; quantity: number }[],
  sold: Record<string, number>,
  remaining: number,
): number {
  if (!event.max_tickets) return remaining;
  const soldTotal = types.reduce((s, t) => s + (sold[t.id] ?? 0), 0);
  return Math.max(0, Math.min(remaining, event.max_tickets - soldTotal));
}
