import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/contract-calculations"
import { formatDateDisplay } from "@/lib/date-utils"
import { getMoraStatus, paymentMethodLabels, type PaymentMethod } from "@/lib/types"
import { PartialPaymentForm } from "@/components/partial-payment-form"

const statusColors: Record<string, string> = {
  pendiente: "bg-yellow-500/10 text-yellow-500",
  pagado: "bg-green-500/10 text-green-500",
  atrasado: "bg-red-500/10 text-red-500",
  parcial: "bg-blue-500/10 text-blue-500",
  anulado: "bg-gray-500/10 text-gray-500",
}

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  atrasado: "Atrasado",
  parcial: "Parcial",
  anulado: "Anulado",
}

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: payment } = await supabase
    .from("payments")
    .select(`
      *,
      contracts (
        contract_number,
        currency,
        late_payment_grace_days,
        late_payment_penalty_percentage,
        tenants (full_name, phone, email),
        properties (code, address)
      )
    `)
    .eq("id", id)
    .single()

  if (!payment) {
    notFound()
  }

  // Fetch partial payments for this payment
  const { data: partialPayments } = await supabase
    .from("partial_payments")
    .select(`
      *,
      recorded_by_profile:profiles!partial_payments_recorded_by_fkey(full_name, email)
    `)
    .eq("payment_id", id)
    .order("payment_date", { ascending: false })

  const currency = payment.contracts?.currency || "ARS"
  const pendingAmount = Number(payment.pending_amount || 0)
  const graceDays = Number(payment.contracts?.late_payment_grace_days || 0)
  const mora = getMoraStatus(payment.due_date, pendingAmount, graceDays)

  const daysOverdue = (() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(payment.due_date + "T12:00:00")
    due.setHours(0, 0, 0, 0)
    return Math.max(0, Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
  })()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detalle de Cuota</h1>
          <p className="text-muted-foreground">
            Contrato {payment.contracts?.contract_number} &mdash; {payment.contracts?.tenants?.full_name}
          </p>
        </div>
        <div className="flex gap-2">
          <PartialPaymentForm payment={payment} currency={currency} />
          <Button asChild variant="outline">
            <Link href={`/pagos/${payment.id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Estado y mora */}
      {(mora === "en_mora" || mora === "mora_grave") && (
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${mora === "mora_grave" ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-amber-500 bg-amber-50 dark:bg-amber-950/20"}`}>
          <AlertTriangle className={`h-5 w-5 ${mora === "mora_grave" ? "text-red-600" : "text-amber-600"}`} />
          <div>
            <p className={`font-medium ${mora === "mora_grave" ? "text-red-700" : "text-amber-700"}`}>
              {mora === "mora_grave" ? "Mora Grave" : "En Mora"} &mdash; {daysOverdue} días de atraso
            </p>
            <p className="text-sm text-muted-foreground">
              Saldo pendiente: {formatCurrency(pendingAmount, currency)}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Resumen financiero */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen Financiero</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Renta base</span>
              <span className="font-medium">{formatCurrency(Number(payment.base_amount), currency)}</span>
            </div>
            {Number(payment.expenses_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expensas</span>
                <span>{formatCurrency(Number(payment.expenses_amount), currency)}</span>
              </div>
            )}
            {Number(payment.admin_fee_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comisión admin.</span>
                <span>{formatCurrency(Number(payment.admin_fee_amount), currency)}</span>
              </div>
            )}
            {Number(payment.interest_amount) > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Intereses acumulados</span>
                <span>{formatCurrency(Number(payment.interest_amount), currency)}</span>
              </div>
            )}
            {Number(payment.late_fee) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Recargo por mora</span>
                <span>{formatCurrency(Number(payment.late_fee), currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(Number(payment.total_amount), currency)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Pagado</span>
              <span>{formatCurrency(Number(payment.paid_amount), currency)}</span>
            </div>
            <div className={`flex justify-between font-bold text-lg ${pendingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
              <span>Saldo pendiente</span>
              <span>{formatCurrency(pendingAmount, currency)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Información general */}
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant="secondary" className={statusColors[payment.status]}>
                {statusLabels[payment.status]}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
              <p className="font-medium">{formatDateDisplay(payment.due_date)}</p>
            </div>
            {payment.payment_date && (
              <div>
                <p className="text-sm text-muted-foreground">Último Pago</p>
                <p className="font-medium">{formatDateDisplay(payment.payment_date)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Propiedad</p>
              <p className="font-medium">{payment.contracts?.properties?.code}</p>
              <p className="text-sm text-muted-foreground">{payment.contracts?.properties?.address}</p>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
              <Link href={`/contratos/${payment.contract_id}`}>Ver Contrato</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Historial de pagos parciales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Historial de Pagos</CardTitle>
            <span className="text-sm text-muted-foreground">
              {partialPayments?.length || 0} pago(s) registrado(s)
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {partialPayments && partialPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Recibo</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partialPayments.map((pp: any) => (
                  <TableRow key={pp.id}>
                    <TableCell>{formatDateDisplay(pp.payment_date)}</TableCell>
                    <TableCell className="font-bold text-green-600">
                      {formatCurrency(Number(pp.amount), currency)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {paymentMethodLabels[pp.payment_method as PaymentMethod] || pp.payment_method}
                    </TableCell>
                    <TableCell>{pp.receipt_number || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {pp.recorded_by_profile?.full_name || pp.recorded_by_profile?.email || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{pp.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No se han registrado pagos para esta cuota.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notas */}
      {payment.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{payment.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
