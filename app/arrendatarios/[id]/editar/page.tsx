import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { TenantForm } from "@/components/tenant-form"

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tenant } = await supabase.from("tenants").select("*").eq("id", id).single()

  if (!tenant) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Arrendatario</h1>
        <p className="text-muted-foreground">Modifica los datos de {tenant.full_name}</p>
      </div>

      <TenantForm tenant={tenant} mode="edit" />
    </div>
  )
}
