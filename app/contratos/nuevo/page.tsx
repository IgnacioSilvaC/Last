import { ContractForm } from "@/components/contract-form"
import { createClient } from "@/lib/supabase/server"

export default async function NewContractPage() {
  const supabase = await createClient()

  // Added document_number for display in selects
  const [{ data: properties }, { data: tenants }, { data: landlords }, { data: guarantors }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, code, address, property_type, city, state, area_m2, bedrooms, bathrooms, status")
      .eq("status", "disponible"),
    supabase.from("tenants").select("id, full_name, document_number, phone, email"),
    supabase.from("landlords").select("id, full_name, document_number, phone, email, bank_cbu"),
    supabase.from("guarantors").select("id, full_name, document_number, phone, guarantee_type, property_address"),
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
