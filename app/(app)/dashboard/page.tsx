import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Building2, FileText, Users, TrendingUp, AlertCircle, Calendar,
  AlertTriangle, Info, DollarSign, Percent, ArrowUpRight, ArrowDownRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatCurrency, getMonthName } from "@/lib/contract-calculations"
import { getTodayLocalString, formatDateDisplay, parseLocalDate } from "@/lib/date-utils"
import type { CurrencyType } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type ContractWithRelations = {
  id: string
  contract_number: string
  start_date: string
  end_date: string
  monthly_rent: number
  current_rent_amount?: number
  currency: CurrencyType
  status: string
  increase_type?: string | null
  increase_frequency_months?: number | null
  next_increase_date?: string | null
  properties?: { code?: string; address?: string }
  tenants?: { full_name?: string }
}

type PaymentRow = {
  id: string
  due_date: string
  total_amount: number
  paid_amount: number
  pending_amount: number
  status: string
  period_month: number
  period_year: number
  base_amount: number
  interest_amount?: number
  contracts?: {
    contract_number?: string
    currency?: string
    late_payment_grace_days?: number
    tenants?: { full_name?: string }
    properties?: { code?: string; address?: string }
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const todayStr = getTodayLocalString()
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const isFirstDaysOfMonth = today.getDate() <= 5

  const next3Months = new Date(currentYear, currentMonth - 1 + 3, today.getDate())
  const next3MonthsStr = `${next3Months.getFullYear()}-${String(next3Months.getMonth() + 1).padStart(2, "0")}-${String(next3Months.getDate()).padStart(2, "0")}`

  // Fetch all data in parallel
  const [
    { count: propertiesCount },
    { count: rentedPropertiesCount },
    { count: activeContractsCount },
    { count: tenantsCount },
    { data: contractsNearExpiry },
    { data: allActiveContracts },
    { data: recentContracts },
    { data: allPayments },
    { data: alerts },
  ] = await Promise.all([
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("status", "arrendado"),
    supabase.from("contracts").select("*", { count: "exact", head: true }).eq("status", "activo"),
    supabase.from("tenants").select("*", { count: "exact", head: true }),
    supabase
      .from("contracts")
      .select("*, tenants (full_name), properties (code, address)")
      .eq("status", "activo")
      .gte("end_date", todayStr)
      .lte("end_date", next3MonthsStr)
      .order("end_date", { ascending: true })
      .limit(10),
    supabase
      .from("contracts")
      .select("*, tenants (full_name), properties (code)")
      .eq("status", "activo")
      .not("increase_type", "is", null)
      .order("start_date", { ascending: true }),
    supabase
      .from("contracts")
      .select("*, tenants (full_name), properties (code, address)")
      .order("created_at", { ascending: false })
      .limit(5),
    // All payments for metrics calculations
    supabase
      .from("payments")
      .select("*, contracts (contract_number, currency, late_payment_grace_days, tenants (full_name), properties (code, address))")
      .neq("status", "anulado")
      .order("due_date", { ascending: false }),
    // Unread alerts
    supabase
      .from("alerts")
      .select("*")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const payments = (allPayments || []) as PaymentRow[]

  // === MÉTRICAS REALES ===

  // Pagos del mes actual
  const currentMonthPayments = payments.filter(
    (p) => p.period_month === currentMonth && p.period_year === currentYear
  )

  // Pagos del mes anterior
  const prevMonthPayments = payments.filter(
    (p) => p.period_month === prevMonth && p.period_year === prevMonthYear
  )

  // Ingresos cobrados del mes actual (suma de paid_amount)
  const currentMonthIncome = currentMonthPayments.reduce(
    (sum, p) => sum + Number(p.paid_amount || 0), 0
  )

  // Ingresos esperados del mes actual (suma de total_amount)
  const currentMonthExpected = currentMonthPayments.reduce(
    (sum, p) => sum + Number(p.total_amount || 0), 0
  )

  // Ingresos cobrados del mes anterior
  const prevMonthIncome = prevMonthPayments.reduce(
    (sum, p) => sum + Number(p.paid_amount || 0), 0
  )

  // Variación porcentual MoM
  const incomeVariation = prevMonthIncome > 0
    ? Math.round(((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100)
    : 0

  // Tasa de cobranza del mes
  const collectionRate = currentMonthExpected > 0
    ? Math.round((currentMonthIncome / currentMonthExpected) * 100)
    : 0

  // Deuda total pendiente en cartera (todos los pagos con saldo pendiente)
  const totalOutstandingDebt = payments
    .filter((p) => Number(p.pending_amount || 0) > 0)
    .reduce((sum, p) => sum + Number(p.pending_amount || 0), 0)

  // Pagos en mora (vencidos con saldo pendiente)
  const overduePayments = payments.filter((p) => {
    const pending = Number(p.pending_amount || 0)
    if (pending <= 0) return false
    const dueDate = new Date(p.due_date + "T12:00:00")
    dueDate.setHours(0, 0, 0, 0)
    const todayClean = new Date()
    todayClean.setHours(0, 0, 0, 0)
    return dueDate < todayClean
  })

  const overdueCount = overduePayments.length
  const overdueTotal = overduePayments.reduce((sum, p) => sum + Number(p.pending_amount || 0), 0)

  // Pagos parciales del mes
  const partialPayments = currentMonthPayments.filter((p) => p.status === "parcial")

  // Occupancy rate
  const occupancyRate = propertiesCount ? Math.round(((rentedPropertiesCount || 0) / propertiesCount) * 100) : 0
  const currentMonthName = getMonthName(currentMonth)

  // Contracts needing increase this month
  const contractsWithIncreasesThisMonth = (allActiveContracts || []).filter((contract: ContractWithRelations) => {
    if (!contract.increase_type || !contract.start_date || !contract.increase_frequency_months) return false

    if (contract.next_increase_date) {
      const nextIncrease = new Date(contract.next_increase_date + "T12:00:00")
      return nextIncrease.getMonth() + 1 === currentMonth && nextIncrease.getFullYear() === currentYear
    }

    const startDate = parseLocalDate(contract.start_date)
    const frequencyMonths = contract.increase_frequency_months
    const increaseDate = new Date(startDate)
    increaseDate.setMonth(increaseDate.getMonth() + frequencyMonths)

    while (increaseDate <= today || (increaseDate.getMonth() + 1 === currentMonth && increaseDate.getFullYear() === currentYear)) {
      if (increaseDate.getMonth() + 1 === currentMonth && increaseDate.getFullYear() === currentYear) return true
      increaseDate.setMonth(increaseDate.getMonth() + frequencyMonths)
    }
    return false
  })

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de gestión — {currentMonthName} {currentYear}</p>
      </div>

      {isFirstDaysOfMonth && (
        <Alert className="border-amber-500 bg-amber-500/10">
          <Info className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600 font-semibold">Recordatorio de Inicio de Mes</AlertTitle>
          <AlertDescription className="text-amber-600">
            Recuerda actualizar los índices (ICL, IPC, UVA) con los valores actuales del mes.{" "}
            <Link href="/indices" className="underline font-medium hover:text-amber-700">
              Ir a Índices
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Row 1: Financial KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(currentMonthIncome, "ARS")}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {incomeVariation !== 0 && (
                <span className={`flex items-center ${incomeVariation > 0 ? "text-green-600" : "text-red-600"}`}>
                  {incomeVariation > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(incomeVariation)}%
                </span>
              )}
              <span>vs mes anterior ({formatCurrency(prevMonthIncome, "ARS")})</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Cobranza</CardTitle>
            <Percent className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${collectionRate >= 80 ? "text-green-600" : collectionRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
              {collectionRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(currentMonthIncome, "ARS")} cobrado de {formatCurrency(currentMonthExpected, "ARS")} esperado
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda Total Pendiente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(totalOutstandingDebt, "ARS")}
            </div>
            <p className="text-xs text-muted-foreground">
              Saldo insoluto acumulado en cartera
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos en Mora</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">
              Total: {formatCurrency(overdueTotal, "ARS")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Operational KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos Activos</CardTitle>
            <FileText className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{activeContractsCount || 0}</div>
            <p className="text-xs text-muted-foreground">{contractsNearExpiry?.length || 0} por vencer en 3 meses</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propiedades</CardTitle>
            <Building2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{propertiesCount || 0}</div>
            <p className="text-xs text-muted-foreground">{occupancyRate}% de ocupación ({rentedPropertiesCount || 0} arrendadas)</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inquilinos</CardTitle>
            <Users className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">{tenantsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Parciales</CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{partialPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              Cuotas con pago parcial este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pagos Atrasados */}
        <Card className="border-t-4 border-t-red-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Pagos en Mora
                </CardTitle>
                <CardDescription>Cuotas vencidas con saldo pendiente</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/pagos">Ver todos</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {overduePayments.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {overduePayments.slice(0, 8).map((payment) => {
                  const dueDate = parseLocalDate(payment.due_date)
                  const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
                  const isGrave = daysOverdue > 30

                  return (
                    <Link
                      key={payment.id}
                      href={`/pagos/${payment.id}`}
                      className={`flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors ${isGrave ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-amber-300 bg-amber-50 dark:bg-amber-950/10"}`}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{payment.contracts?.tenants?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{payment.contracts?.contract_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">
                          {formatCurrency(Number(payment.pending_amount), payment.contracts?.currency || "ARS")}
                        </p>
                        <Badge variant={isGrave ? "destructive" : "outline"} className={isGrave ? "" : "border-amber-500 text-amber-600"}>
                          {daysOverdue}d atraso
                        </Badge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-green-600 font-medium">Sin mora</p>
                <p className="text-sm text-muted-foreground">No hay pagos atrasados</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contratos por Vencer */}
        <Card className="border-t-4 border-t-orange-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  Contratos por Vencer
                </CardTitle>
                <CardDescription>Próximos 3 meses</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/contratos">Ver todos</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {contractsNearExpiry && contractsNearExpiry.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {contractsNearExpiry.map((contract: ContractWithRelations) => {
                  const endDate = parseLocalDate(contract.end_date)
                  const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  const isUrgent = daysUntilExpiry <= 30

                  return (
                    <Link
                      key={contract.id}
                      href={`/contratos/${contract.id}`}
                      className={`flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors ${isUrgent ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{contract.contract_number}</p>
                          {isUrgent && (
                            <Badge variant="destructive" className="animate-pulse">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              URGENTE
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {contract.properties?.code} — {contract.tenants?.full_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={isUrgent ? "destructive" : "outline"}
                          className={isUrgent ? "" : daysUntilExpiry <= 60 ? "border-amber-500 text-amber-500" : "border-green-500 text-green-500"}
                        >
                          {daysUntilExpiry}d
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{formatDateDisplay(contract.end_date)}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No hay contratos próximos a vencer</p>
            )}
          </CardContent>
        </Card>

        {/* Aumentos Pendientes */}
        <Card className="border-t-4 border-t-amber-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                  Aumentos Pendientes — {currentMonthName}
                </CardTitle>
                <CardDescription>Contratos con aumentos este mes</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/aumentos">Ver todos</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {contractsWithIncreasesThisMonth.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {contractsWithIncreasesThisMonth.slice(0, 10).map((contract: ContractWithRelations) => (
                  <Link
                    key={contract.id}
                    href={`/contratos/${contract.id}`}
                    className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-3 hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{contract.contract_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {contract.properties?.code} — {contract.tenants?.full_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(contract.current_rent_amount || contract.monthly_rent, contract.currency as CurrencyType)}
                      </p>
                      <Badge variant="outline" className="mt-1 border-amber-500 text-amber-600">
                        {contract.increase_type?.toUpperCase()} — {contract.increase_frequency_months}m
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-green-600 font-medium">Todo al día</p>
                <p className="text-sm text-muted-foreground">No hay aumentos pendientes para {currentMonthName}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contratos Recientes */}
        <Card className="border-t-4 border-t-green-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-600">Contratos Recientes</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/contratos/nuevo">+ Nuevo</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentContracts && recentContracts.length > 0 ? (
              <div className="space-y-3">
                {recentContracts.map((contract: ContractWithRelations) => (
                  <Link
                    key={contract.id}
                    href={`/contratos/${contract.id}`}
                    className="flex items-center justify-between border-b pb-3 last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{contract.contract_number}</p>
                      <p className="text-xs text-muted-foreground">{contract.properties?.address}</p>
                    </div>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                      {contract.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No hay contratos recientes</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
