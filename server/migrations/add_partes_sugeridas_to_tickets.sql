-- =====================================================
-- Partes sugeridas en Tickets (recomendación de soporte remoto)
-- JSON array: [{ "parteNumero": "...", "descripcion": "...", "cantidad": 1 }]
-- Ejecutar en Supabase SQL Editor.
-- =====================================================

ALTER TABLE "Tickets"
  ADD COLUMN IF NOT EXISTS "partesSugeridas" TEXT;

COMMENT ON COLUMN "Tickets"."partesSugeridas" IS
  'Partes sugeridas al cliente (JSON array: parteNumero, descripcion, cantidad). Opcional.';
