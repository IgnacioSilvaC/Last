import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { LandlordForm } from "@/components/landlord-form"

export default async function EditLandlordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: landlord } = await supabase.from("landlords").select("*").eq("id", id).single()

  if (!landlord) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Arrendador</h1>
        <p className="text-muted-foreground">Modifica los datos de {landlord.full_name}</p>
      </div>

      <LandlordForm landlord={landlord} mode="edit" />
    </div>
  )
}
