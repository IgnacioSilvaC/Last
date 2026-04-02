-- Add new enums for contract management
CREATE TYPE currency_type AS ENUM ('USD', 'MXN');
CREATE TYPE increase_type AS ENUM ('porcentaje', 'fijo', 'inpc');
CREATE TYPE increase_frequency AS ENUM ('mensual', 'trimestral', 'semestral', 'anual');

-- Add guarantor table (garantes)
CREATE TABLE IF NOT EXISTS public.guarantors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  identification TEXT NOT NULL UNIQUE,
  address TEXT,
  occupation TEXT,
  monthly_income NUMERIC(10,2),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add new columns to contracts table
ALTER TABLE public.contracts 
  ADD COLUMN IF NOT EXISTS guarantor_id UUID REFERENCES public.guarantors(id),
  ADD COLUMN IF NOT EXISTS currency currency_type NOT NULL DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS rent_amount_usd NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS has_fire_insurance BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS insurance_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
  ADD COLUMN IF NOT EXISTS late_payment_penalty NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS penalty_type TEXT DEFAULT 'porcentaje',
  ADD COLUMN IF NOT EXISTS increase_type increase_type,
  ADD COLUMN IF NOT EXISTS increase_frequency increase_frequency,
  ADD COLUMN IF NOT EXISTS increase_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS increase_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS first_increase_date DATE,
  ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS includes_utilities BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS utilities_description TEXT,
  ADD COLUMN IF NOT EXISTS special_clauses TEXT,
  ADD COLUMN IF NOT EXISTS contract_file_url TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guarantors_identification ON public.guarantors(identification);
CREATE INDEX IF NOT EXISTS idx_contracts_guarantor ON public.contracts(guarantor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_currency ON public.contracts(currency);

-- Add updated_at trigger for guarantors
CREATE TRIGGER update_guarantors_updated_at BEFORE UPDATE ON public.guarantors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN public.contracts.currency IS 'Moneda del contrato (USD o MXN)';
COMMENT ON COLUMN public.contracts.rent_amount_usd IS 'Monto de renta en dólares (si aplica)';
COMMENT ON COLUMN public.contracts.has_fire_insurance IS 'Indica si el contrato incluye seguro contra incendio';
COMMENT ON COLUMN public.contracts.late_payment_penalty IS 'Multa por pago tardío';
COMMENT ON COLUMN public.contracts.penalty_type IS 'Tipo de penalización: porcentaje o cantidad fija';
COMMENT ON COLUMN public.contracts.increase_type IS 'Tipo de aumento: porcentaje, fijo, o según INPC';
COMMENT ON COLUMN public.contracts.increase_frequency IS 'Frecuencia del aumento de renta';
COMMENT ON COLUMN public.contracts.grace_period_days IS 'Días de gracia para el pago sin penalización';
COMMENT ON COLUMN public.contracts.includes_utilities IS 'Indica si el contrato incluye servicios';
