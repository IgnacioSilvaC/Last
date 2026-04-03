import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { PaymentsTable } from "@/components/payments-table"
import { redirect } from "next/navigation"

export default async function PaymentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("*, contracts (contract_number, currency, admin_fee_percentage, monthly_rent, late_payment_grace_days, tenants (full_name))")
    .order("due_date", { ascending: false })

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Cuotas y Pagos</h1>
          <p className="text-muted-foreground">Gestiona cuotas, registra pagos parciales y controla la mora</p>
        </div>
        <Button asChild className="bg-primary">
          <Link href="/pagos/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cuota
          </Link>
        </Button>
      </div>

      <PaymentsTable payments={payments || []} />
    </div>
  )
}
