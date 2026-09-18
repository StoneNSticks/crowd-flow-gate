import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const checkoutInput = z.object({
  slug: z.string().min(1).max(80),
  buyerName: z.string().trim().min(2).max(120),
  buyerEmail: z.string().trim().email().max(200),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().uuid(),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(10),
});

/**
 * Validates availability, records a pending order and opens the hosted checkout.
 * Tickets themselves are only created by the verified payment webhook.
 */
export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutInput.parse(data))
  .handler(async ({ data }): Promise<{ url: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createPaymentSession } = await import("./payments.server");

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, slug, title, is_active, sales_start_at, sales_end_at, max_tickets")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!event || !event.is_active) throw new Error("Diese Veranstaltung ist nicht im Verkauf.");

    const now = Date.now();
    if (event.sales_start_at && new Date(event.sales_start_at).getTime() > now)
      throw new Error("Der Verkauf hat noch nicht begonnen.");
    if (event.sales_end_at && new Date(event.sales_end_at).getTime() < now)
      throw new Error("Der Verkauf ist beendet.");

    const ids = data.items.map((i) => i.ticketTypeId);
    const { data: types } = await supabaseAdmin
      .from("ticket_types")
      .select("id, name, description, price_cents, quantity, is_active, event_id")
      .in("id", ids);

    const lines = [];
    let amountCents = 0;
    let requested = 0;

    for (const item of data.items) {
      const type = (types ?? []).find((t) => t.id === item.ticketTypeId);
      if (!type || !type.is_active || type.event_id !== event.id)
        throw new Error("Eine gewählte Ticketkategorie ist nicht verfügbar.");

      const { count } = await supabaseAdmin
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("ticket_type_id", type.id)
        .neq("status", "cancelled");

      if (type.quantity - (count ?? 0) < item.quantity)
        throw new Error(`Für „${type.name}“ sind nicht mehr genügend Tickets verfügbar.`);

      requested += item.quantity;
      amountCents += type.price_cents * item.quantity;
      lines.push({
        name: type.name,
        description: type.description,
        unitAmountCents: type.price_cents,
        quantity: item.quantity,
        ticketTypeId: type.id,
      });
    }

    if (event.max_tickets) {
      const { count } = await supabaseAdmin
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .neq("status", "cancelled");
      if ((count ?? 0) + requested > event.max_tickets)
        throw new Error("Es sind nicht mehr genügend Tickets verfügbar.");
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        event_id: event.id,
        buyer_name: data.buyerName,
        buyer_email: data.buyerEmail,
        amount_cents: amountCents,
        currency: "eur",
        status: "pending",
      })
      .select("id")
      .single();
    if (orderError) throw new Error(orderError.message);

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        ticket_type_id: l.ticketTypeId,
        quantity: l.quantity,
        unit_price_cents: l.unitAmountCents,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);

    const origin = new URL(getRequest().url).origin;
    const session = await createPaymentSession({
      orderId: order.id,
      buyerEmail: data.buyerEmail,
      currency: "eur",
      lines: lines.map(({ ticketTypeId: _ignored, ...rest }) => rest),
      successUrl: `${origin}/kauf/erfolg?session={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/kauf/fehlgeschlagen?event=${event.slug}`,
    });

    await supabaseAdmin
      .from("orders")
      .update({ provider_session_id: session.id })
      .eq("id", order.id);

    return { url: session.url };
  });
