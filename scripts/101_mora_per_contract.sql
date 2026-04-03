-- =====================================================
-- MIGRACIÓN 101: Mora personalizable por contrato
-- =====================================================
-- Ejecutar en Supabase SQL Editor contra tu base existente.
-- Agrega tipo de penalidad (% diario o monto fijo) por contrato.
-- =====================================================

-- 1. Agregar tipo de mora al contrato
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS late_payment_type TEXT NOT NULL DEFAULT 'porcentaje_diario'
    CHECK (late_payment_type IN ('porcentaje_diario', 'monto_fijo', 'ninguna')),
  ADD COLUMN IF NOT EXISTS late_payment_fixed_amount DECIMAL(12,2) NOT NULL DEFAULT 0;

-- 2. Migrar contratos existentes:
--    Si tenían porcentaje > 0 → porcentaje_diario (ya es el default)
--    Si tenían porcentaje = 0 → ninguna
UPDATE public.contracts
  SET late_payment_type = 'ninguna'
  WHERE late_payment_penalty_percentage = 0;

-- 3. Comentarios de documentación
COMMENT ON COLUMN public.contracts.late_payment_type IS
  'Tipo de penalidad por mora: porcentaje_diario (% sobre saldo por día), monto_fijo (cargo único), ninguna';
COMMENT ON COLUMN public.contracts.late_payment_fixed_amount IS
  'Monto fijo que se cobra una sola vez al vencer el período de gracia (solo aplica si late_payment_type = monto_fijo)';
COMMENT ON COLUMN public.contracts.late_payment_grace_days IS
  'Días adicionales después del payment_day antes de que empiece la mora';
COMMENT ON COLUMN public.contracts.late_payment_penalty_percentage IS
  'Porcentaje diario sobre saldo pendiente (solo aplica si late_payment_type = porcentaje_diario)';
