"use client"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus, Home } from "lucide-react"
import Link from "next/link"
import { PaymentsTable } from "@/components/payments-table"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const selectedYear = params.year ? Number.parseInt(params.year) : currentYear
  const selectedMonth = params.month ? Number.parseInt(params.month) : currentMonth

  const { data: payments } = await supabase
    .from("payments")
    .select("*, contracts (contract_number, currency, admin_fee_percentage, monthly_rent, tenants (full_name))")
    .order("due_date", { ascending: false })

  const filteredPayments = (payments || []).filter((p) => {
    if (!p.payment_date) return false
    const payDate = new Date(p.payment_date + "T12:00:00")
    return payDate.getMonth() + 1 === selectedMonth && payDate.getFullYear() === selectedYear
  })

  const paidWithAdmin = filteredPayments.filter((p) => p.admin_fee_paid)

  const adminByTransfer = paidWithAdmin
    .filter((p) => p.payment_method === "transferencia")
    .reduce((sum, p) => sum + Number(p.admin_fee_amount || 0), 0)

  const adminByCash = paidWithAdmin
    .filter((p) => p.payment_method === "efectivo")
    .reduce((sum, p) => sum + Number(p.admin_fee_amount || 0), 0)

  const adminByOther = paidWithAdmin
    .filter((p) => p.payment_method !== "transferencia" && p.payment_method !== "efectivo")
    .reduce((sum, p) => sum + Number(p.admin_fee_amount || 0), 0)

  const adminFeeTotal = adminByTransfer + adminByCash + adminByOther

  const months = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" },
  ]

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Pagos</h1>
            <p className="text-muted-foreground">Registra y controla los pagos de rentas</p>
          </div>
        </div>
        <Button asChild className="bg-primary">
          <Link href="/pagos/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Registrar Pago
          </Link>
        </Button>
      </div>

      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader>
          <CardTitle className="text-emerald-600">Recaudación de Administración</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Mes</label>
              <select
                name="month"
                defaultValue={selectedMonth}
                onChange={(e) => e.target.form?.submit()}
                className="ml-2 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Año</label>
              <select
                name="year"
                defaultValue={selectedYear}
                onChange={(e) => e.target.form?.submit()}
                className="ml-2 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1" />

            <div className="grid grid-cols-3 gap-4 text-right">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">Transferencia</p>
                <p className="text-xl font-bold text-blue-700">$ {adminByTransfer.toLocaleString("es-AR")}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                <p className="text-xs text-green-600 font-medium">Efectivo</p>
                <p className="text-xl font-bold text-green-700">$ {adminByCash.toLocaleString("es-AR")}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border-2 border-emerald-500">
                <p className="text-xs text-emerald-600 font-medium">TOTAL</p>
                <p className="text-2xl font-bold text-emerald-700">$ {adminFeeTotal.toLocaleString("es-AR")}</p>
                <p className="text-xs text-muted-foreground">{paidWithAdmin.length} pagos</p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <PaymentsTable payments={payments || []} />
    </div>
  )
}
