-- =====================================================
-- SISTEMA DE GESTIÓN INMOBILIARIA — ESQUEMA CONSOLIDADO
-- =====================================================
-- Script unificado para Supabase (PostgreSQL 15+)
-- Reemplaza todos los scripts anteriores (001-006)
-- Ejecutar en orden: este archivo crea todo desde cero.
--
-- Supuestos de negocio documentados:
--   1. Multi-tenant: cada inmobiliaria (agency) aísla sus datos.
--   2. Montos financieros siempre DECIMAL(12,2), nunca float.
--   3. Interés sobre saldo insoluto (no sobre monto original).
--   4. Mora se calcula desde fecha de vencimiento.
--   5. Pagos parciales se registran individualmente.
--   6. Zona horaria configurable por agencia (default America/Argentina/Buenos_Aires).
-- =====================================================

-- Extensión necesaria
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLAS BASE
-- =====================================================

-- 1.1 AGENCIES (Inmobiliarias)
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  logo_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 PROFILES (Usuarios)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'agente' CHECK (role IN ('admin', 'agente', 'contador', 'viewer')),
  avatar_url TEXT,
  is_agency_admin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.3 LANDLORDS (Propietarios/Arrendadores)
CREATE TABLE IF NOT EXISTS public.landlords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  identification TEXT NOT NULL,
  identification_type TEXT DEFAULT 'DNI',
  tax_id TEXT,
  tax_condition TEXT,
  address TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_cbu TEXT,
  notes TEXT,
  id_document_url TEXT,
  id_document_back_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.4 TENANTS (Inquilinos/Arrendatarios)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  identification TEXT NOT NULL,
  identification_type TEXT DEFAULT 'DNI',
  occupation TEXT,
  employer TEXT,
  monthly_income DECIMAL(12,2),
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  id_document_url TEXT,
  id_document_back_url TEXT,
  income_proof_url TEXT,
  income_proof_2_url TEXT,
  income_proof_3_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.5 GUARANTORS (Garantes)
CREATE TABLE IF NOT EXISTS public.guarantors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  identification TEXT NOT NULL,
  identification_type TEXT DEFAULT 'DNI',
  address TEXT,
  occupation TEXT,
  employer TEXT,
  monthly_income DECIMAL(12,2),
  guarantee_property_address TEXT,
  guarantee_property_registry TEXT,
  notes TEXT,
  id_document_url TEXT,
  id_document_back_url TEXT,
  income_proof_url TEXT,
  income_proof_2_url TEXT,
  income_proof_3_url TEXT,
  property_deed_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.6 PROPERTIES (Propiedades/Inmuebles)
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  landlord_id UUID REFERENCES public.landlords(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'departamento'
    CHECK (property_type IN ('departamento','casa','local','oficina','cochera','terreno','bodega','otro')),
  address TEXT NOT NULL,
  city TEXT,
  neighborhood TEXT,
  postal_code TEXT,
  floor TEXT,
  apartment TEXT,
  square_meters DECIMAL(10,2),
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  has_garage BOOLEAN DEFAULT false,
  has_storage BOOLEAN DEFAULT false,
  amenities TEXT[],
  description TEXT,
  status TEXT NOT NULL DEFAULT 'disponible'
    CHECK (status IN ('disponible','arrendado','mantenimiento','reservado','inactivo')),
  monthly_rent DECIMAL(12,2),
  rent_currency TEXT DEFAULT 'ARS' CHECK (rent_currency IN ('ARS','USD','MXN')),
  expenses DECIMAL(12,2),
  water_account TEXT,
  electricity_account TEXT,
  gas_account TEXT,
  abl_account TEXT,
  property_registry TEXT,
  cadastral_designation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agency_id, code)
);

-- =====================================================
-- 2. CONTRATOS Y CUOTAS
-- =====================================================

-- 2.1 CONTRACTS (Contratos)
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  contract_number TEXT NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  landlord_id UUID NOT NULL REFERENCES public.landlords(id) ON DELETE RESTRICT,
  guarantor_id UUID REFERENCES public.guarantors(id) ON DELETE SET NULL,
  guarantor_2_id UUID REFERENCES public.guarantors(id) ON DELETE SET NULL,
  -- Fechas
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  signing_date DATE,
  -- Finanzas
  monthly_rent DECIMAL(12,2) NOT NULL,
  current_rent_amount DECIMAL(12,2), -- renta actual (post-aumentos)
  currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS','USD','MXN')),
  security_deposit DECIMAL(12,2),
  deposit_months INTEGER DEFAULT 1,
  expenses_amount DECIMAL(12,2) DEFAULT 0,
  expenses_included BOOLEAN DEFAULT false,
  payment_day INTEGER NOT NULL DEFAULT 10 CHECK (payment_day >= 1 AND payment_day <= 28),
  -- Aumentos
  increase_type TEXT CHECK (increase_type IN ('icl','ipc','uva','porcentaje','fijo','none')),
  increase_percentage DECIMAL(5,2),
  increase_fixed_amount DECIMAL(12,2),
  increase_frequency_months INTEGER DEFAULT 12,
  next_increase_date DATE,
  first_increase_date DATE,
  -- Penalidades mora (personalizables por contrato)
  late_payment_type TEXT NOT NULL DEFAULT 'porcentaje_diario'
    CHECK (late_payment_type IN ('porcentaje_diario', 'monto_fijo', 'ninguna')),
  late_payment_penalty_percentage DECIMAL(5,2) NOT NULL DEFAULT 0, -- % diario (si late_payment_type = porcentaje_diario)
  late_payment_fixed_amount DECIMAL(12,2) NOT NULL DEFAULT 0,      -- cargo único (si late_payment_type = monto_fijo)
  late_payment_grace_days INTEGER NOT NULL DEFAULT 0,               -- días después de payment_day antes de mora
  early_termination_penalty_months INTEGER DEFAULT 2,
  -- Seguro
  has_fire_insurance BOOLEAN DEFAULT false,
  fire_insurance_policy TEXT,
  fire_insurance_company TEXT,
  fire_insurance_expiry DATE,
  -- Servicios
  includes_utilities BOOLEAN DEFAULT false,
  utilities_description TEXT,
  -- Comisión administrativa
  admin_fee_percentage DECIMAL(5,2) DEFAULT 0,
  -- Estado
  status TEXT NOT NULL DEFAULT 'borrador'
    CHECK (status IN ('borrador','activo','finalizado','cancelado','renovado')),
  special_clauses TEXT,
  notes TEXT,
  contract_document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agency_id, contract_number),
  CHECK (end_date > start_date)
);

-- 2.2 CONTRACT_RENT_HISTORY (Historial de rentas/aumentos)
CREATE TABLE IF NOT EXISTS public.contract_rent_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id),
  effective_date DATE NOT NULL,
  previous_rent DECIMAL(12,2) NOT NULL,
  new_rent DECIMAL(12,2) NOT NULL,
  increase_percentage DECIMAL(6,2) NOT NULL,
  increase_type TEXT NOT NULL,
  index_value_used DECIMAL(10,4),
  is_applied BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. PAGOS Y PAGOS PARCIALES
-- =====================================================

-- 3.1 PAYMENTS (Cuotas — representan lo que se debe por período)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_year INTEGER NOT NULL,
  due_date DATE NOT NULL,
  -- Montos de la cuota
  base_amount DECIMAL(12,2) NOT NULL,          -- renta del período
  expenses_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  admin_fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  late_fee DECIMAL(12,2) NOT NULL DEFAULT 0,   -- recargo por mora acumulado
  interest_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- intereses acumulados
  total_amount DECIMAL(12,2) NOT NULL,         -- base + expenses + admin_fee + late_fee + interest
  -- Montos pagados (se actualizan con cada pago parcial)
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  pending_amount DECIMAL(12,2) NOT NULL,       -- total_amount - paid_amount (trigger lo mantiene)
  -- Estado
  payment_date DATE,                           -- fecha del último pago
  payment_method TEXT CHECK (payment_method IN ('efectivo','transferencia','cheque','deposito','otro')),
  status TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente','pagado','parcial','atrasado','anulado')),
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 PARTIAL_PAYMENTS (Pagos parciales — cada pago real registrado)
CREATE TABLE IF NOT EXISTS public.partial_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('efectivo','transferencia','cheque','deposito','otro')),
  receipt_number TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 INTEREST_CALCULATIONS (Intereses calculados sobre saldo insoluto)
CREATE TABLE IF NOT EXISTS public.interest_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id),
  calculation_date DATE NOT NULL,
  outstanding_balance DECIMAL(12,2) NOT NULL,  -- saldo sobre el que se calcula
  interest_rate DECIMAL(8,4) NOT NULL,          -- tasa aplicada en el período
  interest_amount DECIMAL(12,2) NOT NULL,       -- resultado: balance * rate
  days_overdue INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. ÍNDICES DE PRECIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.price_indices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES public.agencies(id),
  index_type TEXT NOT NULL CHECK (index_type IN ('icl','ipc','uva','custom')),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  value DECIMAL(12,4) NOT NULL,
  accumulated_value DECIMAL(12,4),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- UNIQUE constraint handled via idx_price_indices_type_date (agency_id, index_type, year, month)
);


-- =====================================================
-- 5. ALERTAS Y NOTIFICACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'vencimiento_proximo',    -- cuota próxima a vencer
    'pago_en_mora',           -- cuota vencida sin saldar
    'pago_parcial_recibido',  -- se recibió un pago parcial
    'contrato_por_vencer',    -- contrato cerca de su fecha de fin
    'cliente_sin_actividad',  -- cliente sin pagos por tiempo prolongado
    'seguro_por_vencer',      -- póliza de seguro próxima a expirar
    'aumento_pendiente'       -- aumento de renta por aplicar
  )),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  -- Referencias polimórficas
  entity_type TEXT CHECK (entity_type IN ('payment','contract','tenant','property')),
  entity_id UUID,
  -- Estado
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  read_by UUID REFERENCES auth.users(id),
  read_at TIMESTAMPTZ,
  -- Deduplicación
  dedup_key TEXT,  -- clave única para evitar duplicados (ej: "pago_mora_{payment_id}")
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agency_id, dedup_key)
);

-- =====================================================
-- 6. DOCUMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contract','tenant','landlord','guarantor','property','payment')),
  entity_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 7. INVITACIONES DE AGENTES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.agent_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agente' CHECK (role IN ('admin','agente','contador','viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','cancelled')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 8. AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action TEXT NOT NULL CHECK (action IN ('create','update','delete','login','logout','payment','increase','alert')),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 9. CONFIGURACIÓN DEL SISTEMA (por agencia)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agency_id, config_key)
);

-- Valores por defecto de configuración (se insertan al crear agencia)
-- Claves esperadas:
--   interest_rate_daily         — tasa de interés diaria por mora (ej: "0.01" = 1% diario)
--   grace_days                  — días de gracia antes de aplicar mora (ej: "5")
--   alert_days_before_due       — días antes del vencimiento para alertar (ej: "5")
--   alert_days_contract_expiry  — días antes de fin de contrato para alertar (ej: "30")
--   alert_days_insurance_expiry — días antes de vencimiento de seguro (ej: "30")
--   inactive_client_days        — días sin actividad para marcar cliente inactivo (ej: "90")
--   mora_grave_days             — días de atraso para considerar mora grave (ej: "30")
--   timezone                    — zona horaria (ej: "America/Argentina/Buenos_Aires")

-- =====================================================
-- 10. ÍNDICES PARA RENDIMIENTO
-- =====================================================

-- Agencies
-- (PK covers lookups by id)

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_agency ON public.profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Landlords
CREATE INDEX IF NOT EXISTS idx_landlords_agency ON public.landlords(agency_id);
CREATE INDEX IF NOT EXISTS idx_landlords_identification ON public.landlords(identification);

-- Tenants
CREATE INDEX IF NOT EXISTS idx_tenants_agency ON public.tenants(agency_id);
CREATE INDEX IF NOT EXISTS idx_tenants_identification ON public.tenants(identification);

-- Guarantors
CREATE INDEX IF NOT EXISTS idx_guarantors_agency ON public.guarantors(agency_id);
CREATE INDEX IF NOT EXISTS idx_guarantors_identification ON public.guarantors(identification);

-- Properties
CREATE INDEX IF NOT EXISTS idx_properties_agency ON public.properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_landlord ON public.properties(landlord_id);

-- Contracts
CREATE INDEX IF NOT EXISTS idx_contracts_agency ON public.contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON public.contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_property ON public.contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_next_increase ON public.contracts(next_increase_date) WHERE next_increase_date IS NOT NULL;

-- Contract rent history
CREATE INDEX IF NOT EXISTS idx_rent_history_contract ON public.contract_rent_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_rent_history_date ON public.contract_rent_history(effective_date);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_contract ON public.payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_agency ON public.payments(agency_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_period ON public.payments(period_year, period_month);

-- Partial payments
CREATE INDEX IF NOT EXISTS idx_partial_payments_payment ON public.partial_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_partial_payments_date ON public.partial_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_partial_payments_agency ON public.partial_payments(agency_id);

-- Interest calculations
CREATE INDEX IF NOT EXISTS idx_interest_calc_payment ON public.interest_calculations(payment_id);

-- Price indices
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_indices_type_date ON public.price_indices(agency_id, index_type, year, month);
CREATE INDEX IF NOT EXISTS idx_price_indices_agency ON public.price_indices(agency_id);

-- Alerts
CREATE INDEX IF NOT EXISTS idx_alerts_agency ON public.alerts(agency_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON public.alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON public.alerts(agency_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON public.alerts(entity_type, entity_id);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_entity ON public.documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_agency ON public.documents(agency_id);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_agency ON public.audit_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at);

-- System config
CREATE INDEX IF NOT EXISTS idx_system_config_agency ON public.system_config(agency_id);

-- Agent invitations
CREATE INDEX IF NOT EXISTS idx_invitations_agency ON public.agent_invitations(agency_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.agent_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.agent_invitations(token);

-- =====================================================
-- 11. FUNCIONES UTILITARIAS
-- =====================================================

-- 11.1 Función: obtener agency_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_agency_id()
RETURNS UUID AS $$
  SELECT agency_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 11.2 Función: obtener config de la agencia
CREATE OR REPLACE FUNCTION public.get_agency_config(p_agency_id UUID, p_key TEXT, p_default TEXT DEFAULT NULL)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT config_value FROM public.system_config WHERE agency_id = p_agency_id AND config_key = p_key),
    p_default
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 11.3 Trigger: updated_at automático
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'agencies','profiles','landlords','tenants','guarantors',
      'properties','contracts','payments','price_indices'
    ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 11.4 Trigger: crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 12. FUNCIONES DE NEGOCIO
-- =====================================================

-- 12.1 Recalcular saldo pendiente de una cuota tras pago parcial
-- Se invoca automáticamente via trigger en partial_payments
CREATE OR REPLACE FUNCTION public.recalculate_payment_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid DECIMAL(12,2);
  v_total_amount DECIMAL(12,2);
  v_new_status TEXT;
BEGIN
  -- Sumar todos los pagos parciales de esta cuota
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM public.partial_payments
  WHERE payment_id = COALESCE(NEW.payment_id, OLD.payment_id);

  -- Obtener total de la cuota
  SELECT total_amount
  INTO v_total_amount
  FROM public.payments
  WHERE id = COALESCE(NEW.payment_id, OLD.payment_id);

  -- Determinar nuevo estado
  IF v_total_paid >= v_total_amount THEN
    v_new_status := 'pagado';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'parcial';
  ELSE
    -- Verificar si está atrasado
    IF EXISTS (
      SELECT 1 FROM public.payments
      WHERE id = COALESCE(NEW.payment_id, OLD.payment_id)
        AND due_date < CURRENT_DATE
    ) THEN
      v_new_status := 'atrasado';
    ELSE
      v_new_status := 'pendiente';
    END IF;
  END IF;

  -- Actualizar la cuota
  UPDATE public.payments
  SET
    paid_amount = v_total_paid,
    pending_amount = GREATEST(v_total_amount - v_total_paid, 0),
    status = v_new_status,
    payment_date = CASE
      WHEN v_new_status = 'pagado' THEN COALESCE(NEW.payment_date, CURRENT_DATE)
      ELSE (SELECT MAX(payment_date) FROM public.partial_payments WHERE payment_id = COALESCE(NEW.payment_id, OLD.payment_id))
    END,
    payment_method = CASE
      WHEN v_new_status = 'pagado' THEN COALESCE(NEW.payment_method, NULL)
      ELSE NULL
    END
  WHERE id = COALESCE(NEW.payment_id, OLD.payment_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recalculate_payment_balance_insert ON public.partial_payments;
CREATE TRIGGER trg_recalculate_payment_balance_insert
  AFTER INSERT ON public.partial_payments
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_payment_balance();

DROP TRIGGER IF EXISTS trg_recalculate_payment_balance_delete ON public.partial_payments;
CREATE TRIGGER trg_recalculate_payment_balance_delete
  AFTER DELETE ON public.partial_payments
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_payment_balance();

-- 12.2 Calcular interés sobre saldo insoluto
-- Fórmula: Interés = Saldo pendiente × Tasa diaria × Días de atraso
-- Se llama manualmente o via cron/edge function
CREATE OR REPLACE FUNCTION public.calculate_overdue_interest(
  p_agency_id UUID,
  p_calculation_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_daily_rate DECIMAL(8,6);
  v_grace_days INTEGER;
  v_payment RECORD;
  v_days_overdue INTEGER;
  v_interest DECIMAL(12,2);
  v_count INTEGER := 0;
BEGIN
  -- Obtener configuración de la agencia
  v_daily_rate := COALESCE(
    public.get_agency_config(p_agency_id, 'interest_rate_daily', '0.001')::DECIMAL,
    0.001
  );
  v_grace_days := COALESCE(
    public.get_agency_config(p_agency_id, 'grace_days', '0')::INTEGER,
    0
  );

  -- Recorrer cuotas con saldo pendiente y vencidas
  FOR v_payment IN
    SELECT id, due_date, pending_amount
    FROM public.payments
    WHERE agency_id = p_agency_id
      AND status IN ('pendiente', 'parcial', 'atrasado')
      AND pending_amount > 0
      AND due_date < p_calculation_date - v_grace_days * INTERVAL '1 day'
  LOOP
    v_days_overdue := p_calculation_date - v_payment.due_date - v_grace_days;
    IF v_days_overdue <= 0 THEN CONTINUE; END IF;

    -- Interés = saldo pendiente × tasa diaria × días de atraso desde último cálculo
    -- Verificar si ya hay cálculo para esta fecha
    IF NOT EXISTS (
      SELECT 1 FROM public.interest_calculations
      WHERE payment_id = v_payment.id AND calculation_date = p_calculation_date
    ) THEN
      v_interest := ROUND(v_payment.pending_amount * v_daily_rate * 1, 2); -- interés de 1 día

      INSERT INTO public.interest_calculations (
        payment_id, agency_id, calculation_date, outstanding_balance,
        interest_rate, interest_amount, days_overdue
      ) VALUES (
        v_payment.id, p_agency_id, p_calculation_date, v_payment.pending_amount,
        v_daily_rate, v_interest, v_days_overdue
      );

      -- Actualizar intereses acumulados en la cuota
      UPDATE public.payments
      SET
        interest_amount = interest_amount + v_interest,
        total_amount = base_amount + expenses_amount + admin_fee_amount + late_fee + interest_amount + v_interest,
        pending_amount = (base_amount + expenses_amount + admin_fee_amount + late_fee + interest_amount + v_interest) - paid_amount,
        status = CASE
          WHEN paid_amount >= (base_amount + expenses_amount + admin_fee_amount + late_fee + interest_amount + v_interest) THEN 'pagado'
          WHEN paid_amount > 0 THEN 'parcial'
          ELSE 'atrasado'
        END
      WHERE id = v_payment.id;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12.3 Generar alertas automáticas
-- Se llama manualmente o via cron/edge function
CREATE OR REPLACE FUNCTION public.generate_alerts(
  p_agency_id UUID,
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_days_before_due INTEGER;
  v_days_contract_expiry INTEGER;
  v_days_insurance_expiry INTEGER;
  v_inactive_days INTEGER;
  v_mora_grave_days INTEGER;
  v_count INTEGER := 0;
  v_rec RECORD;
BEGIN
  -- Leer configuración
  v_days_before_due := COALESCE(public.get_agency_config(p_agency_id, 'alert_days_before_due', '5')::INTEGER, 5);
  v_days_contract_expiry := COALESCE(public.get_agency_config(p_agency_id, 'alert_days_contract_expiry', '30')::INTEGER, 30);
  v_days_insurance_expiry := COALESCE(public.get_agency_config(p_agency_id, 'alert_days_insurance_expiry', '30')::INTEGER, 30);
  v_inactive_days := COALESCE(public.get_agency_config(p_agency_id, 'inactive_client_days', '90')::INTEGER, 90);
  v_mora_grave_days := COALESCE(public.get_agency_config(p_agency_id, 'mora_grave_days', '30')::INTEGER, 30);

  -- ALERTA 1: Vencimiento próximo de cuotas
  FOR v_rec IN
    SELECT p.id, p.due_date, p.pending_amount, c.contract_number, t.full_name as tenant_name
    FROM public.payments p
    JOIN public.contracts c ON c.id = p.contract_id
    JOIN public.tenants t ON t.id = c.tenant_id
    WHERE p.agency_id = p_agency_id
      AND p.status IN ('pendiente', 'parcial')
      AND p.due_date BETWEEN p_reference_date AND p_reference_date + v_days_before_due * INTERVAL '1 day'
  LOOP
    INSERT INTO public.alerts (agency_id, alert_type, severity, title, message, entity_type, entity_id, dedup_key)
    VALUES (
      p_agency_id,
      'vencimiento_proximo',
      'warning',
      'Cuota próxima a vencer',
      format('La cuota del contrato %s (%s) vence el %s. Saldo pendiente: $%s',
        v_rec.contract_number, v_rec.tenant_name, v_rec.due_date::TEXT, v_rec.pending_amount::TEXT),
      'payment', v_rec.id,
      format('venc_prox_%s_%s', v_rec.id, v_rec.due_date)
    )
    ON CONFLICT (agency_id, dedup_key) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  -- ALERTA 2: Pagos en mora
  FOR v_rec IN
    SELECT p.id, p.due_date, p.pending_amount,
           (p_reference_date - p.due_date) as days_late,
           c.contract_number, t.full_name as tenant_name
    FROM public.payments p
    JOIN public.contracts c ON c.id = p.contract_id
    JOIN public.tenants t ON t.id = c.tenant_id
    WHERE p.agency_id = p_agency_id
      AND p.status IN ('pendiente', 'parcial', 'atrasado')
      AND p.due_date < p_reference_date
      AND p.pending_amount > 0
  LOOP
    INSERT INTO public.alerts (
      agency_id, alert_type, severity, title, message, entity_type, entity_id, dedup_key
    ) VALUES (
      p_agency_id,
      'pago_en_mora',
      CASE WHEN v_rec.days_late >= v_mora_grave_days THEN 'critical' ELSE 'warning' END,
      CASE WHEN v_rec.days_late >= v_mora_grave_days THEN 'Mora grave' ELSE 'Pago en mora' END,
      format('Contrato %s (%s) — %s días de atraso. Saldo: $%s',
        v_rec.contract_number, v_rec.tenant_name, v_rec.days_late, v_rec.pending_amount::TEXT),
      'payment', v_rec.id,
      format('mora_%s_%s', v_rec.id, date_trunc('month', p_reference_date)::DATE)
    )
    ON CONFLICT (agency_id, dedup_key) DO UPDATE SET
      severity = EXCLUDED.severity,
      title = EXCLUDED.title,
      message = EXCLUDED.message;
    v_count := v_count + 1;
  END LOOP;

  -- ALERTA 3: Contratos por vencer
  FOR v_rec IN
    SELECT c.id, c.contract_number, c.end_date, t.full_name as tenant_name,
           pr.address as property_address
    FROM public.contracts c
    JOIN public.tenants t ON t.id = c.tenant_id
    JOIN public.properties pr ON pr.id = c.property_id
    WHERE c.agency_id = p_agency_id
      AND c.status = 'activo'
      AND c.end_date BETWEEN p_reference_date AND p_reference_date + v_days_contract_expiry * INTERVAL '1 day'
  LOOP
    INSERT INTO public.alerts (agency_id, alert_type, severity, title, message, entity_type, entity_id, dedup_key)
    VALUES (
      p_agency_id,
      'contrato_por_vencer',
      'warning',
      'Contrato próximo a vencer',
      format('El contrato %s (%s en %s) vence el %s',
        v_rec.contract_number, v_rec.tenant_name, v_rec.property_address, v_rec.end_date::TEXT),
      'contract', v_rec.id,
      format('contrato_venc_%s', v_rec.id)
    )
    ON CONFLICT (agency_id, dedup_key) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  -- ALERTA 4: Seguros por vencer
  FOR v_rec IN
    SELECT c.id, c.contract_number, c.fire_insurance_expiry, c.fire_insurance_company
    FROM public.contracts c
    WHERE c.agency_id = p_agency_id
      AND c.status = 'activo'
      AND c.has_fire_insurance = true
      AND c.fire_insurance_expiry BETWEEN p_reference_date AND p_reference_date + v_days_insurance_expiry * INTERVAL '1 day'
  LOOP
    INSERT INTO public.alerts (agency_id, alert_type, severity, title, message, entity_type, entity_id, dedup_key)
    VALUES (
      p_agency_id,
      'seguro_por_vencer',
      'warning',
      'Seguro próximo a vencer',
      format('El seguro de incendio del contrato %s (%s) vence el %s',
        v_rec.contract_number, COALESCE(v_rec.fire_insurance_company, 'N/A'), v_rec.fire_insurance_expiry::TEXT),
      'contract', v_rec.id,
      format('seguro_venc_%s', v_rec.id)
    )
    ON CONFLICT (agency_id, dedup_key) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  -- ALERTA 5: Clientes sin actividad prolongada
  FOR v_rec IN
    SELECT t.id, t.full_name,
           MAX(pp.payment_date) as last_payment_date,
           (p_reference_date - MAX(pp.payment_date)) as days_inactive
    FROM public.tenants t
    JOIN public.contracts c ON c.tenant_id = t.id AND c.status = 'activo'
    LEFT JOIN public.payments pay ON pay.contract_id = c.id
    LEFT JOIN public.partial_payments pp ON pp.payment_id = pay.id
    WHERE t.agency_id = p_agency_id
    GROUP BY t.id, t.full_name
    HAVING MAX(pp.payment_date) IS NOT NULL
      AND (p_reference_date - MAX(pp.payment_date)) > v_inactive_days
  LOOP
    INSERT INTO public.alerts (agency_id, alert_type, severity, title, message, entity_type, entity_id, dedup_key)
    VALUES (
      p_agency_id,
      'cliente_sin_actividad',
      'info',
      'Cliente sin actividad',
      format('%s no registra pagos hace %s días (último: %s)',
        v_rec.full_name, v_rec.days_inactive, v_rec.last_payment_date::TEXT),
      'tenant', v_rec.id,
      format('inactivo_%s_%s', v_rec.id, date_trunc('month', p_reference_date)::DATE)
    )
    ON CONFLICT (agency_id, dedup_key) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12.4 Trigger: crear alerta cuando se registra un pago parcial
CREATE OR REPLACE FUNCTION public.alert_on_partial_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_agency_id UUID;
  v_contract_number TEXT;
  v_tenant_name TEXT;
  v_pending DECIMAL(12,2);
BEGIN
  SELECT p.agency_id, c.contract_number, t.full_name,
         p.total_amount - (p.paid_amount + NEW.amount)
  INTO v_agency_id, v_contract_number, v_tenant_name, v_pending
  FROM public.payments p
  JOIN public.contracts c ON c.id = p.contract_id
  JOIN public.tenants t ON t.id = c.tenant_id
  WHERE p.id = NEW.payment_id;

  INSERT INTO public.alerts (agency_id, alert_type, severity, title, message, entity_type, entity_id, dedup_key)
  VALUES (
    v_agency_id,
    'pago_parcial_recibido',
    'info',
    'Pago parcial recibido',
    format('Se registró un pago de $%s para el contrato %s (%s). Saldo restante: $%s',
      NEW.amount::TEXT, v_contract_number, v_tenant_name, GREATEST(v_pending, 0)::TEXT),
    'payment', NEW.payment_id,
    format('pago_parcial_%s_%s', NEW.id, NOW()::DATE)
  )
  ON CONFLICT (agency_id, dedup_key) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_alert_on_partial_payment ON public.partial_payments;
CREATE TRIGGER trg_alert_on_partial_payment
  AFTER INSERT ON public.partial_payments
  FOR EACH ROW EXECUTE FUNCTION public.alert_on_partial_payment();

-- 12.5 Marcar cuotas vencidas como atrasadas (se ejecuta via cron)
CREATE OR REPLACE FUNCTION public.mark_overdue_payments(
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.payments
  SET status = 'atrasado'
  WHERE status IN ('pendiente', 'parcial')
    AND due_date < p_reference_date
    AND pending_amount > 0;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12.6 Insertar configuración por defecto al crear agencia
CREATE OR REPLACE FUNCTION public.seed_agency_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.system_config (agency_id, config_key, config_value, description) VALUES
    (NEW.id, 'interest_rate_daily', '0.001', 'Tasa de interés diaria por mora (0.1%)'),
    (NEW.id, 'grace_days', '5', 'Días de gracia antes de aplicar mora'),
    (NEW.id, 'alert_days_before_due', '5', 'Días antes del vencimiento para generar alerta'),
    (NEW.id, 'alert_days_contract_expiry', '30', 'Días antes de fin de contrato para alertar'),
    (NEW.id, 'alert_days_insurance_expiry', '30', 'Días antes de vencimiento de seguro para alertar'),
    (NEW.id, 'inactive_client_days', '90', 'Días sin actividad para marcar cliente inactivo'),
    (NEW.id, 'mora_grave_days', '30', 'Días de atraso para considerar mora grave');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_seed_agency_config ON public.agencies;
CREATE TRIGGER trg_seed_agency_config
  AFTER INSERT ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.seed_agency_config();

-- =====================================================
-- 13. ROW LEVEL SECURITY
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarantors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_rent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partial_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- PROFILES
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR agency_id = get_user_agency_id());
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- AGENCIES
CREATE POLICY "agencies_select" ON public.agencies
  FOR SELECT USING (id = get_user_agency_id());
CREATE POLICY "agencies_update" ON public.agencies
  FOR UPDATE USING (
    id = get_user_agency_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Macro para tablas con agency_id (landlords, tenants, guarantors, properties)
-- SELECT: misma agencia
-- INSERT: agency_id debe coincidir con la del usuario
-- UPDATE: misma agencia
-- DELETE: solo admin/agente de la misma agencia

-- LANDLORDS
CREATE POLICY "landlords_select" ON public.landlords
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "landlords_insert" ON public.landlords
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id());
CREATE POLICY "landlords_update" ON public.landlords
  FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "landlords_delete" ON public.landlords
  FOR DELETE USING (
    agency_id = get_user_agency_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','agente'))
  );

-- TENANTS
CREATE POLICY "tenants_select" ON public.tenants
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "tenants_insert" ON public.tenants
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id());
CREATE POLICY "tenants_update" ON public.tenants
  FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "tenants_delete" ON public.tenants
  FOR DELETE USING (
    agency_id = get_user_agency_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','agente'))
  );

-- GUARANTORS
CREATE POLICY "guarantors_select" ON public.guarantors
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "guarantors_insert" ON public.guarantors
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id());
CREATE POLICY "guarantors_update" ON public.guarantors
  FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "guarantors_delete" ON public.guarantors
  FOR DELETE USING (
    agency_id = get_user_agency_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','agente'))
  );

-- PROPERTIES
CREATE POLICY "properties_select" ON public.properties
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "properties_insert" ON public.properties
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id());
CREATE POLICY "properties_update" ON public.properties
  FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "properties_delete" ON public.properties
  FOR DELETE USING (
    agency_id = get_user_agency_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','agente'))
  );

-- CONTRACTS
CREATE POLICY "contracts_select" ON public.contracts
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "contracts_insert" ON public.contracts
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id());
CREATE POLICY "contracts_update" ON public.contracts
  FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "contracts_delete" ON public.contracts
  FOR DELETE USING (
    agency_id = get_user_agency_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- CONTRACT_RENT_HISTORY
CREATE POLICY "rent_history_select" ON public.contract_rent_history
  FOR SELECT USING (
    agency_id = get_user_agency_id()
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_rent_history.contract_id
        AND c.agency_id = get_user_agency_id()
    )
  );
CREATE POLICY "rent_history_insert" ON public.contract_rent_history
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id()
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id AND c.agency_id = get_user_agency_id()
    )
  );

-- PAYMENTS
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id());
CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "payments_delete" ON public.payments
  FOR DELETE USING (
    agency_id = get_user_agency_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','agente'))
  );

-- PARTIAL_PAYMENTS
CREATE POLICY "partial_payments_select" ON public.partial_payments
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "partial_payments_insert" ON public.partial_payments
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id());
CREATE POLICY "partial_payments_delete" ON public.partial_payments
  FOR DELETE USING (
    agency_id = get_user_agency_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INTEREST_CALCULATIONS
CREATE POLICY "interest_calc_select" ON public.interest_calculations
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "interest_calc_insert" ON public.interest_calculations
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id());

-- PRICE_INDICES (lectura pública, escritura solo admin)
CREATE POLICY "price_indices_select" ON public.price_indices
  FOR SELECT USING (
    agency_id = get_user_agency_id() OR agency_id IS NULL
  );
CREATE POLICY "price_indices_manage" ON public.price_indices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ALERTS
CREATE POLICY "alerts_select" ON public.alerts
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "alerts_update" ON public.alerts
  FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "alerts_insert" ON public.alerts
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id());

-- DOCUMENTS
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id());
CREATE POLICY "documents_delete" ON public.documents
  FOR DELETE USING (uploaded_by = auth.uid());

-- AGENT_INVITATIONS
CREATE POLICY "invitations_manage" ON public.agent_invitations
  FOR ALL USING (
    agency_id = get_user_agency_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_agency_admin = true))
  );

-- AUDIT_LOG (solo lectura para la agencia, escritura por funciones SECURITY DEFINER)
CREATE POLICY "audit_select" ON public.audit_log
  FOR SELECT USING (agency_id = get_user_agency_id());
-- INSERT se hace via funciones SECURITY DEFINER, no directamente por usuarios

-- SYSTEM_CONFIG
CREATE POLICY "config_select" ON public.system_config
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "config_update" ON public.system_config
  FOR UPDATE USING (
    agency_id = get_user_agency_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "config_insert" ON public.system_config
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
