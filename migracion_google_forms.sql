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
