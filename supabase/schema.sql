-- Odalia Store — esquema de base de datos para Supabase
-- Cómo usarlo: en tu proyecto de Supabase, ve a SQL Editor > New query,
-- pega este archivo completo y dale "Run".

-- =========================================================
-- 1. profiles — 1:1 con auth.users
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'owner' check (role in ('owner', 'employee')),
  created_at timestamptz not null default now()
);

-- Crea automáticamente un perfil cuando alguien se registra en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- 2. customers
-- =========================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- =========================================================
-- 3. sales
-- =========================================================
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  -- Prendas creadas juntas (misma venta) comparten este id; una prenda sola es
  -- "grupo de una". Lo asigna la app explícitamente al crear, no depender del
  -- default aquí para eso (el default solo sirve como respaldo/backfill).
  sale_group_id uuid not null default gen_random_uuid(),
  item_name text not null,
  category text,
  sale_price numeric(10, 2) not null check (sale_price >= 0),
  cost_price numeric(10, 2) check (cost_price is null or cost_price >= 0),
  shipping_fee numeric(10, 2) not null default 0 check (shipping_fee >= 0),
  total_amount numeric(10, 2) generated always as (sale_price + shipping_fee) stored,
  customer_id uuid references public.customers (id) on delete set null,
  sale_date date not null default current_date,
  delivery_date date,
  delivered boolean not null default false,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists sales_sale_group_id_idx on public.sales (sale_group_id);

create index if not exists sales_sale_date_idx on public.sales (sale_date);
create index if not exists sales_customer_id_idx on public.sales (customer_id);
create index if not exists sales_delivery_date_idx on public.sales (delivery_date);

-- =========================================================
-- 4. payments — abonos contra una venta
-- =========================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text check (payment_method is null or payment_method in ('efectivo', 'transferencia')),
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists payments_sale_id_idx on public.payments (sale_id);

-- =========================================================
-- 5. expenses — gastos del negocio (pacas y otros costos)
-- =========================================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  item_count integer check (item_count is null or item_count >= 0),
  expense_date date not null default current_date,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists expenses_expense_date_idx on public.expenses (expense_date);

-- Vincula cada venta a la paca/gasto del que salió (opcional).
alter table public.sales
  add column if not exists expense_id uuid references public.expenses (id) on delete set null;

create index if not exists sales_expense_id_idx on public.sales (expense_id);

-- =========================================================
-- 6. Vista de saldos por venta (evita duplicar la lógica en el frontend)
-- =========================================================
create or replace view public.sale_balances as
select
  s.id as sale_id,
  s.total_amount,
  coalesce(sum(p.amount), 0) as paid_amount,
  s.total_amount - coalesce(sum(p.amount), 0) as balance_due,
  case
    when coalesce(sum(p.amount), 0) <= 0 then 'pendiente'
    when coalesce(sum(p.amount), 0) >= s.total_amount then 'pagado'
    else 'parcial'
  end as payment_status
from public.sales s
left join public.payments p on p.sale_id = s.id
group by s.id, s.total_amount;

-- =========================================================
-- 7. Vista de stock por paca (cuántas prendas se han vendido de cada gasto)
-- =========================================================
create or replace view public.expense_stock as
select
  e.id as expense_id,
  e.item_count,
  count(s.id) as sold_count,
  case when e.item_count is not null then e.item_count - count(s.id) else null end as remaining
from public.expenses e
left join public.sales s on s.expense_id = e.id
group by e.id, e.item_count;

-- =========================================================
-- 8. Vista de ventas agrupadas (una fila por "venta"/factura, sumando
--    todas las prendas que comparten sale_group_id). Los pagos se
--    pre-agregan por venta antes del join para no duplicar total_amount
--    cuando una prenda tiene varios abonos.
-- =========================================================
create or replace view public.sale_groups as
select
  s.sale_group_id,
  min(s.customer_id::text)::uuid as customer_id,
  min(s.sale_date) as sale_date,
  min(s.delivery_date) as delivery_date,
  bool_and(s.delivered) as delivered,
  count(s.id) as item_count,
  sum(s.total_amount) as total_amount,
  coalesce(sum(pay.paid), 0) as paid_amount,
  sum(s.total_amount) - coalesce(sum(pay.paid), 0) as balance_due,
  case
    when coalesce(sum(pay.paid), 0) <= 0 then 'pendiente'
    when coalesce(sum(pay.paid), 0) >= sum(s.total_amount) then 'pagado'
    else 'parcial'
  end as payment_status,
  min(s.created_at) as created_at
from public.sales s
left join (
  select sale_id, sum(amount) as paid
  from public.payments
  group by sale_id
) pay on pay.sale_id = s.id
group by s.sale_group_id;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

-- profiles: cada quien puede ver y actualizar su propio perfil.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- customers / sales / payments: cualquier usuario autenticado del negocio
-- puede leer y escribir (hoy solo la dueña; al agregar empleados todos
-- comparten los mismos datos del negocio).
--
-- Para más adelante, cuando se agreguen empleados y se quiera ocultar
-- costos/ganancias, se puede restringir el acceso a cost_price mediante
-- una vista sin esa columna para el rol 'employee', en vez de bloquear la fila.
create policy "customers_all_authenticated" on public.customers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "sales_all_authenticated" on public.sales
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "payments_all_authenticated" on public.payments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "expenses_all_authenticated" on public.expenses
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
