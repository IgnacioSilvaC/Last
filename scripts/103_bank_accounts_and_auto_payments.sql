-- =====================================================
-- BANK ACCOUNTS + AUTO-PAYMENT GENERATION
-- =====================================================
-- 1. bank_accounts table
-- 2. bank_account_id on partial_payments
-- 3. UNIQUE on payments(contract_id, period_year, period_month) for idempotency
-- 4. generate_contract_payments() — creates all monthly payments for a contract
-- =====================================================

-- =====================================================
-- 1. BANK ACCOUNTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id     UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  bank_name     TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  account_type  TEXT NOT NULL DEFAULT 'caja_ahorro'
                  CHECK (account_type IN ('caja_ahorro','corriente','virtual','otro')),
  cbu           TEXT,
  alias         TEXT,
  currency      TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS','USD','MXN')),
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_agency ON public.bank_accounts(agency_id);

-- RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_accounts_select" ON public.bank_accounts
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "bank_accounts_insert" ON public.bank_accounts
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id());
CREATE POLICY "bank_accounts_update" ON public.bank_accounts
  FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "bank_accounts_delete" ON public.bank_accounts
  FOR DELETE USING (agency_id = get_user_agency_id());


-- =====================================================
-- 2. Add bank_account_id to partial_payments
-- =====================================================
ALTER TABLE public.partial_payments
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partial_payments_bank_account
  ON public.partial_payments(bank_account_id);


-- =====================================================
-- 3. UNIQUE constraint on payments for idempotent generation
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_payments_contract_period'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT uq_payments_contract_period
      UNIQUE (contract_id, period_year, period_month);
  END IF;
END;
$$;


-- =====================================================
-- 4. generate_contract_payments(p_contract_id)
-- Creates one payment row per month for the full contract duration.
-- Idempotent: uses ON CONFLICT DO NOTHING.
-- Handles fixed-% increases; index-based increases use current_rent_amount
-- (will be corrected when the increase is applied manually).
-- Returns number of rows actually inserted.
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_contract_payments(
  p_contract_id UUID
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
BEGIN
  SELECT
    c.agency_id,
    c.start_date,
    c.end_date,
    c.monthly_rent,
    COALESCE(c.current_rent_amount, c.monthly_rent) AS effective_rent,
    c.payment_day,
    COALESCE(c.admin_fee_percentage, 0) AS admin_fee_pct,
    COALESCE(c.expenses_amount, 0) AS expenses,
    c.increase_type,
    COALESCE(c.increase_percentage, 0) AS increase_pct,
    COALESCE(c.increase_frequency_months, 12) AS increase_freq
  INTO v_contract
  FROM public.contracts c
  WHERE c.id = p_contract_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_current_date := v_contract.start_date;
  v_end_date     := v_contract.end_date;
  v_current_rent := v_contract.effective_rent;
  v_expenses     := v_contract.expenses;
  v_freq         := v_contract.increase_freq;
  v_payment_num  := 0;
  v_inserted     := 0;

  WHILE v_current_date <= v_end_date LOOP
    v_payment_num := v_payment_num + 1;
    v_month       := EXTRACT(MONTH FROM v_current_date)::INTEGER;
    v_year        := EXTRACT(YEAR  FROM v_current_date)::INTEGER;

    -- Clamp payment_day to last day of month (e.g. day 31 in February → 28/29)
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_current_date) + INTERVAL '1 month - 1 day'))::INTEGER;
    v_actual_day    := LEAST(v_contract.payment_day, v_days_in_month);
    v_due_date      := MAKE_DATE(v_year, v_month, v_actual_day);

    -- Apply fixed-% increase at the right payment number (not on first payment)
    IF v_contract.increase_type = 'porcentaje'
       AND v_contract.increase_pct > 0
       AND v_payment_num > 1
       AND (v_payment_num - 1) % v_freq = 0
    THEN
      v_current_rent := ROUND(v_current_rent * (1 + v_contract.increase_pct / 100), 2);
    END IF;

    -- For fixed-amount increases
    -- (other types: ICL/IPC/UVA keep effective_rent until manually updated)

    v_admin_fee := ROUND(v_current_rent * v_contract.admin_fee_pct / 100, 2);
    v_total     := v_current_rent + v_expenses + v_admin_fee;

    INSERT INTO public.payments (
      agency_id,
      contract_id,
      payment_number,
      period_month,
      period_year,
      due_date,
      base_amount,
      expenses_amount,
      admin_fee_amount,
      late_fee,
      interest_amount,
      total_amount,
      paid_amount,
      pending_amount,
      status
    ) VALUES (
      v_contract.agency_id,
      p_contract_id,
      v_payment_num,
      v_month,
      v_year,
      v_due_date,
      v_current_rent,
      v_expenses,
      v_admin_fee,
      0,
      0,
      v_total,
      0,
      v_total,
      CASE
        WHEN v_due_date < CURRENT_DATE THEN 'atrasado'
        ELSE 'pendiente'
      END
    )
    ON CONFLICT (contract_id, period_year, period_month) DO NOTHING;

    IF FOUND THEN
      v_inserted := v_inserted + 1;
    END IF;

    v_current_date := v_current_date + INTERVAL '1 month';
  END LOOP;

  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
