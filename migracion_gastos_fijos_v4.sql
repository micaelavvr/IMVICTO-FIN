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
