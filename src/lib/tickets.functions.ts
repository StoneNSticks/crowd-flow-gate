import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface PublicTicket {
  id: string;
  code: string;
  holder_name: string;
  holder_email: string;
  status: "valid" | "redeemed" | "cancelled";
  created_at: string;
  redeemed_at: string | null;
  ticket_type_name: string | null;
  price_cents: number;
  event: {
    title: string;
    slug: string;
    starts_at: string;
    ends_at: string | null;
    venue_name: string | null;
    address: string | null;
    cover_image_url: string | null;
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _TICKET_SELECT =
  "id, code, holder_name, holder_email, status, created_at, redeemed_at, ticket_types(name, price_cents), events(title, slug, starts_at, ends_at, venue_name, address, cover_image_url)";

/** Public responses never contain the full buyer email. */
function maskEmail(email: string): string {
  const [user, domain] = String(email ?? "").split("@");
  if (!domain) return "";
  return `${(user ?? "").slice(0, 1)}***@${domain}`;
}

function mapTicket(row: any): PublicTicket {
  return {
    id: row.id,
    code: row.code,
    holder_name: row.holder_name,
    holder_email: maskEmail(row.holder_email),
    status: row.status,
    created_at: row.created_at,
    redeemed_at: row.redeemed_at,
    ticket_type_name: row.ticket_types?.name ?? null,
    price_cents: row.ticket_types?.price_cents ?? 0,
    event: {
      title: row.events?.title ?? "",
      slug: row.events?.slug ?? "",
      starts_at: row.events?.starts_at ?? "",
      ends_at: row.events?.ends_at ?? null,
      venue_name: row.events?.venue_name ?? null,
      address: row.events?.address ?? null,
      cover_image_url: row.events?.cover_image_url ?? null,
    },
  };
}

/** Ticket lookup by its unguessable id, used as the buyer's personal ticket link. */
export const getTicketById = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<PublicTicket | null> => {
    const { getPublicClient } = await import("@/lib/supabase-public.server");
    const { data: row } = await getPublicClient().rpc("get_public_ticket", { _id: data.id });
    return row ? mapTicket(row) : null;
  });

/** All tickets of one completed checkout session, used on the success page. */
export const getTicketsBySession = createServerFn({ method: "GET" })
  .inputValidator((data: { sessionId: string }) =>
    z
      .object({
        sessionId: z
          .string()
          .min(20)
          .max(300)
          .regex(/^(cs_(test|live)_[A-Za-z0-9]+|free_[0-9a-f-]{36})$/),
      })
      .parse(data),
  )
  .handler(
    async ({
      data,
    }): Promise<{ status: "pending" | "paid" | "unknown"; tickets: PublicTicket[] }> => {
      const { getPublicClient } = await import("@/lib/supabase-public.server");
      const { data: res } = await getPublicClient().rpc("get_session_tickets", {
        _session: data.sessionId,
      });
      const order = res as { status: string; tickets: unknown[] } | null;
      if (!order) return { status: "unknown", tickets: [] };
      const rows = order.tickets;
      const tickets = (rows ?? []).map(mapTicket);
      return {
        status: order.status === "paid" && tickets.length > 0 ? "paid" : "pending",
        tickets,
      };
    },
  );
