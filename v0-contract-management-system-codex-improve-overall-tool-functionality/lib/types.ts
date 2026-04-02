export type UserRole = "admin" | "agente" | "contador"

export type PropertyType = "casa" | "departamento" | "local_comercial" | "oficina" | "terreno" | "bodega"

export type PropertyStatus = "disponible" | "arrendado" | "mantenimiento" | "inactivo"

export type ContractStatus = "activo" | "vencido" | "renovado" | "cancelado"

export type PaymentStatus = "pendiente" | "pagado" | "atrasado" | "parcial"

export type CurrencyType = "USD" | "ARS" | "MXN"

export type IncreaseType = "porcentaje" | "fijo" | "icl" | "ipc" | "uva"

export type IncreaseFrequency = "mensual" | "bimestral" | "trimestral" | "cuatrimestral" | "semestral" | "anual"

export type IndexType = "icl" | "ipc" | "uva" | "custom"

export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled"

export interface Agency {
  id: string
  name: string
  legal_name?: string
  tax_id?: string
  email: string
  phone?: string
  address?: string
  city?: string
  logo_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  agency_id?: string
  is_agency_admin: boolean
  created_at: string
  updated_at: string
  agency?: Agency
}

export interface Property {
  id: string
  code: string
  address: string
  city: string
  state: string
  postal_code?: string
  property_type: PropertyType
  bedrooms?: number
  bathrooms?: number
  area_m2?: number
  description?: string
  monthly_rent: number
  status: PropertyStatus
  owner_id?: string
  agency_id?: string
  created_by: string
  created_at: string
  updated_at: string
  landlord?: Landlord
}

export interface Tenant {
  id: string
  full_name: string
  email?: string
  phone: string
  identification: string
  identification_type?: string
  address?: string
  occupation?: string
  employer?: string
  monthly_income?: number
  emergency_contact_name?: string
  emergency_contact_phone?: string
  agency_id?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Landlord {
  id: string
  full_name: string
  email?: string
  phone: string
  identification: string
  identification_type?: string
  address?: string
  bank_name?: string
  bank_account?: string
  bank_cbu?: string
  tax_id?: string
  tax_condition?: string
  agency_id?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Guarantor {
  id: string
  full_name: string
  email?: string
  phone: string
  identification: string
  identification_type?: string
  address?: string
  occupation?: string
  employer?: string
  monthly_income?: number
  property_address?: string
  property_registration?: string
  agency_id?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Contract {
  id: string
  contract_number: string
  property_id: string
  tenant_id: string
  landlord_id: string
  guarantor_id?: string
  guarantor2_id?: string
  start_date: string
  end_date: string
  monthly_rent: number
  currency: CurrencyType
  deposit_amount?: number
  deposit_currency?: CurrencyType
  payment_day: number
  // Seguro
  has_fire_insurance: boolean
  insurance_company?: string
  insurance_amount?: number
  insurance_policy_number?: string
  insurance_expiry_date?: string
  // Penalidades
  late_payment_penalty?: number
  penalty_type?: string
  grace_period_days: number
  // Aumentos
  increase_type?: IncreaseType
  increase_frequency?: IncreaseFrequency
  increase_percentage?: number
  increase_fixed_amount?: number
  first_increase_date?: string
  next_increase_date?: string
  current_rent_amount?: number
  // Servicios
  includes_utilities: boolean
  utilities_description?: string
  expenses_amount?: number
  // Otros
  special_clauses?: string
  contract_file_url?: string
  status: ContractStatus
  notes?: string
  agency_id?: string
  created_by: string
  created_at: string
  updated_at: string
  // Relaciones
  property?: Property
  tenant?: Tenant
  landlord?: Landlord
  guarantor?: Guarantor
  guarantor2?: Guarantor
}

export interface Payment {
  id: string
  contract_id: string
  period_month: number
  period_year: number
  payment_date?: string
  due_date: string
  amount: number
  currency: CurrencyType
  status: PaymentStatus
  payment_method?: string
  reference_number?: string
  notes?: string
  agency_id?: string
  recorded_by: string
  created_at: string
  updated_at: string
  contract?: Contract
}

export interface PriceIndex {
  id: string
  agency_id?: string
  index_type: IndexType
  year: number
  month: number
  value: number
  accumulated_value?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface ContractIncrease {
  id: string
  contract_id: string
  agency_id?: string
  effective_date: string
  previous_rent: number
  new_rent: number
  increase_percentage: number
  increase_type: IncreaseType
  index_value_used?: number
  is_applied: boolean
  applied_at?: string
  notes?: string
  created_at: string
  contract?: Contract
}

export interface AgentInvitation {
  id: string
  agency_id: string
  email: string
  role: UserRole
  invited_by: string
  status: InvitationStatus
  token: string
  expires_at: string
  accepted_at?: string
  created_at: string
}

// Helpers para mostrar etiquetas
export const currencyLabels: Record<CurrencyType, string> = {
  USD: "Dólares (USD)",
  ARS: "Pesos Argentinos (ARS)",
  MXN: "Pesos Mexicanos (MXN)",
}

export const currencySymbols: Record<CurrencyType, string> = {
  USD: "US$",
  ARS: "$",
  MXN: "MX$",
}

export const increaseTypeLabels: Record<IncreaseType, string> = {
  porcentaje: "Porcentaje Fijo",
  fijo: "Monto Fijo",
  icl: "Índice de Contratos de Locación (ICL)",
  ipc: "Índice de Precios al Consumidor (IPC)",
  uva: "Unidad de Valor Adquisitivo (UVA)",
}

export const increaseFrequencyLabels: Record<IncreaseFrequency, string> = {
  mensual: "Mensual",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  cuatrimestral: "Cuatrimestral",
  semestral: "Semestral",
  anual: "Anual",
}

export const increaseFrequencyMonths: Record<IncreaseFrequency, number> = {
  mensual: 1,
  bimestral: 2,
  trimestral: 3,
  cuatrimestral: 4,
  semestral: 6,
  anual: 12,
}

export const indexTypeLabels: Record<IndexType, string> = {
  icl: "ICL - Índice Contratos Locación",
  ipc: "IPC - Índice Precios Consumidor",
  uva: "UVA - Unidad Valor Adquisitivo",
  custom: "Índice Personalizado",
}
