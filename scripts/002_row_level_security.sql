-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE guarantors ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_rent_history ENABLE ROW LEVEL SECURITY;

-- Función helper para obtener agency_id del usuario
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID AS $$
  SELECT agency_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- =====================================================
-- Políticas para PROFILES
-- =====================================================
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can view agency members" ON profiles
  FOR SELECT USING (agency_id = get_user_agency_id());

-- =====================================================
-- Políticas para AGENCIES
-- =====================================================
CREATE POLICY "Users can view own agency" ON agencies
  FOR SELECT USING (id = get_user_agency_id());

CREATE POLICY "Admin can update agency" ON agencies
  FOR UPDATE USING (
    id = get_user_agency_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- Políticas para LANDLORDS
-- =====================================================
CREATE POLICY "Users can view agency landlords" ON landlords
  FOR SELECT USING (agency_id = get_user_agency_id() OR agency_id IS NULL);

CREATE POLICY "Users can insert landlords" ON landlords
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update agency landlords" ON landlords
  FOR UPDATE USING (agency_id = get_user_agency_id() OR agency_id IS NULL);

CREATE POLICY "Admin can delete landlords" ON landlords
  FOR DELETE USING (
    (agency_id = get_user_agency_id() OR agency_id IS NULL) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'agente'))
  );

-- =====================================================
-- Políticas para TENANTS
-- =====================================================
CREATE POLICY "Users can view agency tenants" ON tenants
  FOR SELECT USING (agency_id = get_user_agency_id() OR agency_id IS NULL);

CREATE POLICY "Users can insert tenants" ON tenants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update agency tenants" ON tenants
  FOR UPDATE USING (agency_id = get_user_agency_id() OR agency_id IS NULL);

CREATE POLICY "Admin can delete tenants" ON tenants
  FOR DELETE USING (
    (agency_id = get_user_agency_id() OR agency_id IS NULL) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'agente'))
  );

-- =====================================================
-- Políticas para GUARANTORS
-- =====================================================
CREATE POLICY "Users can view agency guarantors" ON guarantors
  FOR SELECT USING (agency_id = get_user_agency_id() OR agency_id IS NULL);

CREATE POLICY "Users can insert guarantors" ON guarantors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update agency guarantors" ON guarantors
  FOR UPDATE USING (agency_id = get_user_agency_id() OR agency_id IS NULL);

CREATE POLICY "Admin can delete guarantors" ON guarantors
  FOR DELETE USING (
    (agency_id = get_user_agency_id() OR agency_id IS NULL) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'agente'))
  );

-- =====================================================
-- Políticas para PROPERTIES
-- =====================================================
CREATE POLICY "Users can view agency properties" ON properties
  FOR SELECT USING (agency_id = get_user_agency_id() OR agency_id IS NULL);

CREATE POLICY "Users can insert properties" ON properties
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update agency properties" ON properties
  FOR UPDATE USING (agency_id = get_user_agency_id() OR agency_id IS NULL);

CREATE POLICY "Admin can delete properties" ON properties
  FOR DELETE USING (
    (agency_id = get_user_agency_id() OR agency_id IS NULL) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'agente'))
  );

-- =====================================================
-- Políticas para CONTRACTS
-- =====================================================
CREATE POLICY "Users can view agency contracts" ON contracts
  FOR SELECT USING (agency_id = get_user_agency_id() OR agency_id IS NULL);

CREATE POLICY "Users can insert contracts" ON contracts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update agency contracts" ON contracts
  FOR UPDATE USING (agency_id = get_user_agency_id() OR agency_id IS NULL);

CREATE POLICY "Admin can delete contracts" ON contracts
  FOR DELETE USING (
    (agency_id = get_user_agency_id() OR agency_id IS NULL) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- Políticas para PAYMENTS
-- =====================================================
CREATE POLICY "Users can view agency payments" ON payments
  FOR SELECT USING (agency_id = get_user_agency_id() OR agency_id IS NULL);

CREATE POLICY "Users can insert payments" ON payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update agency payments" ON payments
  FOR UPDATE USING (agency_id = get_user_agency_id() OR agency_id IS NULL);

CREATE POLICY "Admin can delete payments" ON payments
  FOR DELETE USING (
    (agency_id = get_user_agency_id() OR agency_id IS NULL) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'agente'))
  );

-- =====================================================
-- Políticas para PRICE_INDICES (públicos para lectura)
-- =====================================================
CREATE POLICY "Anyone can view indices" ON price_indices
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage indices" ON price_indices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- Políticas para DOCUMENTS
-- =====================================================
CREATE POLICY "Users can view agency documents" ON documents
  FOR SELECT USING (agency_id = get_user_agency_id() OR agency_id IS NULL);

CREATE POLICY "Users can insert documents" ON documents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (uploaded_by = auth.uid());

-- =====================================================
-- Políticas para CONTRACT_RENT_HISTORY
-- =====================================================
CREATE POLICY "Users can view rent history" ON contract_rent_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_rent_history.contract_id 
      AND (contracts.agency_id = get_user_agency_id() OR contracts.agency_id IS NULL)
    )
  );

CREATE POLICY "Users can insert rent history" ON contract_rent_history
  FOR INSERT WITH CHECK (true);
