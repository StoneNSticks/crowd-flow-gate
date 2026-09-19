import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export interface RoleInfo {
  isAdmin: boolean;
  isScanner: boolean;
  email: string | null;
}

async function roles(context: { supabase: any; userId: string; claims: any }): Promise<RoleInfo> {
  const [{ data: isAdmin }, { data: isScanner }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "scanner" }),
  ]);
  return {
    isAdmin: Boolean(isAdmin),
    isScanner: Boolean(isScanner),
    email: (context.claims?.email as string | undefined) ?? null,
  };
}

async function assertAdmin(context: any) {
  const r = await roles(context);
  if (!r.isAdmin) throw new Error("Keine Berechtigung für diesen Bereich.");
  return r;
}

async function assertScanner(context: any) {
  const r = await roles(context);
  if (!r.isAdmin && !r.isScanner) throw new Error("Keine Scan-Berechtigung.");
  return r;
}

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RoleInfo> => roles(context as any));

/* ---------------------------------- events --------------------------------- */

export interface AdminEventRow {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  venue_name: string | null;
  is_active: boolean;
  max_tickets: number | null;
  ticketsSold: number;
  ticketsRedeemed: number;
  capacity: number;
  revenueCents: number;
}

export const adminListEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminEventRow[]> => {
    await assertAdmin(context);
    const supabase = (context as any).supabase;

    const { data: events, error } = await supabase
      .from("events")
      .select("id, slug, title, starts_at, venue_name, is_active, max_tickets")
      .order("starts_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: types } = await supabase
      .from("ticket_types")
      .select("id, event_id, quantity, price_cents");
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, event_id, ticket_type_id, status");

    return (events ?? []).map((e: any) => {
      const own = (tickets ?? []).filter((t: any) => t.event_id === e.id && t.status !== "cancelled");
      const priceOf = (id: string | null) =>
        (types ?? []).find((t: any) => t.id === id)?.price_cents ?? 0;
      const quota = (types ?? [])
        .filter((t: any) => t.event_id === e.id)
        .reduce((s: number, t: any) => s + t.quantity, 0);
      return {
        ...e,
        ticketsSold: own.length,
        ticketsRedeemed: own.filter((t: any) => t.status === "redeemed").length,
        capacity: e.max_tickets ? Math.min(e.max_tickets, quota) : quota,
        revenueCents: own.reduce((s: number, t: any) => s + priceOf(t.ticket_type_id), 0),
      };
    });
  });

const eventInput = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Nur Kleinbuchstaben, Zahlen und Bindestriche."),
  title: z.string().trim().min(2).max(140),
  description: z.string().max(5000).nullable(),
  starts_at: z.string().min(4),
  ends_at: z.string().nullable(),
  venue_name: z.string().max(140).nullable(),
  address: z.string().max(300).nullable(),
  cover_image_url: z.string().max(2000).nullable(),
  sales_start_at: z.string().nullable(),
  sales_end_at: z.string().nullable(),
  max_tickets: z.number().int().min(0).nullable(),
  is_active: z.boolean(),
});

export const adminSaveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => eventInput.parse(data))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await assertAdmin(context);
    const supabase = (context as any).supabase;
    const { id, ...fields } = data;

    if (id) {
      const { error } = await supabase
        .from("events")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(mapDbError(error.message));
      return { id };
    }

    const { data: created, error } = await supabase
      .from("events")
      .insert({ ...fields, created_by: (context as any).userId })
      .select("id")
      .single();
    if (error) throw new Error(mapDbError(error.message));
    return { id: created.id };
  });

const createWithTypesInput = eventInput.omit({ id: true }).extend({
  ticketTypes: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        description: z.string().max(500).nullable(),
        price_cents: z.number().int().min(0).max(10_000_000),
        quantity: z.number().int().min(1).max(100_000),
      }),
    )
    .min(1)
    .max(20),
});

/** Legt Event und alle Ticketarten in einem Schritt an (Rollback bei Fehler). */
export const adminCreateEventWithTypes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createWithTypesInput.parse(data))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await assertAdmin(context);
    const supabase = (context as any).supabase;
    const { ticketTypes, ...fields } = data;

    const { data: created, error } = await supabase
      .from("events")
      .insert({ ...fields, created_by: (context as any).userId })
      .select("id")
      .single();
    if (error) throw new Error(mapDbError(error.message));

    const { error: typeError } = await supabase.from("ticket_types").insert(
      ticketTypes.map((t, index) => ({
        event_id: created.id,
        name: t.name,
        description: t.description,
        price_cents: t.price_cents,
        quantity: t.quantity,
        sort_order: index,
        is_active: true,
      })),
    );
    if (typeError) {
      await supabase.from("events").delete().eq("id", created.id);
      throw new Error(typeError.message);
    }

    return { id: created.id };
  });

export const adminDeleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context as any).supabase.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- ticket types ------------------------------ */

const ticketTypeInput = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).nullable(),
  price_cents: z.number().int().min(0).max(10_000_000),
  quantity: z.number().int().min(0).max(100_000),
  sort_order: z.number().int().min(0).max(999),
  is_active: z.boolean(),
});

export const adminSaveTicketType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ticketTypeInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supabase = (context as any).supabase;
    const { id, ...fields } = data;
    if (id) {
      const { error } = await supabase.from("ticket_types").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await supabase
      .from("ticket_types")
      .insert(fields)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const adminDeleteTicketType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supabase = (context as any).supabase;
    const { count } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("ticket_type_id", data.id);
    if ((count ?? 0) > 0) {
      const { error } = await supabase
        .from("ticket_types")
        .update({ is_active: false })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, deactivated: true };
    }
    const { error } = await supabase.from("ticket_types").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, deactivated: false };
  });

/* ------------------------------ event detail ------------------------------- */

export interface AdminTicketRow {
  id: string;
  code: string;
  holder_name: string;
  holder_email: string;
  status: string;
  created_at: string;
  redeemed_at: string | null;
  ticket_type_id: string | null;
  ticket_type_name: string | null;
  price_cents: number;
}

export const adminGetEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supabase = (context as any).supabase;

    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) throw new Error("Event nicht gefunden.");

    const { data: types } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("event_id", data.id)
      .order("sort_order", { ascending: true });

    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, code, holder_name, holder_email, status, created_at, redeemed_at, ticket_type_id")
      .eq("event_id", data.id)
      .order("created_at", { ascending: false });

    const typeById = new Map((types ?? []).map((t: any) => [t.id, t]));
    const rows: AdminTicketRow[] = (tickets ?? []).map((t: any) => ({
      ...t,
      ticket_type_name: (typeById.get(t.ticket_type_id) as any)?.name ?? null,
      price_cents: (typeById.get(t.ticket_type_id) as any)?.price_cents ?? 0,
    }));

    const active = rows.filter((t) => t.status !== "cancelled");
    const quota = (types ?? []).reduce(
      (s: number, t: any) => s + (t.is_active ? t.quantity : 0),
      0,
    );
    const capacity = event.max_tickets ? Math.min(event.max_tickets, quota) : quota;

    return {
      event,
      ticketTypes: types ?? [],
      tickets: rows,
      stats: {
        sold: active.length,
        redeemed: active.filter((t) => t.status === "redeemed").length,
        open: active.filter((t) => t.status === "valid").length,
        cancelled: rows.length - active.length,
        capacity,
        remaining: Math.max(0, capacity - active.length),
        revenueCents: active.reduce((s, t) => s + t.price_cents, 0),
      },
    };
  });

export const adminCancelTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supabase = (context as any).supabase;
    const { error } = await supabase
      .from("tickets")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- scanning -------------------------------- */

export type ScanResult =
  | { result: "not_found" }
  | {
      result: "valid" | "already_used" | "cancelled" | "redeemed";
      holder_name: string;
      ticket_type: string;
      event_title: string;
      event_starts_at?: string;
      redeemed_at?: string | null;
    };

const codeInput = z.object({ code: z.string().trim().min(6).max(120) });

export const lookupTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => codeInput.parse(data))
  .handler(async ({ data, context }): Promise<ScanResult> => {
    await assertScanner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ticket } = await supabaseAdmin
      .from("tickets")
      .select(
        "id, status, holder_name, redeemed_at, ticket_types(name), events(title, starts_at)",
      )
      .eq("code", data.code)
      .maybeSingle();

    if (!ticket) return { result: "not_found" };
    const t = ticket as any;
    return {
      result: t.status === "valid" ? "valid" : t.status === "cancelled" ? "cancelled" : "already_used",
      holder_name: t.holder_name,
      ticket_type: t.ticket_types?.name ?? "—",
      event_title: t.events?.title ?? "—",
      event_starts_at: t.events?.starts_at ?? undefined,
      redeemed_at: t.redeemed_at,
    };
  });

export const redeemTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => codeInput.parse(data))
  .handler(async ({ data, context }): Promise<ScanResult> => {
    await assertScanner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("redeem_ticket", {
      _code: data.code,
      _scanner: (context as any).userId,
    });
    if (error) throw new Error(error.message);
    return result as unknown as ScanResult;
  });

function mapDbError(message: string): string {
  if (message.includes("events_slug_key")) return "Diese URL (Slug) wird bereits verwendet.";
  return message;
}
