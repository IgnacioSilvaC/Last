import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Building, DollarSign, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/contract-calculations"
import { CommissionsFilters } from "@/components/commissions-filters"

interface SearchParams {
  month?: string
  year?: string
}

export default async function ComisionesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const today = new Date()
  const selectedMonth = Number(params.month || today.getMonth() + 1)
  const selectedYear  = Number(params.year  || today.getFullYear())

  // All partial payments for the selected month, joined with payment + contract + bank_account
  const { data: partialPayments } = await supabase
    .from("partial_payments")
    .select(`
      id,
      amount,
      payment_date,
      payment_method,
      bank_account_id,
      bank_accounts (id, bank_name, alias, currency),
      payments (
        id,
        base_amount,
        admin_fee_amount,
        total_amount,
        period_month,
        period_year,
        contracts (
          contract_number,
          admin_fee_percentage,
          currency,
          tenants (full_name)
        )
      )
    `)
    .gte("payment_date", `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`)
    .lte("payment_date", `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-31`)
    .order("payment_date", { ascending: false })

  // Bank accounts for filter
  const { data: bankAccounts } = await supabase
    .from("bank_accounts")
    .select("id, bank_name, alias, currency")
    .eq("is_active", true)
    .order("bank_name")

  // Aggregate by bank account
  const byAccount: Record<string, {
    account: { id: string; bank_name: string; alias?: string; currency: string } | null
    totalReceived: number
    totalAdminFee: number
    count: number
  }> = {}

  for (const pp of partialPayments || []) {
    const payment = pp.payments as any

    // Proportional admin fee for this partial payment
    const proportion = payment?.total_amount > 0
      ? Number(pp.amount) / Number(payment.total_amount)
      : 0
    const partialAdminFee = Math.round(Number(payment?.admin_fee_amount || 0) * proportion * 100) / 100

    const key = pp.bank_account_id || "__sin_cuenta__"
    if (!byAccount[key]) {
      byAccount[key] = {
        account: pp.bank_accounts as any || null,
        totalReceived: 0,
        totalAdminFee: 0,
        count: 0,
      }
    }
    byAccount[key].totalReceived  += Number(pp.amount)
    byAccount[key].totalAdminFee  += partialAdminFee
    byAccount[key].count          += 1
  }

  const totalReceivedAll = Object.values(byAccount).reduce((s, v) => s + v.totalReceived, 0)
  const totalAdminFeeAll = Object.values(byAccount).reduce((s, v) => s + v.totalAdminFee, 0)

  const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString("es-AR", {
    month: "long", year: "numeric",
  })

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Comisiones</h1>
          <p className="text-muted-foreground capitalize">
            Ingresos de administración — <span className="font-medium">{monthName}</span>
          </p>
        </div>
        <CommissionsFilters
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(totalReceivedAll, "ARS")}
            </div>
            <p className="text-xs text-muted-foreground">{(partialPayments || []).length} transacciones</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comisiones Admin</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(totalAdminFeeAll, "ARS")}
            </div>
            <p className="text-xs text-muted-foreground">Porción de administración del total cobrado</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuentas activas</CardTitle>
            <Building className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {Object.keys(byAccount).filter((k) => k !== "__sin_cuenta__").length}
            </div>
            <p className="text-xs text-muted-foreground">Con movimientos este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* By account */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen por Cuenta Bancaria</CardTitle>
          <CardDescription>Cuánto ingresó a cada cuenta en {monthName}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                <TableHead className="text-right">Transacciones</TableHead>
                <TableHead className="text-right">Total Recibido</TableHead>
                <TableHead className="text-right">Comisión Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(byAccount).map(([key, data]) => (
                <TableRow key={key}>
                  <TableCell>
                    {data.account ? (
                      <div>
                        <p className="font-medium">{data.account.bank_name}</p>
                        {data.account.alias && (
                          <p className="text-xs text-muted-foreground">{data.account.alias}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Sin cuenta asignada</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{data.count}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(data.totalReceived, "ARS")}
                  </TableCell>
                  <TableCell className="text-right text-blue-600 font-medium">
                    {formatCurrency(data.totalAdminFee, "ARS")}
                  </TableCell>
                </TableRow>
              ))}
              {Object.keys(byAccount).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No hay pagos registrados en {monthName}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Pagos</CardTitle>
          <CardDescription>Cada pago recibido en {monthName}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Comisión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(partialPayments || []).map((pp) => {
                const payment  = pp.payments  as any
                const contract = payment?.contracts as any
                const adminFeeAmount = Number(payment?.admin_fee_amount || 0)
                const proportion = payment?.total_amount > 0
                  ? Number(pp.amount) / Number(payment.total_amount)
                  : 0
                const partialAdminFee = Math.round(adminFeeAmount * proportion * 100) / 100
                const currency = contract?.currency || "ARS"

                return (
                  <TableRow key={pp.id}>
                    <TableCell className="text-sm">
                      {new Date(pp.payment_date + "T12:00:00").toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell className="font-medium">{contract?.contract_number || "-"}</TableCell>
                    <TableCell>{contract?.tenants?.full_name || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment?.period_month}/{payment?.period_year}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{pp.payment_method}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {(pp.bank_accounts as any)?.bank_name || (
                        <span className="text-muted-foreground italic">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(pp.amount), currency)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {partialAdminFee > 0 ? formatCurrency(partialAdminFee, currency) : "-"}
                    </TableCell>
                  </TableRow>
                )
              })}
              {(partialPayments || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay pagos registrados en este período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
