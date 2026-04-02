-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Properties policies (all authenticated users can view, only admins and creators can modify)
CREATE POLICY "Users can view all properties" ON public.properties
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert properties" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete properties" ON public.properties
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tenants policies
CREATE POLICY "Users can view all tenants" ON public.tenants
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert tenants" ON public.tenants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update tenants" ON public.tenants
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete tenants" ON public.tenants
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Landlords policies
CREATE POLICY "Users can view all landlords" ON public.landlords
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert landlords" ON public.landlords
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update landlords" ON public.landlords
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete landlords" ON public.landlords
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Contracts policies
CREATE POLICY "Users can view all contracts" ON public.contracts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert contracts" ON public.contracts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update contracts" ON public.contracts
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete contracts" ON public.contracts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Payments policies
CREATE POLICY "Users can view all payments" ON public.payments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update payments" ON public.payments
  FOR UPDATE USING (
    auth.uid() = recorded_by OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'contador'))
  );

CREATE POLICY "Admins can delete payments" ON public.payments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
