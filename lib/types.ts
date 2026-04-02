export type UserRole = "admin" | "agente" | "contador" | "viewer"

export type PropertyType = "casa" | "departamento" | "local" | "oficina" | "cochera" | "terreno" | "bodega" | "otro"

export type PropertyStatus = "disponible" | "arrendado" | "mantenimiento" | "reservado" | "inactivo"

export type ContractStatus = "borrador" | "activo" | "finalizado" | "cancelado" | "renovado"

export type PaymentStatus = "pendiente" | "pagado" | "atrasado" | "parcial" | "anulado"

export type CurrencyType = "USD" | "ARS" | "MXN"

export type IncreaseType = "porcentaje" | "fijo" | "icl" | "ipc" | "uva" | "none"

export type IncreaseFrequency = "mensual" | "bimestral" | "trimestral" | "cuatrimestral" | "semestral" | "anual"

export type IndexType = "icl" | "ipc" | "uva" | "custom"

export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled"

export type AlertType =
  | "vencimiento_proximo"
  | "pago_en_mora"
  | "pago_parcial_recibido"
  | "contrato_por_vencer"
  | "cliente_sin_actividad"
  | "seguro_por_vencer"
  | "aumento_pendiente"

export type AlertSeverity = "info" | "warning" | "critical"

export type PaymentMethod = "efectivo" | "transferencia" | "cheque" | "deposito" | "otro"

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
  timezone: string
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
  is_active: boolean
  created_at: string
  updated_at: string
  agency?: Agency
}

export interface Property {
  id: string
  code: string
  address: string
  city?: string
  neighborhood?: string
  postal_code?: string
  floor?: string
  apartment?: string
  property_type: PropertyType
  square_meters?: number
  bedrooms?: number
  bathrooms?: number
  has_garage?: boolean
  has_storage?: boolean
  amenities?: string[]
  description?: string
  monthly_rent?: number
  rent_currency?: CurrencyType
  expenses?: number
  status: PropertyStatus
  landlord_id?: string
  agency_id?: string
  created_by?: string
  water_account?: string
  electricity_account?: string
  gas_account?: string
  abl_account?: string
  property_registry?: string
  cadastral_designation?: string
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
  notes?: string
  agency_id?: string
  created_by?: string
  id_document_url?: string
  id_document_back_url?: string
  income_proof_url?: string
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
  notes?: string
  agency_id?: string
  created_by?: string
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
  guarantee_property_address?: string
  guarantee_property_registry?: string
  notes?: string
  agency_id?: string
  created_by?: string
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
  guarantor_2_id?: string
  start_date: string
  end_date: string
  signing_date?: string
  monthly_rent: number
  current_rent_amount?: number
  currency: CurrencyType
  security_deposit?: number
  deposit_months?: number
  payment_day: number
  expenses_amount?: number
  expenses_included?: boolean
  // Seguro
  has_fire_insurance?: boolean
  fire_insurance_company?: string
  fire_insurance_policy?: string
  fire_insurance_expiry?: string
  // Penalidades
  late_payment_penalty_percentage: number
  late_payment_grace_days: number
  early_termination_penalty_months?: number
  // Aumentos
  increase_type?: IncreaseType
  increase_percentage?: number
  increase_fixed_amount?: number
  increase_frequency_months?: number
  first_increase_date?: string
  next_increase_date?: string
  // Servicios
  includes_utilities?: boolean
  utilities_description?: string
  // Admin fee
  admin_fee_percentage?: number
  // Otros
  special_clauses?: string
  contract_document_url?: string
  status: ContractStatus
  notes?: string
  agency_id?: string
  created_by?: string
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
  payment_number: number
  period_month: number
  period_year: number
  due_date: string
  base_amount: number
  expenses_amount: number
  admin_fee_amount: number
  late_fee: number
  interest_amount: number
  total_amount: number
  paid_amount: number
  pending_amount: number
  payment_date?: string
  payment_method?: PaymentMethod
  status: PaymentStatus
  receipt_number?: string
  notes?: string
  agency_id?: string
  created_at: string
  updated_at: string
  contract?: Contract
  contracts?: {
    contract_number?: string
    currency?: string
    admin_fee_percentage?: number
    monthly_rent?: number
    tenants?: { full_name?: string }
    properties?: { code?: string; address?: string }
  }
  partial_payments?: PartialPayment[]
}

export interface PartialPayment {
  id: string
  payment_id: string
  agency_id?: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  receipt_number?: string
  recorded_by: string
  notes?: string
  created_at: string
  recorded_by_profile?: { full_name?: string; email?: string }
}

export interface InterestCalculation {
  id: string
  payment_id: string
  agency_id?: string
  calculation_date: string
  outstanding_balance: number
  interest_rate: number
  interest_amount: number
  days_overdue: number
  notes?: string
  created_at: string
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
  created_by?: string
  created_at: string
  updated_at?: string
}

export interface ContractRentHistory {
  id: string
  contract_id: string
  agency_id?: string
  effective_date: string
  previous_rent: number
  new_rent: number
  increase_percentage: number
  increase_type: string
  index_value_used?: number
  is_applied: boolean
  applied_at?: string
  applied_by?: string
  notes?: string
  created_at: string
  contract?: Contract
}

export interface Alert {
  id: string
  agency_id: string
  alert_type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  entity_type?: string
  entity_id?: string
  is_read: boolean
  is_dismissed: boolean
  read_by?: string
  read_at?: string
  dedup_key?: string
  created_at: string
}

export interface Document {
  id: string
  agency_id?: string
  entity_type: string
  entity_id: string
  document_type: string
  file_name: string
  file_url: string
  file_size?: number
  mime_type?: string
  uploaded_by?: string
  created_at: string
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

export interface AuditLogEntry {
  id: string
  agency_id?: string
  user_id?: string
  user_email?: string
  action: string
  entity_type: string
  entity_id?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface SystemConfig {
  id: string
  agency_id: string
  config_key: string
  config_value: string
  description?: string
  updated_by?: string
  updated_at: string
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

export const increaseTypeLabels: Record<string, string> = {
  porcentaje: "Porcentaje Fijo",
  fijo: "Monto Fijo",
  icl: "Índice de Contratos de Locación (ICL)",
  ipc: "Índice de Precios al Consumidor (IPC)",
  uva: "Unidad de Valor Adquisitivo (UVA)",
  none: "Sin aumento",
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

export const alertTypeLabels: Record<AlertType, string> = {
  vencimiento_proximo: "Vencimiento Próximo",
  pago_en_mora: "Pago en Mora",
  pago_parcial_recibido: "Pago Parcial Recibido",
  contrato_por_vencer: "Contrato por Vencer",
  cliente_sin_actividad: "Cliente Sin Actividad",
  seguro_por_vencer: "Seguro por Vencer",
  aumento_pendiente: "Aumento Pendiente",
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  atrasado: "Atrasado",
  parcial: "Parcial",
  anulado: "Anulado",
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  cheque: "Cheque",
  deposito: "Depósito",
  otro: "Otro",
}

// Función para categorización de mora
export type MoraStatus = "al_dia" | "proximo_vencer" | "en_mora" | "mora_grave"

export function getMoraStatus(dueDate: string, pendingAmount: number, graceDays: number = 0, moraGraveDays: number = 30): MoraStatus {
  if (pendingAmount <= 0) return "al_dia"

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + "T12:00:00")
  due.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < -5) return "al_dia"
  if (diffDays < 0) return "proximo_vencer"
  if (diffDays <= graceDays) return "al_dia"
  if (diffDays > moraGraveDays) return "mora_grave"
  return "en_mora"
}

export function getDaysOverdue(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + "T12:00:00")
  due.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
}
