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
