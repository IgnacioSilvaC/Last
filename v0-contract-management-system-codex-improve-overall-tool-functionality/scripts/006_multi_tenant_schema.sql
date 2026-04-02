-- =====================================================
-- SCHEMA MULTI-TENANT PARA INMOBILIARIAS
-- =====================================================

-- Tabla de inmobiliarias (organizaciones)
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Modificar profiles para agregar referencia a inmobiliaria
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id),
  ADD COLUMN IF NOT EXISTS is_agency_admin BOOLEAN NOT NULL DEFAULT false;

-- Agregar agency_id a todas las tablas principales
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id);
ALTER TABLE public.landlords ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id);
ALTER TABLE public.guarantors ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id);
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id);

-- =====================================================
-- TABLA DE ÍNDICES DE ACTUALIZACIÓN (ICL, IPC, etc.)
-- =====================================================
CREATE TYPE index_type AS ENUM ('icl', 'ipc', 'uva', 'custom');

CREATE TABLE IF NOT EXISTS public.price_indices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id),
  index_type index_type NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  value NUMERIC(10,4) NOT NULL,
  accumulated_value NUMERIC(10,4),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agency_id, index_type, year, month)
);

-- =====================================================
-- HISTÓRICO DE AUMENTOS DE CONTRATOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contract_increases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id),
  effective_date DATE NOT NULL,
  previous_rent NUMERIC(10,2) NOT NULL,
  new_rent NUMERIC(10,2) NOT NULL,
  increase_percentage NUMERIC(6,2) NOT NULL,
  increase_type increase_type NOT NULL,
  index_value_used NUMERIC(10,4),
  is_applied BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INVITACIONES DE AGENTES
-- =====================================================
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

CREATE TABLE IF NOT EXISTS public.agent_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'agente',
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  status invitation_status NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES Y TRIGGERS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_agency ON public.profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_agency ON public.properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_tenants_agency ON public.tenants(agency_id);
CREATE INDEX IF NOT EXISTS idx_landlords_agency ON public.landlords(agency_id);
CREATE INDEX IF NOT EXISTS idx_guarantors_agency ON public.guarantors(agency_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agency ON public.contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_payments_agency ON public.payments(agency_id);
CREATE INDEX IF NOT EXISTS idx_price_indices_agency ON public.price_indices(agency_id);
CREATE INDEX IF NOT EXISTS idx_contract_increases_contract ON public.contract_increases(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_increases_date ON public.contract_increases(effective_date);

CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON public.agencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_indices_updated_at BEFORE UPDATE ON public.price_indices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS MULTI-TENANT
-- =====================================================
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_increases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_invitations ENABLE ROW LEVEL SECURITY;

-- Políticas para agencies
CREATE POLICY "Users can view their own agency" ON public.agencies
  FOR SELECT USING (
    id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Agency admins can update their agency" ON public.agencies
  FOR UPDATE USING (
    id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid() AND is_agency_admin = true)
  );

-- Políticas para price_indices
CREATE POLICY "Users can view their agency indices" ON public.price_indices
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
    OR agency_id IS NULL
  );

CREATE POLICY "Admins can manage indices" ON public.price_indices
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Políticas para contract_increases
CREATE POLICY "Users can view their agency increases" ON public.contract_increases
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins and agents can manage increases" ON public.contract_increases
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'agente'))
  );

-- Políticas para agent_invitations
CREATE POLICY "Agency admins can manage invitations" ON public.agent_invitations
  FOR ALL USING (
    agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid() AND is_agency_admin = true)
  );

-- Actualizar RLS de tablas existentes para multi-tenant
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Users can view all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can view all landlords" ON public.landlords;
DROP POLICY IF EXISTS "Users can view all contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can view all payments" ON public.payments;

CREATE POLICY "Users can view their agency profiles" ON public.profiles
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
    OR id = auth.uid()
  );

CREATE POLICY "Users can view their agency properties" ON public.properties
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can view their agency tenants" ON public.tenants
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can view their agency landlords" ON public.landlords
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can view their agency contracts" ON public.contracts
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can view their agency payments" ON public.payments
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );
