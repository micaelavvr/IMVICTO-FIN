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
