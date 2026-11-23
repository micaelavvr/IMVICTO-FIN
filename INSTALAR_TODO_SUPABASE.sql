-- INSTALACIÓN INICIAL EN PROYECTO SUPABASE NUEVO. EJECUTAR UNA SOLA VEZ.
-- Sustituye los correos de ejemplo (cerca del bloque al final de supabase.sql) por los reales antes de ejecutar.

-- ===== supabase.sql =====
-- IMVICTO CORP · base de datos compartida para Ángel y Micaela.
-- Ejecuta este archivo UNA SOLA VEZ en Supabase > SQL Editor.
-- Sustituye los correos al final (los mismos que crearás en Authentication > Users).
-- No introduzcas contraseñas, service_role ni secret keys en el navegador.

create extension if not exists pgcrypto;

create table if not exists public.allowed_users (
  email text primary key,
  display_name text not null,
  added_at timestamptz not null default now(),
  constraint email_lowercase check (email = lower(email))
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null,
  client text not null check (length(btrim(client)) between 1 and 120),
  product text not null check (length(btrim(product)) between 1 and 160),
  sale_type text not null check (sale_type in ('CONTADO','FINANCIADO','DFP','SIN INTERESES')),
  net_income numeric(14,2) not null check (net_income >= 0),
  profit numeric(14,2) not null check (profit >= 0),
  seller_payment numeric(14,2) not null check (seller_payment >= 0),
  participation text not null check (participation in ('micaela','angel','ambos','ninguno')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint liquid_non_negative check (net_income >= profit + seller_payment)
);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  move_date date not null,
  concept text not null check (length(btrim(concept)) between 1 and 220),
  kind text not null check (kind in ('ingreso','egreso')),
  amount numeric(14,2) not null check (amount > 0),
  payer text not null check (payer in ('imvicto','micaela','angel','ambos','otro')),
  account text not null check (account in ('tarjeta','micaela','angel','ambos')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  card_initial numeric(14,2) not null default 0,
  micaela_initial numeric(14,2) not null default 0,
  angel_initial numeric(14,2) not null default 0,
  card_sales_basis text not null default 'neto' check (card_sales_basis in ('neto','liquido','ninguno'))
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- Ayudante de seguridad que lee la lista blanca sin recursión de políticas.
create or replace function public.imvicto_authorized()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allowed_users
    where email = lower((select auth.jwt() ->> 'email'))
  );
$$;
revoke all on function public.imvicto_authorized() from public;
grant execute on function public.imvicto_authorized() to authenticated;

alter table public.allowed_users enable row level security;
alter table public.sales enable row level security;
alter table public.movements enable row level security;
alter table public.settings enable row level security;

-- Cada persona ve exclusivamente su propia línea en la lista de permitidos.
create policy "Consultar mi autorizacion" on public.allowed_users
for select to authenticated
using (email = lower((select auth.jwt() ->> 'email')));

-- Ambos agentes autorizados pueden gestionar el mismo conjunto de ventas.
create policy "Leer ventas" on public.sales
for select to authenticated using (public.imvicto_authorized());
create policy "Crear ventas" on public.sales
for insert to authenticated with check (public.imvicto_authorized() and created_by = (select auth.uid()));
create policy "Editar ventas" on public.sales
for update to authenticated using (public.imvicto_authorized()) with check (public.imvicto_authorized());
create policy "Eliminar ventas" on public.sales
for delete to authenticated using (public.imvicto_authorized());

create policy "Leer movimientos" on public.movements
for select to authenticated using (public.imvicto_authorized());
create policy "Crear movimientos" on public.movements
for insert to authenticated with check (public.imvicto_authorized() and created_by = (select auth.uid()));
create policy "Editar movimientos" on public.movements
for update to authenticated using (public.imvicto_authorized()) with check (public.imvicto_authorized());
create policy "Eliminar movimientos" on public.movements
for delete to authenticated using (public.imvicto_authorized());

create policy "Leer ajustes" on public.settings
for select to authenticated using (public.imvicto_authorized());
create policy "Crear ajustes" on public.settings
for insert to authenticated with check (public.imvicto_authorized());
create policy "Editar ajustes" on public.settings
for update to authenticated using (public.imvicto_authorized()) with check (public.imvicto_authorized());

-- Permisos SQL complementarios a las políticas RLS.
grant usage on schema public to authenticated;
grant select on public.allowed_users to authenticated;
grant select,insert,update,delete on public.sales,public.movements to authenticated;
grant select,insert,update on public.settings to authenticated;

-- Actualización en tiempo real (solo si las tablas aún no están en la publicación).
do $$
declare tbl text;
begin
 foreach tbl in array array['sales','movements','settings'] loop
  if not exists (
   select 1 from pg_publication_tables
   where pubname='supabase_realtime' and schemaname='public' and tablename=tbl
  ) then
   execute format('alter publication supabase_realtime add table public.%I',tbl);
  end if;
 end loop;
end $$;

-- OBLIGATORIO: cambia estos correos por los reales, en minúsculas.
-- Las personas deben existir también en Authentication > Users.
insert into public.allowed_users (email, display_name) values
  ('micaela@ejemplo.com', 'Micaela'),
  ('angel@ejemplo.com', 'Ángel')
on conflict (email) do update set display_name = excluded.display_name;

-- Si no deseas los usuarios de ejemplo, bórralos después de agregar los reales:
-- delete from public.allowed_users where email like '%@ejemplo.com';


-- ===== migracion_google_forms.sql =====
-- IMVICTO CORP v2 · ejecutar DESPUÉS de supabase.sql para activar sincronización de Google Forms.
-- Mantiene intactos los movimientos anteriores. Puede ejecutarse más de una vez.
ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS source_key text;
CREATE UNIQUE INDEX IF NOT EXISTS movements_form_source_key_unique
  ON public.movements (source_key);
-- La llave única evita duplicar una respuesta aunque Ángel y Micaela sincronicen simultáneamente.
-- No convertir source_key a NOT NULL: los movimientos manuales no necesitan ese valor.


-- ===== migracion_edicion_google_forms_v3.sql =====
-- IMVICTO CORP v3 — movimientos de Google Forms editables y eliminables.
-- Antes: ejecutar supabase.sql y migracion_google_forms.sql de la versión 2.
-- Ejecutar esta migración una sola vez (es seguro repetirla).
-- No elimina ni altera ningún movimiento previo.

alter table public.movements
  add column if not exists form_locked boolean not null default false;
alter table public.movements
  add column if not exists is_deleted boolean not null default false;

-- Llamada de sincronización atómica y segura frente a modificaciones concurrentes.
-- Si un movimiento de Forms fue editado o eliminado en IMVICTO, no volverá a
-- cambiar al leer Google Sheets, incluso si ambos agentes sincronizan a la vez.
-- Mantiene el UUID y la llave externa original, evitando reimportaciones.
create or replace function public.sync_google_forms(payload jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item record;
  affected integer;
  total integer := 0;
begin
  if not public.imvicto_authorized() then
    raise exception 'Cuenta no autorizada para sincronizar movimientos';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'array' then
    raise exception 'Se requiere una lista de respuestas de Google Forms';
  end if;
  if jsonb_array_length(payload) > 100 then
    raise exception 'Importa como máximo 100 respuestas por solicitud';
  end if;

  for item in
    select * from jsonb_to_recordset(payload) as m(
      move_date date, concept text, kind text, amount numeric,
      payer text, account text, source_key text
    )
  loop
    if item.source_key is null
       or item.source_key !~ '^google-form:[a-f0-9]{16}:[0-9]+$' then
      raise exception 'Llave externa de Google Forms no válida';
    end if;
    insert into public.movements(
      move_date, concept, kind, amount, payer, account, source, source_key
    ) values (
      item.move_date, item.concept, item.kind, item.amount,
      item.payer, item.account, 'google_form', item.source_key
    )
    on conflict (source_key) do update set
      move_date = excluded.move_date,
      concept = excluded.concept,
      kind = excluded.kind,
      amount = excluded.amount,
      payer = excluded.payer,
      account = excluded.account,
      updated_at = now()
    where public.movements.form_locked = false
      and public.movements.is_deleted = false
      and (
        public.movements.move_date, public.movements.concept,
        public.movements.kind, public.movements.amount,
        public.movements.payer, public.movements.account
      ) is distinct from (
        excluded.move_date, excluded.concept, excluded.kind,
        excluded.amount, excluded.payer, excluded.account
      );
    get diagnostics affected = row_count;
    total := total + affected;
  end loop;
  return total;
end;
$$;

revoke all on function public.sync_google_forms(jsonb) from public;
grant execute on function public.sync_google_forms(jsonb) to authenticated;

-- La política RLS ya existente en movements sigue protegiendo los registros.
-- form_locked=true: corrección manual prioritaria; is_deleted=true: baja lógica.
-- Las operaciones eliminadas continúan guardadas, pero excluidas de los saldos.


-- ===== migracion_gastos_fijos_v4.sql =====
-- IMVICTO CORP V4. Ejecutar DESPUÉS de supabase.sql, migracion_google_forms.sql
-- y migracion_edicion_google_forms_v3.sql.
-- Preserva las ventas, movimientos y ajustes ya existentes.
create table if not exists public.fixed_expenses (
 id uuid primary key default gen_random_uuid(),
 concept text not null check (length(btrim(concept)) between 1 and 160),
 amount numeric(14,2) not null check (amount > 0),
 due_day integer not null check (due_day between 1 and 31),
 account text not null check (account in ('tarjeta','micaela','angel','ambos')),
 payer text not null check (payer in ('imvicto','micaela','angel','ambos','otro')),
 start_month date not null,
 end_month date,
 notes text not null default '',
 active boolean not null default true,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint fixed_expenses_months check (extract(day from start_month)=1 and (end_month is null or (extract(day from end_month)=1 and end_month>=start_month)))
);
create table if not exists public.fixed_expense_overrides (
 id uuid primary key default gen_random_uuid(),
 fixed_expense_id uuid not null references public.fixed_expenses(id) on delete cascade,
 month date not null check (extract(day from month)=1),
 amount numeric(14,2) not null check (amount > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(fixed_expense_id,month)
);
alter table public.movements add column if not exists recurring_id uuid references public.fixed_expenses(id) on delete set null;
alter table public.movements add column if not exists recurring_month date;
-- Sólo puede existir UN pago activo por obligación mensual.
create unique index if not exists one_active_payment_per_fixed_expense
 on public.movements (recurring_id,recurring_month)
 where recurring_id is not null and is_deleted=false;
alter table public.fixed_expenses enable row level security;
alter table public.fixed_expense_overrides enable row level security;
-- Políticas de fila: sólo usuarios en allowed_users, con edición compartida.
drop policy if exists "Leer gastos fijos" on public.fixed_expenses;
drop policy if exists "Agregar gastos fijos" on public.fixed_expenses;
drop policy if exists "Editar gastos fijos" on public.fixed_expenses;
drop policy if exists "Eliminar gastos fijos" on public.fixed_expenses;
drop policy if exists "Gestionar excepciones mensuales" on public.fixed_expense_overrides;
create policy "Leer gastos fijos" on public.fixed_expenses for select to authenticated using (public.imvicto_authorized());
create policy "Agregar gastos fijos" on public.fixed_expenses for insert to authenticated with check (public.imvicto_authorized() and created_by=(select auth.uid()));
create policy "Editar gastos fijos" on public.fixed_expenses for update to authenticated using (public.imvicto_authorized()) with check (public.imvicto_authorized());
create policy "Eliminar gastos fijos" on public.fixed_expenses for delete to authenticated using (public.imvicto_authorized());
create policy "Gestionar excepciones mensuales" on public.fixed_expense_overrides for all to authenticated
 using (public.imvicto_authorized()) with check (public.imvicto_authorized());
grant select,insert,update,delete on public.fixed_expenses,public.fixed_expense_overrides to authenticated;
do $$ declare tbl text; begin
 foreach tbl in array array['fixed_expenses','fixed_expense_overrides'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=tbl) then
   execute format('alter publication supabase_realtime add table public.%I',tbl);
  end if;
 end loop;
end $$;
-- NOTA: calendarizar no crea un movimiento. Sólo registrar el pago lo descuenta.

-- IMVICTO CORP V5 — APLICAR A TU PROYECTO SUPABASE YA EN USO
-- No borra ventas, movimientos, usuarios, saldos ni programaciones existentes.
-- Ejecutar una sola vez en Supabase > SQL Editor > New query > Run.
-- Seguro de volver a ejecutar (IF EXISTS / IF NOT EXISTS).
BEGIN;

-- 1) Se permite un ingreso líquido NEGATIVO:
-- net_income - profit - seller_payment puede ser < 0.
-- Los tres importes de entrada continúan >= 0; el saldo neto resultante puede ser negativo.
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS liquid_non_negative;

-- 2) Los gastos recurrentes admiten un monto ORIGINAL en PEN o USD.
--    Los registros existentes permanecen en PEN con TC = 1.
ALTER TABLE public.fixed_expenses
 ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PEN';
ALTER TABLE public.fixed_expenses
 ADD COLUMN IF NOT EXISTS exchange_rate numeric(12,4) NOT NULL DEFAULT 1;

ALTER TABLE public.fixed_expense_overrides
 ADD COLUMN IF NOT EXISTS exchange_rate numeric(12,4) NOT NULL DEFAULT 1;

-- Restricciones para que no se ingresen tipos de cambio inválidos.
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='imvicto_fixed_currency_chk' AND conrelid='public.fixed_expenses'::regclass) THEN
  ALTER TABLE public.fixed_expenses ADD CONSTRAINT imvicto_fixed_currency_chk CHECK (currency IN ('PEN','USD'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='imvicto_fixed_fx_chk' AND conrelid='public.fixed_expenses'::regclass) THEN
  ALTER TABLE public.fixed_expenses ADD CONSTRAINT imvicto_fixed_fx_chk CHECK (exchange_rate > 0 AND exchange_rate <= 1000);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='imvicto_override_fx_chk' AND conrelid='public.fixed_expense_overrides'::regclass) THEN
  ALTER TABLE public.fixed_expense_overrides ADD CONSTRAINT imvicto_override_fx_chk CHECK (exchange_rate > 0 AND exchange_rate <= 1000);
 END IF;
END $$;

COMMIT;

-- VALIDACIÓN OPCIONAL (consulta de lectura):
-- SELECT column_name,data_type FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='fixed_expenses'
--   AND column_name IN ('currency','exchange_rate');
