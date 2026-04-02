-- =====================================================
-- SISTEMA DE GESTIÓN INMOBILIARIA - ESQUEMA COMPLETO
-- =====================================================
-- Ejecuta este script para crear todas las tablas necesarias

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: agencies (Inmobiliarias)
-- =====================================================
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: profiles (Usuarios/Agentes)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'agente' CHECK (role IN ('admin', 'agente', 'viewer')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: landlords (Arrendadores/Propietarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS landlords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  identification TEXT NOT NULL,
  tax_id TEXT,
  address TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_cbu TEXT,
  notes TEXT,
  -- Documentos adjuntos
  id_document_url TEXT,
  id_document_back_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: tenants (Arrendatarios/Inquilinos)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  identification TEXT NOT NULL,
  occupation TEXT,
  employer TEXT,
  monthly_income DECIMAL(12,2),
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  -- Documentos adjuntos
  id_document_url TEXT,
  id_document_back_url TEXT,
  income_proof_url TEXT,
  income_proof_2_url TEXT,
  income_proof_3_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: guarantors (Garantes/Avales)
-- =====================================================
CREATE TABLE IF NOT EXISTS guarantors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  identification TEXT NOT NULL,
  address TEXT,
  occupation TEXT,
  employer TEXT,
  monthly_income DECIMAL(12,2),
  -- Información de la propiedad en garantía
  guarantee_property_address TEXT,
  guarantee_property_registry TEXT,
  notes TEXT,
  -- Documentos adjuntos
  id_document_url TEXT,
  id_document_back_url TEXT,
  income_proof_url TEXT,
  income_proof_2_url TEXT,
  income_proof_3_url TEXT,
  property_deed_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: properties (Propiedades/Inmuebles)
-- =====================================================
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  landlord_id UUID REFERENCES landlords(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  property_type TEXT DEFAULT 'departamento' CHECK (property_type IN ('departamento', 'casa', 'local', 'oficina', 'cochera', 'terreno', 'otro')),
  address TEXT NOT NULL,
  city TEXT,
  neighborhood TEXT,
  postal_code TEXT,
  floor TEXT,
  apartment TEXT,
  square_meters DECIMAL(10,2),
  bedrooms INTEGER,
  bathrooms INTEGER,
  has_garage BOOLEAN DEFAULT false,
  has_storage BOOLEAN DEFAULT false,
  amenities TEXT[],
  description TEXT,
  status TEXT DEFAULT 'disponible' CHECK (status IN ('disponible', 'arrendado', 'mantenimiento', 'reservado')),
  monthly_rent DECIMAL(12,2),
  rent_currency TEXT DEFAULT 'ARS' CHECK (rent_currency IN ('ARS', 'USD')),
  expenses DECIMAL(12,2),
  -- Números de suministros
  water_account TEXT,
  electricity_account TEXT,
  gas_account TEXT,
  abl_account TEXT,
  -- Registro de propiedad
  property_registry TEXT,
  cadastral_designation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: contracts (Contratos)
-- =====================================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  contract_number TEXT NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE RESTRICT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT,
  landlord_id UUID REFERENCES landlords(id) ON DELETE RESTRICT,
  guarantor_id UUID REFERENCES guarantors(id) ON DELETE SET NULL,
  guarantor_2_id UUID REFERENCES guarantors(id) ON DELETE SET NULL,
  -- Fechas del contrato
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  signing_date DATE,
  -- Términos financieros
  monthly_rent DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  security_deposit DECIMAL(12,2),
  deposit_months INTEGER DEFAULT 1,
  expenses_amount DECIMAL(12,2),
  expenses_included BOOLEAN DEFAULT false,
  payment_day INTEGER DEFAULT 10 CHECK (payment_day >= 1 AND payment_day <= 28),
  -- Configuración de aumentos
  increase_type TEXT CHECK (increase_type IN ('icl', 'ipc', 'uva', 'fixed_percentage', 'none')),
  increase_percentage DECIMAL(5,2),
  increase_frequency_months INTEGER DEFAULT 12,
  next_increase_date DATE,
  -- Multas y penalizaciones
  late_payment_penalty_percentage DECIMAL(5,2) DEFAULT 0,
  late_payment_grace_days INTEGER DEFAULT 0,
  early_termination_penalty_months INTEGER DEFAULT 2,
  -- Seguro
  has_fire_insurance BOOLEAN DEFAULT false,
  fire_insurance_policy TEXT,
  fire_insurance_company TEXT,
  fire_insurance_expiry DATE,
  -- Estado
  status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'activo', 'finalizado', 'cancelado', 'renovado')),
  -- Otros campos
  special_clauses TEXT,
  notes TEXT,
  contract_document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: contract_rent_history (Historial de rentas)
-- =====================================================
CREATE TABLE IF NOT EXISTS contract_rent_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  previous_rent DECIMAL(12,2),
  new_rent DECIMAL(12,2) NOT NULL,
  increase_percentage DECIMAL(5,2),
  increase_type TEXT,
  index_value DECIMAL(10,4),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: payments (Pagos)
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  expenses_amount DECIMAL(12,2) DEFAULT 0,
  late_fee DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  payment_date DATE,
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia', 'cheque', 'otro')),
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagado', 'parcial', 'atrasado')),
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: price_indices (Índices de actualización)
-- =====================================================
CREATE TABLE IF NOT EXISTS price_indices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  index_type TEXT NOT NULL CHECK (index_type IN ('icl', 'ipc', 'uva', 'custom')),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  value DECIMAL(12,4) NOT NULL,
  accumulated_value DECIMAL(12,4),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(index_type, year, month)
);

-- =====================================================
-- TABLA: documents (Documentos adjuntos genéricos)
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contract', 'tenant', 'landlord', 'guarantor', 'property')),
  entity_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES para mejor rendimiento
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_agency ON profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_landlords_agency ON landlords(agency_id);
CREATE INDEX IF NOT EXISTS idx_tenants_agency ON tenants(agency_id);
CREATE INDEX IF NOT EXISTS idx_guarantors_agency ON guarantors(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_agency ON properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_contracts_agency ON contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_price_indices_type_date ON price_indices(index_type, year, month);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);

-- =====================================================
-- TRIGGERS para actualizar updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY['agencies', 'profiles', 'landlords', 'tenants', 'guarantors', 'properties', 'contracts', 'payments'])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$ language 'plpgsql';

-- =====================================================
-- TRIGGER para crear perfil automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
