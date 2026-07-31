# Odalia Store — Panel de ventas

App privada (con inicio de sesión) para llevar el control de ventas de ropa: registrar cada prenda vendida, su precio, si llevó recargo de envío, a quién se le vendió, créditos/abonos y estadísticas de ganancias.

**Stack:** React + Vite + TypeScript, Tailwind CSS + shadcn/ui, React Router, TanStack Query, Recharts, y [Supabase](https://supabase.com) como base de datos/autenticación.

## 1. Crear el proyecto de Supabase

1. Ve a [supabase.com](https://supabase.com), crea una cuenta (gratis) y un nuevo proyecto.
2. En **Project Settings → API**, copia la **Project URL** y la **anon public key**.
3. En **SQL Editor → New query**, pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y dale **Run**. Esto crea las tablas (`customers`, `sales`, `payments`), la vista de saldos y las políticas de seguridad (RLS).
4. En **Authentication → Users → Add user**, crea tu usuario (correo y contraseña) — con ese usuario iniciarás sesión en la app. No hay pantalla de registro pública a propósito: solo tú (y a futuro tus empleadas) tendrán acceso.

## 2. Configurar el proyecto localmente

```bash
npm install
cp .env.example .env
```

Edita `.env` y pon tu URL y anon key de Supabase:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
```

## 3. Correrlo

```bash
npm run dev
```

Abre `http://localhost:5173`, inicia sesión con el usuario que creaste en Supabase, y listo.

## Funcionalidades incluidas

- **Login** con Supabase Auth (rutas protegidas) y una tarjeta de **perfil** (nombre editable, correo, rol) con el botón de cerrar sesión, accesible desde la parte inferior del menú.
- **Ventas:** registrar prenda, categoría, precio, costo opcional (para calcular ganancia), recargo de envío, cliente y fecha. Filtros por fecha, cliente, categoría y estado de pago.
- **Crédito/abonos:** cada venta puede pagarse completa o a plazos; se puede registrar el pago inicial al crear la venta (con método de pago opcional: efectivo/transferencia) y agregar más abonos después, o marcar el saldo restante como pagado en un clic. El saldo pendiente se calcula automáticamente (badge Pagado / Parcial / Pendiente).
- **Varias prendas por venta, estilo factura:** la tabla de Ventas muestra **una fila por venta** (no una por prenda) — si una venta tiene varias prendas, se ve como "3 prendas · $45.00". Al tocarla se abre la venta completa: ahí ves el total, el saldo, la lista de prendas, y puedes agregar más, editarlas o eliminarlas sin salir de esa pantalla.
- **Clientes:** alta, búsqueda, historial de compras y saldo pendiente por cliente.
- **Gastos:** registra cada paca u otro costo del negocio (monto, cantidad de prendas, fecha) para ver el costo promedio por prenda. Al registrar una venta puedes elegir de qué paca salió la prenda; la app descuenta automáticamente el stock y muestra cuántas prendas quedan de cada paca (no bloquea la venta si ya no quedan, solo lo marca en rojo, por si el conteo real no cuadra exacto).
- **Estadísticas:** ganancia por prenda, ventas del mes, monto por cobrar, gastos del negocio y **ganancia neta** (ingresos − gastos), ventas por mes (últimos 6 meses), prendas/categorías más vendidas y top clientes.
- **Entregas:** al registrar una venta puedes poner opcionalmente una fecha de entrega. El día que toque, se muestra un aviso arriba de cualquier pantalla de la app con la lista de entregas pendientes de ese día, con un botón para marcarlas como entregadas. También puedes activar un aviso nativo del navegador (botón "Activar avisos") para que te salga una notificación al abrir la app ese día. Además hay una sección **Entregas** en el menú con todas las entregas programadas (pendientes, atrasadas, de hoy y ya entregadas), igual que Clientes o Gastos.
- **Instalable como app:** desde el celular (o la compu) puedes "Agregar a pantalla de inicio" / "Instalar app" y se abre con su propio ícono, sin la barra del navegador, como una app normal.
- **Modo oscuro:** botón de sol/luna arriba del menú para cambiar entre claro y oscuro; recuerda tu preferencia la próxima vez que abras la app.
- Diseño con la paleta rosa pastel del logo, responsive (usable desde el celular).

## Instalar la app en tu celular

- **Android (Chrome):** abre la app, toca el menú (⋮) → **"Agregar a pantalla de inicio"** o **"Instalar app"**.
- **iPhone (Safari):** abre la app, toca el ícono de compartir (□↑) → **"Agregar a pantalla de inicio"**. (En iPhone tiene que ser desde Safari, no desde Chrome, por una limitación de Apple.)

El ícono que se generó es un monograma "OS" en el rosa de la marca (`scripts/icon-source.svg`). Si más adelante quieres usar el logo real (el de la tienda de ropa) en vez del monograma, dame el archivo de imagen (PNG o JPG, idealmente cuadrado) y regenero los íconos con `node scripts/generate-icons.mjs`.

## Si ya tenías el proyecto de Supabase creado

Si corriste `schema.sql` antes de que se agregara la tabla `expenses` (gastos), solo necesitas correr esto una vez en el **SQL Editor** de Supabase (no hace falta rehacer todo el archivo):

```sql
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

alter table public.expenses enable row level security;

create policy "expenses_all_authenticated" on public.expenses
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

Y si ya tenías `expenses` pero no la vinculación de ventas a pacas (stock por paca), corre también esto:

```sql
alter table public.sales
  add column if not exists expense_id uuid references public.expenses (id) on delete set null;

create index if not exists sales_expense_id_idx on public.sales (expense_id);

create or replace view public.expense_stock as
select
  e.id as expense_id,
  e.item_count,
  count(s.id) as sold_count,
  case when e.item_count is not null then e.item_count - count(s.id) else null end as remaining
from public.expenses e
left join public.sales s on s.expense_id = e.id
group by e.id, e.item_count;
```

Y si ya tenías `payments` pero no el método de pago, corre también esto:

```sql
alter table public.payments
  add column if not exists payment_method text check (payment_method is null or payment_method in ('efectivo', 'transferencia'));
```

Y si ya tenías `sales` pero no la fecha/estado de entrega, corre también esto:

```sql
alter table public.sales
  add column if not exists delivery_date date,
  add column if not exists delivered boolean not null default false;

create index if not exists sales_delivery_date_idx on public.sales (delivery_date);
```

Y si ya tenías `sales` pero no el agrupado de "venta completa" (varias prendas juntas, estilo factura), corre también esto — tus ventas existentes no se pierden, cada una simplemente queda como una "venta de una sola prenda":

```sql
alter table public.sales
  add column if not exists sale_group_id uuid not null default gen_random_uuid();

create index if not exists sales_sale_group_id_idx on public.sales (sale_group_id);

create or replace view public.sale_groups as
select
  s.sale_group_id,
  min(s.customer_id::text)::uuid as customer_id,
  min(s.sale_date) as sale_date,
  min(s.delivery_date) as delivery_date,
  bool_and(s.delivered) filter (where s.delivery_date is not null) as delivered,
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
```

## Nota sobre el aviso de entregas

El aviso funciona **mientras tengas la app abierta** (o la abras ese día) — muestra un banner dentro de la app y, si activas el permiso del navegador, también una notificación nativa del sistema. No es un push real como WhatsApp que te llegue con la app cerrada; eso requeriría convertir la app en una PWA instalable más un servicio programado en Supabase — mucho más grande de construir. Si más adelante quieres eso, se puede platicar aparte.

## Ideas para más adelante (no incluidas aún)

- Fotos de cada prenda (Supabase Storage) para un catálogo visual.
- Exportar reportes de ventas/ganancias a Excel o PDF.
- Roles de empleado reales (ocultar costos/ganancias a quien no sea la dueña) — el campo `role` en `profiles` ya está listo para esto.
- Recordatorios de clientes con saldo vencido.
