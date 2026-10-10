ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS sales_paused boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.book_free_tickets(_slug text, _name text, _email text, _items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare ev public.events; it jsonb; tt public.ticket_types; qty int; total int := 0; sold int;
  oid uuid; sid text; n int;
begin
  if length(trim(coalesce(_name,''))) < 2 or _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('error','Bitte Name und gültige E-Mail angeben.'); end if;
  select * into ev from public.events where slug = _slug for update;
  if not found or not ev.is_active then return jsonb_build_object('error','Diese Veranstaltung ist nicht im Verkauf.'); end if;
  if ev.sales_paused then return jsonb_build_object('error','Der Ticketverkauf ist aktuell pausiert.'); end if;
  if ev.participation_mode = 'open_free' then return jsonb_build_object('error','Für dieses offene Treffen ist keine Anmeldung erforderlich.'); end if;
  if ev.sales_start_at is not null and ev.sales_start_at > now() then return jsonb_build_object('error','Der Verkauf hat noch nicht begonnen.'); end if;
  if ev.sales_end_at is not null and ev.sales_end_at < now() then return jsonb_build_object('error','Der Verkauf ist beendet.'); end if;
  if jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then return jsonb_build_object('error','Keine Tickets gewählt.'); end if;

  for it in select * from jsonb_array_elements(_items) loop
    qty := (it->>'quantity')::int;
    select * into tt from public.ticket_types where id = (it->>'ticketTypeId')::uuid;
    if not found or not tt.is_active or tt.event_id <> ev.id then return jsonb_build_object('error','Eine gewählte Ticketkategorie ist nicht verfügbar.'); end if;
    if tt.price_cents <> 0 then return jsonb_build_object('error','Diese Kategorie ist nicht kostenlos.'); end if;
    if qty < 1 then return jsonb_build_object('error','Ungültige Anzahl.'); end if;
    select count(*) into sold from public.tickets where ticket_type_id = tt.id and status <> 'cancelled';
    if tt.quantity - sold < qty then return jsonb_build_object('error', format('Für „%s“ sind nicht mehr genügend Tickets verfügbar.', tt.name)); end if;
    total := total + qty;
  end loop;
  if total > 3 then return jsonb_build_object('error','Pro Bestellung sind maximal 3 Tickets möglich.'); end if;
  if ev.max_tickets is not null then
    select count(*) into sold from public.tickets where event_id = ev.id and status <> 'cancelled';
    if sold + total > ev.max_tickets then return jsonb_build_object('error','Es sind nicht mehr genügend Tickets verfügbar.'); end if;
  end if;

  sid := 'free_' || gen_random_uuid()::text;
  insert into public.orders(event_id, buyer_name, buyer_email, amount_cents, currency, status, provider_session_id, tickets_issued, paid_at)
  values (ev.id, trim(_name), trim(_email), 0, 'eur', 'paid', sid, true, now()) returning id into oid;
  for it in select * from jsonb_array_elements(_items) loop
    qty := (it->>'quantity')::int;
    insert into public.order_items(order_id, ticket_type_id, quantity, unit_price_cents) values (oid, (it->>'ticketTypeId')::uuid, qty, 0);
    for n in 1..qty loop
      insert into public.tickets(order_id, event_id, ticket_type_id, holder_name, holder_email, code, status)
      values (oid, ev.id, (it->>'ticketTypeId')::uuid, trim(_name), trim(_email), public._gen_ticket_code(), 'valid');
    end loop;
  end loop;
  return jsonb_build_object('freeSessionId', sid);
end $function$;