"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { useAgency } from "@/hooks/use-agency"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Plus, Loader2 } from "lucide-react"
import { getTodayLocalString } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/contract-calculations"
import type { Payment, BankAccount } from "@/lib/types"

interface PartialPaymentFormProps {
  payment: Payment
  currency?: string
}

export function PartialPaymentForm({ payment, currency = "ARS" }: PartialPaymentFormProps) {
  const router = useRouter()
  const { agency } = useAgency()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState("transferencia")
  const [bankAccountId, setBankAccountId] = useState<string>("")
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])

  const pendingAmount = Number(payment.pending_amount || 0)

  useEffect(() => {
    if (!open) return
    const loadAccounts = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("is_active", true)
        .order("bank_name")
      setBankAccounts(data || [])
    }
    loadAccounts()
  }, [open])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!agency?.id) {
      setError("No se pudo determinar la inmobiliaria.")
      return
    }

    const parsedAmount = Number.parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError("El monto debe ser mayor a 0.")
      return
    }
    if (parsedAmount > pendingAmount) {
      setError(`El monto no puede superar el saldo pendiente (${formatCurrency(pendingAmount, currency)}).`)
      return
    }

    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { error: insertError } = await supabase.from("partial_payments").insert({
        payment_id: payment.id,
        agency_id: agency.id,
        amount: parsedAmount,
        payment_date: formData.get("payment_date") as string,
        payment_method: paymentMethod,
        receipt_number: (formData.get("receipt_number") as string) || null,
        bank_account_id: paymentMethod === "transferencia" && bankAccountId ? bankAccountId : null,
        recorded_by: user.id,
        notes: (formData.get("notes") as string) || null,
      })

      if (insertError) throw insertError

      // El trigger en la BD recalcula automáticamente paid_amount, pending_amount y status
      setOpen(false)
      setAmount("")
      router.refresh()
    } catch (err) {
      console.error("Error registering partial payment:", err)
      setError(err instanceof Error ? err.message : "Error al registrar el pago")
    } finally {
      setIsLoading(false)
    }
  }

  if (pendingAmount <= 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Plus className="h-4 w-4 mr-1" />
          Registrar Pago
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pago Parcial</DialogTitle>
          <DialogDescription>
            Saldo pendiente: <strong>{formatCurrency(pendingAmount, currency)}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pp_amount">Monto a Pagar *</Label>
            <Input
              id="pp_amount"
              type="number"
              step="0.01"
              min="0.01"
              max={pendingAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={pendingAmount.toFixed(2)}
              required
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(pendingAmount.toFixed(2))}
              >
                Pago Total
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount((pendingAmount / 2).toFixed(2))}
              >
                50%
              </Button>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pp_date">Fecha de Pago *</Label>
              <Input
                id="pp_date"
                name="payment_date"
                type="date"
                defaultValue={getTodayLocalString()}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Método *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
          </div>

          {paymentMethod === "transferencia" && (
            <div className="space-y-2">
              <Label>Cuenta destino</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cuenta (opcional)" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bank_name}{acc.alias ? ` — ${acc.alias}` : ""}
                    </SelectItem>
                  ))}
                  {bankAccounts.length === 0 && (
                    <SelectItem value="" disabled>No hay cuentas registradas</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pp_receipt">N° Recibo / Referencia</Label>
            <Input id="pp_receipt" name="receipt_number" placeholder="Ej: TRF-00123" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pp_notes">Notas</Label>
            <Textarea id="pp_notes" name="notes" rows={2} placeholder="Observaciones..." />
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar Pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
