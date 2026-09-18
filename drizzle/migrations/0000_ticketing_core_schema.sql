-- Roles
create type public.app_role as enum ('admin', 'scanner');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can read own roles"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid());

create policy "Admins can read all roles"
  on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage roles"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue_name text,
  address text,
  cover_image_url text,
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  max_tickets integer,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.events to anon;
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;

create policy "Public can read active events"
  on public.events for select to anon
  using (is_active = true);

create policy "Authenticated can read active events"
  on public.events for select to authenticated
  using (is_active = true or public.has_role(auth.uid(), 'admin'));

create policy "Admins manage events"
  on public.events for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Ticket types
create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  quantity integer not null check (quantity >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index ticket_types_event_idx on public.ticket_types(event_id);

grant select on public.ticket_types to anon;
grant select, insert, update, delete on public.ticket_types to authenticated;
grant all on public.ticket_types to service_role;
alter table public.ticket_types enable row level security;

create policy "Public can read ticket types of active events"
  on public.ticket_types for select to anon
  using (exists (select 1 from public.events e where e.id = event_id and e.is_active));

create policy "Authenticated can read ticket types"
  on public.ticket_types for select to authenticated
  using (
    exists (select 1 from public.events e where e.id = event_id and e.is_active)
    or public.has_role(auth.uid(), 'admin')
  );

create policy "Admins manage ticket types"
  on public.ticket_types for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  buyer_name text not null,
  buyer_email text not null,
  amount_cents integer not null default 0,
  currency text not null default 'eur',
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','refunded')),
  provider_session_id text unique,
  provider_payment_intent text,
  tickets_issued boolean not null default false,
  email_sent boolean not null default false,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index orders_event_idx on public.orders(event_id);

grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;

create policy "Admins read orders"
  on public.orders for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Order items (chosen quantities per ticket type)
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);

create index order_items_order_idx on public.order_items(order_id);

grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;

create policy "Admins read order items"
  on public.order_items for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Tickets
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_type_id uuid references public.ticket_types(id) on delete set null,
  holder_name text not null,
  holder_email text not null,
  code text not null unique,
  status text not null default 'valid' check (status in ('valid','redeemed','cancelled')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by uuid
);

create index tickets_event_idx on public.tickets(event_id);
create index tickets_order_idx on public.tickets(order_id);

grant select, update on public.tickets to authenticated;
grant all on public.tickets to service_role;
alter table public.tickets enable row level security;

create policy "Admins read tickets"
  on public.tickets for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins update tickets"
  on public.tickets for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Atomic redeem: only a valid ticket can be redeemed, exactly once.
create or replace function public.redeem_ticket(_code text, _scanner uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tickets;
  ev public.events;
  tt public.ticket_types;
  updated public.tickets;
begin
  select * into t from public.tickets where code = _code;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;

  select * into ev from public.events where id = t.event_id;
  select * into tt from public.ticket_types where id = t.ticket_type_id;

  if t.status = 'cancelled' then
    return jsonb_build_object('result','cancelled','holder_name',t.holder_name,
      'ticket_type', coalesce(tt.name,''), 'event_title', ev.title);
  end if;

  update public.tickets set status='redeemed', redeemed_at=now(), redeemed_by=_scanner
  where id = t.id and status = 'valid'
  returning * into updated;

  if found then
    return jsonb_build_object('result','redeemed','holder_name',updated.holder_name,
      'ticket_type', coalesce(tt.name,''), 'event_title', ev.title,
      'redeemed_at', updated.redeemed_at);
  end if;

  return jsonb_build_object('result','already_used','holder_name',t.holder_name,
    'ticket_type', coalesce(tt.name,''), 'event_title', ev.title,
    'redeemed_at', t.redeemed_at);
end;
$$;

revoke all on function public.redeem_ticket(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_ticket(text, uuid) to service_role;

-- Sold/redeemed counts helper for public availability (safe aggregate only)
create or replace function public.ticket_type_sold(_ticket_type_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(count(*)::int, 0)
  from public.tickets t
  where t.ticket_type_id = _ticket_type_id and t.status <> 'cancelled'
$$;

grant execute on function public.ticket_type_sold(uuid) to anon, authenticated, service_role;