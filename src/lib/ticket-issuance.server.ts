import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

export async function issueTicketsForOrder(
  db: SupabaseClient<Database>,
  orderId: string,
  paymentIntentId?: string | null,
) {
  const { data: order } = await db
    .from("orders")
    .select("id, event_id, buyer_name, buyer_email, tickets_issued")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.tickets_issued) return;

  const { data: items } = await db
    .from("order_items")
    .select("ticket_type_id, quantity")
    .eq("order_id", order.id);

  const rows: Database["public"]["Tables"]["tickets"]["Insert"][] = [];
  for (const item of items ?? []) {
    for (let index = 0; index < item.quantity; index += 1) {
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
    if (error) throw new Error(error.message);
  }

  const { error } = await db
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      tickets_issued: true,
      ...(paymentIntentId ? { provider_payment_intent: paymentIntentId } : {}),
    })
    .eq("id", order.id)
    .eq("tickets_issued", false);
  if (error) throw new Error(error.message);
}