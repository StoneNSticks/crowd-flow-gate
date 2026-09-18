import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import type { Database } from "@/integrations/supabase/types";

let _supabase: ReturnType<typeof createClient<Database>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Crockford-ähnlich, ohne verwechselbare Zeichen

/** 128 Bit kryptographisch zufälliger, nicht erratbarer Ticket-Code. */
function generateTicketCode(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += ALPHABET[byte % ALPHABET.length];
    if (out.length % 5 === 4 && out.length < 29) out += "-";
  }
  return out;
}

async function issueTickets(sessionId: string) {
  const db = getSupabase();

  const { data: order } = await db
    .from("orders")
    .select("id, event_id, buyer_name, buyer_email, status, tickets_issued")
    .eq("provider_session_id", sessionId)
    .maybeSingle<{
      id: string;
      event_id: string;
      buyer_name: string;
      buyer_email: string;
      status: string;
      tickets_issued: boolean;
    }>();

  if (!order) {
    console.error("No order for checkout session", sessionId);
    return;
  }

  // Idempotent: eine bereits ausgestellte Bestellung wird nicht erneut bedient.
  if (order.tickets_issued) return;

  const { data: items } = await db
    .from("order_items")
    .select("ticket_type_id, quantity")
    .eq("order_id", order.id);

  const rows: Record<string, unknown>[] = [];
  for (const item of (items ?? []) as { ticket_type_id: string; quantity: number }[]) {
    for (let i = 0; i < item.quantity; i += 1) {
      rows.push({
        order_id: order.id,
        event_id: order.event_id,
        ticket_type_id: item.ticket_type_id,
        holder_name: order.buyer_name,
        holder_email: order.buyer_email,
        code: generateTicketCode(),
        status: "valid",
      });
    }
  }

  if (rows.length > 0) {
    const { error } = await db.from("tickets").insert(rows);
    if (error) {
      console.error("Ticket insert failed", error.message);
      return;
    }
  }

  await db
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), tickets_issued: true })
    .eq("id", order.id);
}

async function markFailed(sessionId: string) {
  await getSupabase()
    .from("orders")
    .update({ status: "failed" })
    .eq("provider_session_id", sessionId)
    .eq("status", "pending");
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "unpaid") await issueTickets(session.id);
      break;
    }
    case "checkout.session.async_payment_succeeded":
      await issueTickets(event.data.object.id);
      break;
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      await markFailed(event.data.object.id);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
