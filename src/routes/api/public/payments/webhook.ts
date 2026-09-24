import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import type { Database } from "@/integrations/supabase/types";
import { issueTicketsForOrder } from "@/lib/ticket-issuance.server";

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

async function issueTickets(sessionId: string, paymentIntentId?: string | null) {
  const db = getSupabase();

  const { data: order } = await db
    .from("orders")
    .select("id")
    .eq("provider_session_id", sessionId)
    .maybeSingle();

  if (!order) {
    console.error("No order for checkout session", sessionId);
    return;
  }

  await issueTicketsForOrder(db, order.id, paymentIntentId);
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
      const pi = typeof session.payment_intent === "string" ? session.payment_intent : null;
      if (session.payment_status !== "unpaid") await issueTickets(session.id, pi);
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const pi = typeof session.payment_intent === "string" ? session.payment_intent : null;
      await issueTickets(session.id, pi);
      break;
    }
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
