"use client"

import { Button } from "@/components/ui/button"
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
import { useState } from "react"
import { CheckCircle, Loader2 } from "lucide-react"
import { getMonthName, formatCurrency } from "@/lib/contract-calculations"

interface ApplyIncreaseButtonProps {
  contractId: string
  previousRent: number
  newRent: number
  percentage: number
  increaseType: string
  increaseDate: string
  currency?: string
  indexValues: { month: number; year: number; value: number }[]
}

export function ApplyIncreaseButton({
  contractId,
  previousRent,
  newRent,
  percentage,
  increaseType,
  increaseDate,
  currency = "ARS",
  indexValues,
}: ApplyIncreaseButtonProps) {
  const router = useRouter()
  const { agency } = useAgency()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    if (!agency?.id) {
      setError("No se pudo determinar la inmobiliaria.")
      return
    }

    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      // 1. Registrar el aumento en el historial
      const { error: increaseError } = await supabase.from("contract_rent_history").insert({
        agency_id: agency.id,
        contract_id: contractId,
        effective_date: increaseDate,
        previous_rent: previousRent,
        new_rent: newRent,
        increase_percentage: percentage,
        increase_type: increaseType,
        index_value_used: indexValues.length > 0 ? indexValues.reduce((sum, v) => sum + v.value, 0) : null,
        is_applied: true,
        applied_at: new Date().toISOString(),
      })

      if (increaseError) throw increaseError

      // 2. Actualizar el contrato con el nuevo monto y próxima fecha de aumento
      const { data: contract } = await supabase
        .from("contracts")
        .select("increase_frequency_months")
        .eq("id", contractId)
        .single()

      const frequencyMonths = contract?.increase_frequency_months || 12
      const currentIncreaseDate = new Date(increaseDate + "T12:00:00")
      const nextIncreaseDate = new Date(currentIncreaseDate)
      nextIncreaseDate.setMonth(nextIncreaseDate.getMonth() + frequencyMonths)

      const nextDateStr = `${nextIncreaseDate.getFullYear()}-${String(nextIncreaseDate.getMonth() + 1).padStart(2, "0")}-${String(nextIncreaseDate.getDate()).padStart(2, "0")}`

      const { error: updateError } = await supabase
        .from("contracts")
        .update({
          current_rent_amount: newRent,
          next_increase_date: nextDateStr,
        })
        .eq("id", contractId)

      if (updateError) throw updateError

      setOpen(false)
      router.refresh()
    } catch (err) {
      console.error("Error applying increase:", err)
      setError(err instanceof Error ? err.message : "Error al aplicar el aumento")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CheckCircle className="h-4 w-4 mr-1" />
          Aplicar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Aumento de Alquiler</DialogTitle>
          <DialogDescription>Esta acción registrará el aumento y actualizará el monto del contrato.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Monto Anterior</p>
              <p className="text-lg font-medium">{formatCurrency(previousRent, currency)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Nuevo Monto</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(newRent, currency)}</p>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tipo de aumento:</span>
              <span className="font-medium">{increaseType.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Porcentaje aplicado:</span>
              <span className="font-medium text-green-600">+{percentage.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Fecha efectiva:</span>
              <span className="font-medium">{new Date(increaseDate + "T12:00:00").toLocaleDateString("es-AR")}</span>
            </div>
          </div>

          {indexValues.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium mb-2">Índices utilizados:</p>
              <div className="space-y-1">
                {indexValues.map((idx, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {getMonthName(idx.month)} {idx.year}
                    </span>
                    <span>{idx.value}%</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-medium border-t pt-1 mt-1">
                  <span>Total</span>
                  <span>{percentage.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Aumento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
