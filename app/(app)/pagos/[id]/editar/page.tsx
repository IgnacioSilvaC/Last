import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PaymentForm } from "@/components/payment-form"

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: payment }, { data: contracts }] = await Promise.all([
    supabase.from("payments").select("*").eq("id", id).single(),
    supabase
      .from("contracts")
      .select(
        `
        id,
        contract_number,
        monthly_rent,
        tenants (full_name),
        properties (code, address)
      `,
      )
      .eq("status", "activo"),
  ])

  if (!payment) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Pago</h1>
        <p className="text-muted-foreground">Modifica los datos del pago</p>
      </div>

      <PaymentForm payment={payment} mode="edit" contracts={contracts || []} />
    </div>
  )
}
