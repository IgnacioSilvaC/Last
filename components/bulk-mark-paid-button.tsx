"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CheckCircle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { getTodayLocalString } from "@/lib/date-utils"

interface BulkMarkPaidButtonProps {
  contractId: string
  contractNumber: string
}

export function BulkMarkPaidButton({ contractId, contractNumber }: BulkMarkPaidButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paidThrough, setPaidThrough] = useState(getTodayLocalString())
  const [outstandingBalance, setOutstandingBalance] = useState<string>("0")

  const handleConfirm = async () => {
    if (!paidThrough) {
      setError("Ingresá la fecha hasta donde está pagado.")
      return
    }

    setIsLoading(true)
    setError(null)
    const supabase = createClient()

    try {
      const balance = Math.max(0, Number(outstandingBalance) || 0)

      const { error: rpcError } = await supabase.rpc("mark_payments_paid_through", {
        p_contract_id:         contractId,
        p_paid_through:        paidThrough,
        p_outstanding_balance: balance,
      })

      if (rpcError) throw rpcError

      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar pagos")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
          Ajustar estado inicial
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar estado de pagos — {contractNumber}</DialogTitle>
          <DialogDescription>
            Usá esto si el contrato ya tenía cuotas pagadas antes de cargarlo al sistema.
            Todas las cuotas con vencimiento hasta la fecha indicada quedarán como <strong>pagado</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="paid_through">Pagado hasta (inclusive) *</Label>
            <Input
              id="paid_through"
              type="date"
              value={paidThrough}
              onChange={(e) => setPaidThrough(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ej: si el inquilino pagó todo hasta marzo 2026, poné <strong>2026-03-31</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outstanding">Deuda pendiente actual (opcional)</Label>
            <Input
              id="outstanding"
              type="number"
              min="0"
              step="0.01"
              value={outstandingBalance}
              onChange={(e) => setOutstandingBalance(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Si el inquilino debe algo parcialmente (ej. debe $50.000 de la cuota de abril), ingresalo acá.
              Se aplicará como saldo pendiente sobre la primera cuota no pagada.
              Dejá en <strong>0</strong> si está completamente al día.
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm text-amber-800 dark:text-amber-200">
            Esta acción es reversible: podés volver a ejecutarla con otra fecha si te equivocás.
            No elimina pagos parciales ya registrados.
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar ajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
