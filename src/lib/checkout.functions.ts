import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

const checkoutInput = z.object({
  slug: z.string().min(1).max(80),
  buyerName: z.string().trim().min(2).max(120),
  buyerEmail: z.string().trim().email().max(200),
  environment: z.enum(["sandbox", "live"]),
  returnUrl: z.string().url().max(500),
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

export type CheckoutResult = { clientSecret: string } | { error: string };

/**
 * Validates availability, records a pending order and opens the embedded checkout.
 * The tickets themselves are only created by the verified payment webhook.
 */
export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutInput.parse(data))
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, slug, title, is_active, sales_start_at, sales_end_at, max_tickets")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!event || !event.is_active) return { error: "Diese Veranstaltung ist nicht im Verkauf." };

    const now = Date.now();
    if (event.sales_start_at && new Date(event.sales_start_at).getTime() > now)
      return { error: "Der Verkauf hat noch nicht begonnen." };
    if (event.sales_end_at && new Date(event.sales_end_at).getTime() < now)
      return { error: "Der Verkauf ist beendet." };

    const { data: types } = await supabaseAdmin
      .from("ticket_types")
      .select("id, name, description, price_cents, quantity, is_active, event_id")
      .in(
        "id",
        data.items.map((i) => i.ticketTypeId),
      );

    const lines: {
      name: string;
      description: string | null;
      unitAmountCents: number;
      quantity: number;
      ticketTypeId: string;
    }[] = [];
    let amountCents = 0;
    let requested = 0;

    for (const item of data.items) {
      const type = (types ?? []).find((t) => t.id === item.ticketTypeId);
      if (!type || !type.is_active || type.event_id !== event.id)
        return { error: "Eine gewählte Ticketkategorie ist nicht verfügbar." };

      const { count } = await supabaseAdmin
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("ticket_type_id", type.id)
        .neq("status", "cancelled");

      if (type.quantity - (count ?? 0) < item.quantity)
        return { error: `Für „${type.name}“ sind nicht mehr genügend Tickets verfügbar.` };

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

    if (amountCents < 50)
      return { error: "Der Gesamtbetrag ist zu gering für eine Online-Zahlung." };

    if (event.max_tickets) {
      const { count } = await supabaseAdmin
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .neq("status", "cancelled");
      if ((count ?? 0) + requested > event.max_tickets)
        return { error: "Es sind nicht mehr genügend Tickets verfügbar." };
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
    if (orderError) return { error: orderError.message };

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        ticket_type_id: l.ticketTypeId,
        quantity: l.quantity,
        unit_price_cents: l.unitAmountCents,
      })),
    );
    if (itemsError) return { error: itemsError.message };

    try {
      const stripe = createStripeClient(data.environment as StripeEnv);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer_email: data.buyerEmail,
        line_items: lines.map((l) => ({
          quantity: l.quantity,
          price_data: {
            currency: "eur",
            unit_amount: l.unitAmountCents,
            product_data: {
              name: `${event.title} — ${l.name}`,
              ...(l.description ? { description: l.description } : {}),
            },
          },
        })),
        payment_intent_data: { description: `Tickets: ${event.title}` },
        metadata: { orderId: order.id, eventId: event.id },
      });

      await supabaseAdmin
        .from("orders")
        .update({ provider_session_id: session.id })
        .eq("id", order.id);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
      return { error: getStripeErrorMessage(error) };
    }
  });
