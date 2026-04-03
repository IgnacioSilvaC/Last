import { ContractForm } from "@/components/contract-form"
import { createClient } from "@/lib/supabase/server"

export default async function NewContractPage() {
  const supabase = await createClient()

  const [{ data: properties }, { data: tenants }, { data: landlords }, { data: guarantors }] = await Promise.all([
    supabase.from("properties").select("*").eq("status", "disponible"),
    supabase.from("tenants").select("*"),
    supabase.from("landlords").select("*"),
    supabase.from("guarantors").select("*"),
  ])

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Contrato</h1>
        <p className="text-muted-foreground">Registra un nuevo contrato de arrendamiento</p>
      </div>

      <ContractForm
        properties={properties || []}
        tenants={tenants || []}
        landlords={landlords || []}
        guarantors={guarantors || []}
      />
    </div>
  )
}
