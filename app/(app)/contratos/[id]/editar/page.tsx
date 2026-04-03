import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ContractForm } from "@/components/contract-form"

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: contract }, { data: properties }, { data: tenants }, { data: landlords }, { data: guarantors }] =
    await Promise.all([
      supabase.from("contracts").select("*").eq("id", id).single(),
      supabase.from("properties").select("*"),
      supabase.from("tenants").select("*"),
      supabase.from("landlords").select("*"),
      supabase.from("guarantors").select("*"),
    ])

  if (!contract) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Contrato</h1>
        <p className="text-muted-foreground">Modifica los datos del contrato {contract.contract_number}</p>
      </div>

      <ContractForm
        contract={contract}
        mode="edit"
        properties={properties || []}
        tenants={tenants || []}
        landlords={landlords || []}
        guarantors={guarantors || []}
      />
    </div>
  )
}
