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
