"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Eye, Pencil, Trash2, Search, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/contract-calculations"
import { getMoraStatus, type MoraStatus, type PaymentStatus } from "@/lib/types"

const statusColors: Record<string, string> = {
  pendiente: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20",
  pagado: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
  atrasado: "bg-red-500/10 text-red-600 hover:bg-red-500/20",
  parcial: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
  anulado: "bg-gray-500/10 text-gray-600 hover:bg-gray-500/20",
}

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  atrasado: "Atrasado",
  parcial: "Parcial",
  anulado: "Anulado",
}

const moraColors: Record<MoraStatus, string> = {
  al_dia: "",
  proximo_vencer: "bg-amber-50 dark:bg-amber-950/20",
  en_mora: "bg-red-50 dark:bg-red-950/10",
  mora_grave: "bg-red-100 dark:bg-red-950/30",
}

interface Payment {
  id: string
  contract_id: string
  due_date: string
  payment_date: string | null
  base_amount: number
  total_amount: number
  paid_amount: number
  pending_amount: number
  expenses_amount?: number
  admin_fee_amount?: number
  interest_amount?: number
  late_fee?: number
  currency?: string
  status: string
  payment_method: string | null
  admin_fee_paid?: boolean
  contracts?: {
    contract_number?: string
    currency?: string
    admin_fee_percentage?: number
    monthly_rent?: number
    late_payment_grace_days?: number
    tenants?: { full_name?: string }
  }
}

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    contract: "",
    tenant: "",
    status: "",
    method: "",
  })

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (filters.contract && !p.contracts?.contract_number?.toLowerCase().includes(filters.contract.toLowerCase()))
        return false
      if (filters.tenant && !p.contracts?.tenants?.full_name?.toLowerCase().includes(filters.tenant.toLowerCase()))
        return false
      if (filters.status && p.status !== filters.status) return false
      if (filters.method && p.payment_method !== filters.method) return false
      return true
    })
  }, [payments, filters])

  // Summary metrics grouped by currency
  const summary = useMemo(() => {
    const pending = filteredPayments.filter((p) => p.status !== "pagado" && p.status !== "anulado")
    const overdue = pending.filter((p) => {
      const mora = getMoraStatus(p.due_date, Number(p.pending_amount || 0), Number(p.contracts?.late_payment_grace_days || 0))
      return mora === "en_mora" || mora === "mora_grave"
    })

    // Group totals by currency
    const byCurrency: Record<string, { pending: number; paid: number; overdue: number }> = {}
    const addTo = (currency: string, field: "pending" | "paid" | "overdue", amount: number) => {
      if (!byCurrency[currency]) byCurrency[currency] = { pending: 0, paid: 0, overdue: 0 }
      byCurrency[currency][field] += amount
    }

    for (const p of pending) {
      const cur = p.contracts?.currency || p.currency || "ARS"
      addTo(cur, "pending", Number(p.pending_amount || 0))
    }
    for (const p of filteredPayments.filter((p) => p.status === "pagado" || p.status === "parcial")) {
      const cur = p.contracts?.currency || p.currency || "ARS"
      addTo(cur, "paid", Number(p.paid_amount || 0))
    }
    for (const p of overdue) {
      const cur = p.contracts?.currency || p.currency || "ARS"
      addTo(cur, "overdue", Number(p.pending_amount || 0))
    }

    return {
      byCurrency,
      overdueCount: overdue.length,
    }
  }, [filteredPayments])

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este pago?")) return

    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from("payments").delete().eq("id", id)

    if (error) {
      alert("Error al eliminar: " + error.message)
    } else {
      router.refresh()
    }
    setDeletingId(null)
  }

  if (payments.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No hay cuotas registradas</p>
        <Button asChild className="mt-4">
          <Link href="/pagos/nuevo">Registrar Primera Cuota</Link>
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border">
          <p className="text-xs text-green-600 font-medium">Cobrado</p>
          {Object.entries(summary.byCurrency).map(([cur, vals]) =>
            vals.paid > 0 ? (
              <p key={cur} className="text-lg font-bold text-green-700 leading-tight">{formatCurrency(vals.paid, cur)}</p>
            ) : null
          )}
          {Object.values(summary.byCurrency).every((v) => v.paid === 0) && (
            <p className="text-lg font-bold text-green-700">{formatCurrency(0, "ARS")}</p>
          )}
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 border">
          <p className="text-xs text-yellow-600 font-medium">Pendiente</p>
          {Object.entries(summary.byCurrency).map(([cur, vals]) =>
            vals.pending > 0 ? (
              <p key={cur} className="text-lg font-bold text-yellow-700 leading-tight">{formatCurrency(vals.pending, cur)}</p>
            ) : null
          )}
          {Object.values(summary.byCurrency).every((v) => v.pending === 0) && (
            <p className="text-lg font-bold text-yellow-700">{formatCurrency(0, "ARS")}</p>
          )}
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border">
          <p className="text-xs text-red-600 font-medium">En Mora ({summary.overdueCount})</p>
          {Object.entries(summary.byCurrency).map(([cur, vals]) =>
            vals.overdue > 0 ? (
              <p key={cur} className="text-lg font-bold text-red-700 leading-tight">{formatCurrency(vals.overdue, cur)}</p>
            ) : null
          )}
          {Object.values(summary.byCurrency).every((v) => v.overdue === 0) && (
            <p className="text-lg font-bold text-red-700">{formatCurrency(0, "ARS")}</p>
          )}
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border">
          <p className="text-xs text-blue-600 font-medium">Total cuotas</p>
          <p className="text-lg font-bold text-blue-700">{filteredPayments.length}</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex flex-wrap gap-3 items-center">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por contrato..."
            value={filters.contract}
            onChange={(e) => setFilters({ ...filters, contract: e.target.value })}
            className="w-40 h-8"
          />
          <Input
            placeholder="Filtrar por inquilino..."
            value={filters.tenant}
            onChange={(e) => setFilters({ ...filters, tenant: e.target.value })}
            className="w-40 h-8"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="atrasado">Atrasado</option>
            <option value="parcial">Parcial</option>
            <option value="anulado">Anulado</option>
          </select>
          <select
            value={filters.method}
            onChange={(e) => setFilters({ ...filters, method: e.target.value })}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todos los métodos</option>
            <option value="transferencia">Transferencia</option>
            <option value="efectivo">Efectivo</option>
            <option value="cheque">Cheque</option>
            <option value="deposito">Depósito</option>
          </select>
          {(filters.contract || filters.tenant || filters.status || filters.method) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ contract: "", tenant: "", status: "", method: "" })}
            >
              Limpiar filtros
            </Button>
          )}
          <span className="text-sm text-muted-foreground ml-auto">{filteredPayments.length} cuotas</span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Contrato</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pagado</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => {
                const pendingAmt = Number(payment.pending_amount || 0)
                const graceDays = Number(payment.contracts?.late_payment_grace_days || 0)
                const mora = getMoraStatus(payment.due_date, pendingAmt, graceDays)
                const curr = payment.currency || payment.contracts?.currency || "ARS"

                return (
                  <TableRow key={payment.id} className={`hover:bg-muted/30 ${moraColors[mora]}`}>
                    <TableCell className="font-medium">{payment.contracts?.contract_number || "-"}</TableCell>
                    <TableCell>{payment.contracts?.tenants?.full_name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {new Date(payment.due_date + "T12:00:00").toLocaleDateString("es-AR")}
                        {(mora === "en_mora" || mora === "mora_grave") && (
                          <AlertTriangle className={`h-3.5 w-3.5 ${mora === "mora_grave" ? "text-red-600" : "text-amber-500"}`} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(payment.total_amount), curr)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {Number(payment.paid_amount) > 0 ? formatCurrency(Number(payment.paid_amount), curr) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {pendingAmt > 0 ? (
                        <span className={mora === "mora_grave" ? "text-red-600" : mora === "en_mora" ? "text-amber-600" : ""}>
                          {formatCurrency(pendingAmt, curr)}
                        </span>
                      ) : (
                        <span className="text-green-600">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[payment.status] || ""}>
                        {statusLabels[payment.status] || payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/pagos/${payment.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/pagos/${payment.id}/editar`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(payment.id)}
                          disabled={deletingId === payment.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
