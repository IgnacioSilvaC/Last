"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Eye, Pencil, Trash2, Check, X, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState, useMemo } from "react"

const statusColors: Record<string, string> = {
  pendiente: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20",
  pagado: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
  atrasado: "bg-red-500/10 text-red-600 hover:bg-red-500/20",
  parcial: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
  cancelado: "bg-gray-500/10 text-gray-600 hover:bg-gray-500/20",
}

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  atrasado: "Atrasado",
  parcial: "Parcial",
  cancelado: "Cancelado",
}

interface Payment {
  id: string
  contract_id: string
  due_date: string
  payment_date: string | null
  base_amount: number
  total_amount: number
  amount_paid: number
  currency: string
  status: string
  payment_method: string | null
  admin_fee_paid?: boolean
  admin_fee_amount?: number
  contracts?: {
    contract_number?: string
    currency?: string
    admin_fee_percentage?: number
    monthly_rent?: number
    tenants?: { full_name?: string }
  }
}

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

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

  const handleToggleAdminFee = async (payment: Payment) => {
    setUpdatingId(payment.id)
    const supabase = createClient()

    let adminFeeAmount = payment.admin_fee_amount || 0
    if (!payment.admin_fee_amount && payment.contracts?.admin_fee_percentage && payment.contracts?.monthly_rent) {
      adminFeeAmount = (Number(payment.contracts.monthly_rent) * Number(payment.contracts.admin_fee_percentage)) / 100
    }

    const { error } = await supabase
      .from("payments")
      .update({
        admin_fee_paid: !payment.admin_fee_paid,
        admin_fee_amount: adminFeeAmount,
      })
      .eq("id", payment.id)

    if (error) {
      alert("Error al actualizar: " + error.message)
    } else {
      router.refresh()
    }
    setUpdatingId(null)
  }

  const formatCurrency = (amount: number, currency: string) => {
    return currency === "USD" ? `US$ ${amount.toLocaleString("es-AR")}` : `$ ${amount.toLocaleString("es-AR")}`
  }

  if (payments.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No hay pagos registrados</p>
        <Button asChild className="mt-4">
          <Link href="/pagos/nuevo">Registrar Primer Pago</Link>
        </Button>
      </Card>
    )
  }

  return (
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
        <span className="text-sm text-muted-foreground ml-auto">{filteredPayments.length} pagos</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Contrato</TableHead>
              <TableHead>Inquilino</TableHead>
              <TableHead>Fecha Venc.</TableHead>
              <TableHead>Fecha Pago</TableHead>
              <TableHead>Monto Total</TableHead>
              <TableHead>Pagado</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-center">Admin</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{payment.contracts?.contract_number || "-"}</TableCell>
                <TableCell>{payment.contracts?.tenants?.full_name || "-"}</TableCell>
                <TableCell>{new Date(payment.due_date + "T12:00:00").toLocaleDateString("es-AR")}</TableCell>
                <TableCell>
                  {payment.payment_date
                    ? new Date(payment.payment_date + "T12:00:00").toLocaleDateString("es-AR")
                    : "-"}
                </TableCell>
                <TableCell className="font-bold">
                  {formatCurrency(Number(payment.total_amount), payment.currency)}
                </TableCell>
                <TableCell>{formatCurrency(Number(payment.amount_paid), payment.currency)}</TableCell>
                <TableCell className="capitalize">{payment.payment_method || "-"}</TableCell>
                <TableCell className="text-center">
                  <button
                    onClick={() => handleToggleAdminFee(payment)}
                    disabled={updatingId === payment.id}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {payment.admin_fee_paid ? (
                      <Check className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
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
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
