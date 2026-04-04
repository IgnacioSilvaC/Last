-- =====================================================
-- PAID-THROUGH SETUP
-- =====================================================
-- Permite que al importar un contrato se indique hasta qué
-- fecha ya estaban pagadas las cuotas (pagado_hasta).
-- También expone mark_payments_paid_through() para que desde
-- la UI se pueda ajustar el estado inicial de un contrato.
-- =====================================================


-- =====================================================
-- 1. Replace generate_contract_payments to accept p_paid_through
--    All payments with due_date <= p_paid_through → 'pagado'
--    Optionally, a single 'parcial' payment can be created for
--    the current debt via the separate mark_payments_paid_through().
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_contract_payments(
  p_contract_id  UUID,
  p_paid_through DATE DEFAULT NULL   -- last date considered fully paid (inclusive)
)
RETURNS INTEGER AS $$
DECLARE
  v_contract          RECORD;
  v_current_date      DATE;
  v_end_date          DATE;
  v_month             INTEGER;
  v_year              INTEGER;
  v_due_date          DATE;
  v_days_in_month     INTEGER;
  v_actual_day        INTEGER;
  v_payment_num       INTEGER;
  v_current_rent      DECIMAL(12,2);
  v_admin_fee         DECIMAL(12,2);
  v_expenses          DECIMAL(12,2);
  v_total             DECIMAL(12,2);
  v_inserted          INTEGER;
  v_freq              INTEGER;
  v_is_paid           BOOLEAN;
BEGIN
  SELECT
    c.agency_id,
    c.start_date,
    c.end_date,
    COALESCE(c.current_rent_amount, c.monthly_rent) AS effective_rent,
    c.payment_day,
    COALESCE(c.admin_fee_percentage, 0)       AS admin_fee_pct,
    COALESCE(c.expenses_amount, 0)            AS expenses,
    c.increase_type,
    COALESCE(c.increase_percentage, 0)        AS increase_pct,
    COALESCE(c.increase_frequency_months, 12) AS increase_freq
  INTO v_contract
  FROM public.contracts c
  WHERE c.id = p_contract_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  v_current_date := v_contract.start_date;
  v_end_date     := v_contract.end_date;
  v_current_rent := v_contract.effective_rent;
  v_expenses     := v_contract.expenses;
  v_freq         := v_contract.increase_freq;
  v_payment_num  := 0;
  v_inserted     := 0;

  WHILE v_current_date <= v_end_date LOOP
    v_payment_num   := v_payment_num + 1;
    v_month         := EXTRACT(MONTH FROM v_current_date)::INTEGER;
    v_year          := EXTRACT(YEAR  FROM v_current_date)::INTEGER;

    v_days_in_month := EXTRACT(DAY FROM (
      DATE_TRUNC('month', v_current_date) + INTERVAL '1 month - 1 day'
    ))::INTEGER;
    v_actual_day    := LEAST(v_contract.payment_day, v_days_in_month);
    v_due_date      := MAKE_DATE(v_year, v_month, v_actual_day);

    -- Apply fixed-% increase
    IF v_contract.increase_type = 'porcentaje'
       AND v_contract.increase_pct > 0
       AND v_payment_num > 1
       AND (v_payment_num - 1) % v_freq = 0
    THEN
      v_current_rent := ROUND(v_current_rent * (1 + v_contract.increase_pct / 100), 2);
    END IF;

    v_admin_fee := ROUND(v_current_rent * v_contract.admin_fee_pct / 100, 2);
    v_total     := v_current_rent + v_expenses + v_admin_fee;

    -- Determine if this payment is before the paid_through date
    v_is_paid := (p_paid_through IS NOT NULL AND v_due_date <= p_paid_through);

    INSERT INTO public.payments (
      agency_id, contract_id, payment_number,
      period_month, period_year, due_date,
      base_amount, expenses_amount, admin_fee_amount,
      late_fee, interest_amount,
      total_amount, paid_amount, pending_amount, status
    ) VALUES (
      v_contract.agency_id, p_contract_id, v_payment_num,
      v_month, v_year, v_due_date,
      v_current_rent, v_expenses, v_admin_fee,
      0, 0,
      v_total,
      CASE WHEN v_is_paid THEN v_total ELSE 0 END,
      CASE WHEN v_is_paid THEN 0         ELSE v_total END,
      CASE
        WHEN v_is_paid               THEN 'pagado'
        WHEN v_due_date < CURRENT_DATE THEN 'atrasado'
        ELSE 'pendiente'
      END
    )
    ON CONFLICT (contract_id, period_year, period_month) DO NOTHING;

    IF FOUND THEN v_inserted := v_inserted + 1; END IF;

    v_current_date := v_current_date + INTERVAL '1 month';
  END LOOP;

  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 2. mark_payments_paid_through(p_contract_id, p_paid_through, p_outstanding_balance)
--    For use from the UI on already-imported contracts.
--    - Marks all payments with due_date <= p_paid_through as 'pagado'
--    - If p_outstanding_balance > 0, marks the first unpaid future payment as 'parcial'
--      (paid_amount = total_amount - p_outstanding_balance)
-- =====================================================
CREATE OR REPLACE FUNCTION public.mark_payments_paid_through(
  p_contract_id        UUID,
  p_paid_through       DATE,
  p_outstanding_balance DECIMAL(12,2) DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER := 0;
  v_first_unpaid_id UUID;
  v_total DECIMAL(12,2);
BEGIN
  -- Mark all payments up to and including p_paid_through as pagado
  UPDATE public.payments
  SET
    paid_amount    = total_amount,
    pending_amount = 0,
    status         = 'pagado',
    updated_at     = NOW()
  WHERE contract_id = p_contract_id
    AND due_date <= p_paid_through
    AND status != 'anulado';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- If there is a current outstanding balance, apply it to the next unpaid payment
  IF p_outstanding_balance > 0 THEN
    SELECT id, total_amount
    INTO v_first_unpaid_id, v_total
    FROM public.payments
    WHERE contract_id = p_contract_id
      AND due_date > p_paid_through
      AND status != 'anulado'
    ORDER BY due_date ASC
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.payments
      SET
        paid_amount    = GREATEST(0, total_amount - p_outstanding_balance),
        pending_amount = LEAST(total_amount, p_outstanding_balance),
        status         = CASE
                           WHEN p_outstanding_balance >= total_amount THEN 'atrasado'
                           ELSE 'parcial'
                         END,
        updated_at     = NOW()
      WHERE id = v_first_unpaid_id;
    END IF;
  END IF;

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
