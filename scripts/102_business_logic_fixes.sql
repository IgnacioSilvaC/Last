-- =====================================================
-- BUSINESS LOGIC FIXES
-- =====================================================
-- Fix #4:  Trigger to recalculate pending_amount when payments.total_amount changes
-- Fix #5:  Use MAX(partial_payment.payment_date) in all status branches
-- Fix #6:  mark_overdue_payments already exists; add pg_cron schedule if available
-- Fix #7:  Auto-expire contracts whose end_date has passed
-- Fix #8:  Reset property to 'disponible' when a contract is cancelled or deleted
-- Fix #12: UNIQUE constraint on contract_rent_history(contract_id, effective_date)
-- =====================================================

-- =====================================================
-- Fix #12 — Prevent duplicate increase applications
-- =====================================================
ALTER TABLE public.contract_rent_history
  ADD CONSTRAINT IF NOT EXISTS uq_rent_history_contract_date
  UNIQUE (contract_id, effective_date);


-- =====================================================
-- Fix #5 — Use MAX(payment_date) in all branches of recalculate_payment_balance
-- Replace the function so both 'pagado' and 'parcial' use MAX partial date.
-- =====================================================
CREATE OR REPLACE FUNCTION public.recalculate_payment_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid    DECIMAL(12,2);
  v_total_amount  DECIMAL(12,2);
  v_pending       DECIMAL(12,2);
  v_new_status    TEXT;
  v_max_date      DATE;
  v_payment_id    UUID;
BEGIN
  v_payment_id := COALESCE(NEW.payment_id, OLD.payment_id);

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM public.partial_payments
  WHERE payment_id = v_payment_id;

  SELECT total_amount
  INTO v_total_amount
  FROM public.payments
  WHERE id = v_payment_id;

  v_pending := v_total_amount - v_total_paid;

  SELECT MAX(payment_date)
  INTO v_max_date
  FROM public.partial_payments
  WHERE payment_id = v_payment_id;

  IF v_total_paid >= v_total_amount THEN
    v_new_status := 'pagado';
  ELSIF v_total_paid > 0 THEN
    -- Check if overdue
    IF EXISTS (
      SELECT 1 FROM public.payments
      WHERE id = v_payment_id
        AND due_date < CURRENT_DATE
    ) THEN
      v_new_status := 'atrasado';
    ELSE
      v_new_status := 'parcial';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.payments
      WHERE id = v_payment_id
        AND due_date < CURRENT_DATE
    ) THEN
      v_new_status := 'atrasado';
    ELSE
      v_new_status := 'pendiente';
    END IF;
  END IF;

  UPDATE public.payments
  SET
    paid_amount     = v_total_paid,
    pending_amount  = v_pending,
    status          = v_new_status,
    payment_date    = v_max_date,
    payment_method  = CASE
      WHEN v_new_status = 'pagado' THEN COALESCE(NEW.payment_method, payment_method)
      ELSE payment_method
    END,
    updated_at      = NOW()
  WHERE id = v_payment_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create triggers (function was replaced; triggers already exist but drop & recreate to be safe)
DROP TRIGGER IF EXISTS trg_recalculate_payment_balance_insert ON public.partial_payments;
CREATE TRIGGER trg_recalculate_payment_balance_insert
  AFTER INSERT ON public.partial_payments
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_payment_balance();

DROP TRIGGER IF EXISTS trg_recalculate_payment_balance_delete ON public.partial_payments;
CREATE TRIGGER trg_recalculate_payment_balance_delete
  AFTER DELETE ON public.partial_payments
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_payment_balance();


-- =====================================================
-- Fix #4 — Recalculate pending_amount when total_amount is updated on a payment
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_payment_pending_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when total_amount actually changed
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    NEW.pending_amount := NEW.total_amount - NEW.paid_amount;
    -- Re-evaluate status: if overdue and not fully paid, mark atrasado
    IF NEW.pending_amount <= 0 THEN
      NEW.status := 'pagado';
    ELSIF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('pagado', 'anulado') THEN
      NEW.status := 'atrasado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_payment_pending_amount ON public.payments;
CREATE TRIGGER trg_sync_payment_pending_amount
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_payment_pending_amount();


-- =====================================================
-- Fix #7 — Auto-expire contracts whose end_date has passed
-- =====================================================
CREATE OR REPLACE FUNCTION public.expire_finished_contracts(
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.contracts
  SET
    status     = 'finalizado',
    updated_at = NOW()
  WHERE status = 'activo'
    AND end_date < p_reference_date;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run immediately on migration to catch any already-expired contracts
SELECT public.expire_finished_contracts();


-- =====================================================
-- Fix #8 — Reset property to 'disponible' when a contract is cancelled/deleted
-- =====================================================
CREATE OR REPLACE FUNCTION public.reset_property_on_contract_end()
RETURNS TRIGGER AS $$
BEGIN
  -- On DELETE or when status changes to 'cancelado' or 'finalizado'
  IF (TG_OP = 'DELETE') OR
     (TG_OP = 'UPDATE' AND NEW.status IN ('cancelado', 'finalizado') AND OLD.status = 'activo') THEN
    IF COALESCE(OLD.property_id, NEW.property_id) IS NOT NULL THEN
      UPDATE public.properties
      SET
        status     = 'disponible',
        updated_at = NOW()
      WHERE id = COALESCE(OLD.property_id, NEW.property_id)
        AND status IN ('alquilado', 'reservado');
    END IF;
  END IF;

  -- On INSERT or when status changes to 'activo', mark property as alquilado
  IF (TG_OP = 'INSERT' AND NEW.status = 'activo') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'activo' AND OLD.status != 'activo') THEN
    IF NEW.property_id IS NOT NULL THEN
      UPDATE public.properties
      SET
        status     = 'alquilado',
        updated_at = NOW()
      WHERE id = NEW.property_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reset_property_on_contract_end ON public.contracts;
CREATE TRIGGER trg_reset_property_on_contract_end
  AFTER INSERT OR UPDATE OR DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.reset_property_on_contract_end();


-- =====================================================
-- Fix #6 — Schedule mark_overdue_payments via pg_cron (runs daily at 03:00 UTC)
-- Only runs if pg_cron extension is available; safe to ignore error otherwise.
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'mark-overdue-payments',
      '0 3 * * *',
      $$SELECT public.mark_overdue_payments()$$
    );
    PERFORM cron.schedule(
      'expire-finished-contracts',
      '0 3 * * *',
      $$SELECT public.expire_finished_contracts()$$
    );
  END IF;
END;
$$;
