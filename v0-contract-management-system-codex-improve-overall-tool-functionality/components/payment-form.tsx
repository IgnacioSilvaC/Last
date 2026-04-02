"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { createClient } from "@/lib/supabase/client"
import { getTodayLocalString } from "@/lib/date-utils"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

const DEFAULT_AGENCY_ID = "00000000-0000-0000-0000-000000000001"

interface Contract {
  id: string
  contract_number: string
  monthly_rent: number
  currency: string
  tenant_id: string
  admin_fee_percentage?: number
  current_rent_amount?: number
}

interface Tenant {
  id: string
  full_name: string
}

export function PaymentForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedContract, setSelectedContract] = useState<string>("")
  const [selectedContractData, setSelectedContractData] = useState<Contract | null>(null)
  const [dueDate, setDueDate] = useState<string>(getTodayLocalString())
  const [paymentDate, setPaymentDate] = useState<string>(getTodayLocalString())
  const [status, setStatus] = useState<string>("pendiente")

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()

      const { data: contractsData } = await supabase
        .from("contracts")
        .select("id, contract_number, monthly_rent, currency, tenant_id, admin_fee_percentage, current_rent_amount")
        .eq("status", "activo")

      const { data: tenantsData } = await supabase.from("tenants").select("id, full_name")

      if (contractsData) setContracts(contractsData)
      if (tenantsData) setTenants(tenantsData)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (selectedContract) {
      const contract = contracts.find((c) => c.id === selectedContract)
      setSelectedContractData(contract || null)
    } else {
      setSelectedContractData(null)
    }
  }, [selectedContract, contracts])

  const getTenantName = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId)
    return tenant?.full_name || "Sin inquilino"
  }

  const contractOptions = contracts.map((contract) => ({
    value: contract.id,
    label: contract.contract_number,
    description: getTenantName(contract.tenant_id),
  }))

  const getCurrentRent = () => {
    if (!selectedContractData) return 0
    return Number(selectedContractData.current_rent_amount || selectedContractData.monthly_rent || 0)
  }

  const getAdminFee = () => {
    if (!selectedContractData || !selectedContractData.admin_fee_percentage) return 0
    return (getCurrentRent() * Number(selectedContractData.admin_fee_percentage)) / 100
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const baseAmount = getCurrentRent()
    const expensesAmount = Number.parseFloat(formData.get("expenses_amount") as string) || 0
    const adminFeeAmount = getAdminFee()

    const isPaid = status === "pagado"

    const paymentData = {
      agency_id: DEFAULT_AGENCY_ID,
      contract_id: selectedContract,
      due_date: dueDate,
      payment_date: paymentDate || null,
      base_amount: baseAmount,
      expenses_amount: expensesAmount,
      total_amount: baseAmount + expensesAmount,
      amount_paid: Number.parseFloat(formData.get("amount_paid") as string) || 0,
      currency: selectedContractData?.currency || "ARS",
      payment_method: formData.get("payment_method") as string,
      reference_number: formData.get("reference_number") as string,
      status: status,
      notes: formData.get("notes") as string,
      admin_fee_amount: adminFeeAmount,
      admin_fee_paid: isPaid, // Auto-mark admin as paid when payment is complete
    }

    try {
      const { error: insertError } = await supabase.from("payments").insert(paymentData)
      if (insertError) throw insertError
      router.push("/pagos")
      router.refresh()
    } catch (err: unknown) {
      console.error("[v0] Error saving payment:", err)
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setIsLoading(false)
    }
  }

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
                    {selectedContractData.currency === "USD" ? "US$ " : "$ "}
                    {getCurrentRent().toLocaleString("es-AR")}
                  </p>
                </div>
                {selectedContractData.admin_fee_percentage ? (
                  <div>
                    <span className="text-muted-foreground">
                      Administración ({selectedContractData.admin_fee_percentage}%):
                    </span>
                    <p className="font-medium text-emerald-600">
                      {selectedContractData.currency === "USD" ? "US$ " : "$ "}
                      {getAdminFee().toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ) : null}
                <div>
                  <span className="text-muted-foreground">Inquilino:</span>
                  <p className="font-medium">{getTenantName(selectedContractData.tenant_id)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="due_date">Fecha de Vencimiento *</Label>
              <Input id="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">Fecha de Pago</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Monto Base (del contrato)</Label>
              <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 flex items-center font-medium">
                {selectedContractData ? (
                  <>
                    {selectedContractData.currency === "USD" ? "US$ " : "$ "}
                    {getCurrentRent().toLocaleString("es-AR")}
                  </>
                ) : (
                  <span className="text-muted-foreground">Seleccione un contrato</span>
                )}
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
                defaultValue="0"
                placeholder="15000.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_paid">Monto Pagado</Label>
              <Input
                id="amount_paid"
                name="amount_paid"
                type="number"
                step="0.01"
                min="0"
                defaultValue="0"
                placeholder="165000.00"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Estado *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="parcial">Pago Parcial</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              {status === "pagado" && selectedContractData?.admin_fee_percentage && (
                <p className="text-xs text-emerald-600">La administración se marcará como cobrada automáticamente</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Método de Pago</Label>
              <Select name="payment_method" defaultValue="transferencia">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number">Número de Referencia</Label>
            <Input id="reference_number" name="reference_number" placeholder="Número de transferencia, cheque, etc." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Observaciones adicionales..." />
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading || !selectedContract}>
              {isLoading ? "Guardando..." : "Registrar Pago"}
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
