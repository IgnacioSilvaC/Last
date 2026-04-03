"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { createClient } from "@/lib/supabase/client"
import { getTodayLocalString } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/contract-calculations"
import { useAgency } from "@/hooks/use-agency"
import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import type { Payment, PaymentMethod, CurrencyType } from "@/lib/types"

interface ContractOption {
  id: string
  contract_number: string
  monthly_rent: number
  current_rent_amount?: number
  currency: string
  tenant_id: string
  payment_day?: number
  admin_fee_percentage?: number
  expenses_amount?: number
  late_payment_type?: string
  late_payment_penalty_percentage?: number
  late_payment_grace_days?: number
  late_payment_fixed_amount?: number
}

interface TenantOption {
  id: string
  full_name: string
}

interface PaymentFormProps {
  payment?: Payment | null
  mode?: "create" | "edit"
  contracts?: ContractOption[]
}

export function PaymentForm({ payment, mode = "create", contracts: propContracts }: PaymentFormProps) {
  const router = useRouter()
  const { agency } = useAgency()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contracts, setContracts] = useState<ContractOption[]>(propContracts || [])
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [selectedContract, setSelectedContract] = useState<string>(payment?.contract_id || "")
  const [selectedContractData, setSelectedContractData] = useState<ContractOption | null>(null)
  const [periodMonth, setPeriodMonth] = useState<number>(payment?.period_month || new Date().getMonth() + 1)
  const [periodYear, setPeriodYear] = useState<number>(payment?.period_year || new Date().getFullYear())
  const [dueDate, setDueDate] = useState<string>(payment?.due_date || getTodayLocalString())
  const [status, setStatus] = useState<string>(payment?.status || "pendiente")

  const isEditing = mode === "edit" && !!payment

  useEffect(() => {
    if (propContracts && propContracts.length > 0) {
      setContracts(propContracts)
      return
    }
    const loadData = async () => {
      const supabase = createClient()

      const { data: contractsData } = await supabase
        .from("contracts")
        .select("id, contract_number, monthly_rent, current_rent_amount, currency, tenant_id, payment_day, admin_fee_percentage, expenses_amount, late_payment_type, late_payment_penalty_percentage, late_payment_grace_days, late_payment_fixed_amount")
        .eq("status", "activo")

      const { data: tenantsData } = await supabase.from("tenants").select("id, full_name")

      if (contractsData) setContracts(contractsData)
      if (tenantsData) setTenants(tenantsData)
    }
    loadData()
  }, [propContracts])

  useEffect(() => {
    if (selectedContract) {
      const contract = contracts.find((c) => c.id === selectedContract)
      setSelectedContractData(contract || null)
    } else {
      setSelectedContractData(null)
    }
  }, [selectedContract, contracts])

  // Auto-calculate due date from contract's payment_day + selected period
  useEffect(() => {
    if (isEditing) return
    if (!selectedContractData?.payment_day || !periodYear || !periodMonth) return
    const day = selectedContractData.payment_day
    const daysInMonth = new Date(periodYear, periodMonth, 0).getDate()
    const actualDay = Math.min(day, daysInMonth)
    setDueDate(
      `${periodYear}-${String(periodMonth).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`
    )
  }, [selectedContractData, periodYear, periodMonth, isEditing])

  const getTenantName = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId)
    return tenant?.full_name || "Sin inquilino"
  }

  const contractOptions = contracts.map((contract) => ({
    value: contract.id,
    label: contract.contract_number,
    description: getTenantName(contract.tenant_id),
  }))

  const getCurrentRent = (): number => {
    if (!selectedContractData) return 0
    return Number(selectedContractData.current_rent_amount || selectedContractData.monthly_rent || 0)
  }

  const getAdminFee = (): number => {
    if (!selectedContractData?.admin_fee_percentage) return 0
    return Math.round((getCurrentRent() * Number(selectedContractData.admin_fee_percentage)) * 100 / 100) / 100
  }

  const getExpenses = (): number => {
    return Number(selectedContractData?.expenses_amount || 0)
  }

  const totalAmount = useMemo(() => {
    return Math.round((getCurrentRent() + getExpenses() + getAdminFee()) * 100) / 100
  }, [selectedContractData])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!agency?.id) {
      setError("No se pudo determinar la inmobiliaria. Recargá la página.")
      setIsLoading(false)
      return
    }

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const baseAmount = getCurrentRent()
    const expensesAmount = Number.parseFloat(formData.get("expenses_amount") as string) || 0
    const adminFeeAmount = getAdminFee()
    const computedTotal = Math.round((baseAmount + expensesAmount + adminFeeAmount) * 100) / 100

    const paymentData = {
      agency_id: agency.id,
      contract_id: selectedContract,
      payment_number: Number.parseInt(formData.get("payment_number") as string) || 1,
      period_month: periodMonth,
      period_year: periodYear,
      due_date: dueDate,
      base_amount: baseAmount,
      expenses_amount: expensesAmount,
      admin_fee_amount: adminFeeAmount,
      late_fee: 0,
      interest_amount: 0,
      total_amount: computedTotal,
      paid_amount: 0,
      pending_amount: computedTotal,
      status: status,
      payment_method: (formData.get("payment_method") as string) || null,
      receipt_number: (formData.get("receipt_number") as string) || null,
      notes: (formData.get("notes") as string) || null,
    }

    try {
      if (isEditing) {
        const { error: updateError } = await supabase
          .from("payments")
          .update(paymentData)
          .eq("id", payment!.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from("payments").insert(paymentData)
        if (insertError) throw insertError
      }
      router.push("/pagos")
      router.refresh()
    } catch (err: unknown) {
      console.error("Error saving payment:", err)
      setError(err instanceof Error ? err.message : "Error al guardar el pago")
    } finally {
      setIsLoading(false)
    }
  }

  const months = [
    { value: 1, label: "Enero" }, { value: 2, label: "Febrero" }, { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" }, { value: 5, label: "Mayo" }, { value: 6, label: "Junio" },
    { value: 7, label: "Julio" }, { value: 8, label: "Agosto" }, { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" }, { value: 11, label: "Noviembre" }, { value: 12, label: "Diciembre" },
  ]

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Contrato *</Label>
            <SearchableSelect
              options={contractOptions}
              value={selectedContract}
              onValueChange={setSelectedContract}
              placeholder="Buscar contrato..."
              searchPlaceholder="Escriba para filtrar..."
              emptyMessage="No se encontraron contratos"
            />
            {contracts.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay contratos activos. Crea un contrato primero.</p>
            )}
          </div>

          {selectedContractData && (
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-medium mb-2">Información del Contrato</h4>
              <div className="grid gap-2 md:grid-cols-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Renta mensual:</span>
                  <p className="font-bold text-lg">
                    {formatCurrency(getCurrentRent(), selectedContractData.currency as CurrencyType)}
                  </p>
                </div>
                {selectedContractData.admin_fee_percentage ? (
                  <div>
                    <span className="text-muted-foreground">
                      Administración ({selectedContractData.admin_fee_percentage}%):
                    </span>
                    <p className="font-medium text-emerald-600">
                      {formatCurrency(getAdminFee(), selectedContractData.currency as CurrencyType)}
                    </p>
                  </div>
                ) : null}
                <div>
                  <span className="text-muted-foreground">Total cuota:</span>
                  <p className="font-bold text-lg text-primary">
                    {formatCurrency(totalAmount, selectedContractData.currency as CurrencyType)}
                  </p>
                </div>
              </div>
              {selectedContractData.payment_day && (
                <div className="mt-3 pt-3 border-t grid gap-2 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Vencimiento:</span>
                    <p className="font-medium">Día {selectedContractData.payment_day} del mes</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mora desde:</span>
                    <p className="font-medium">
                      Día {(selectedContractData.payment_day) + (selectedContractData.late_payment_grace_days || 0)} del mes
                      {selectedContractData.late_payment_grace_days
                        ? ` (${selectedContractData.late_payment_grace_days} días de gracia)`
                        : ""}
                      {" — "}
                      {selectedContractData.late_payment_type === "monto_fijo"
                        ? `Cargo fijo: ${formatCurrency(selectedContractData.late_payment_fixed_amount || 0, selectedContractData.currency as CurrencyType)}`
                        : selectedContractData.late_payment_type === "ninguna"
                        ? "Sin penalidad"
                        : `${selectedContractData.late_payment_penalty_percentage || 0}% diario`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Período — Mes *</Label>
              <Select value={String(periodMonth)} onValueChange={(v) => setPeriodMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Período — Año *</Label>
              <Input
                type="number"
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value))}
                min="2020" max="2040"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_number">N° Cuota</Label>
              <Input
                id="payment_number"
                name="payment_number"
                type="number"
                min="1"
                defaultValue={payment?.payment_number || 1}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="due_date">Fecha de Vencimiento *</Label>
              <Input id="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="parcial">Pago Parcial</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                  <SelectItem value="anulado">Anulado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Monto Base (renta)</Label>
              <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 flex items-center font-medium">
                {selectedContractData
                  ? formatCurrency(getCurrentRent(), selectedContractData.currency as CurrencyType)
                  : <span className="text-muted-foreground">Seleccione un contrato</span>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenses_amount">Expensas</Label>
              <Input
                id="expenses_amount"
                name="expenses_amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={isEditing ? payment?.expenses_amount : getExpenses()}
              />
            </div>
            <div className="space-y-2">
              <Label>Admin Fee</Label>
              <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 flex items-center font-medium text-emerald-600">
                {selectedContractData
                  ? formatCurrency(getAdminFee(), selectedContractData.currency as CurrencyType)
                  : "-"}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment_method">Método de Pago</Label>
              <Select name="payment_method" defaultValue={payment?.payment_method || "transferencia"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt_number">Número de Referencia/Recibo</Label>
              <Input
                id="receipt_number"
                name="receipt_number"
                defaultValue={payment?.receipt_number || ""}
                placeholder="Número de transferencia, cheque, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={payment?.notes || ""} placeholder="Observaciones adicionales..." />
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading || !selectedContract}>
              {isLoading ? "Guardando..." : isEditing ? "Actualizar Cuota" : "Registrar Cuota"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
