import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PropertyForm } from "@/components/property-form"

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: property } = await supabase.from("properties").select("*").eq("id", id).single()

  if (!property) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Propiedad</h1>
        <p className="text-muted-foreground">Modifica los datos de la propiedad {property.code}</p>
      </div>

      <PropertyForm property={property} mode="edit" />
    </div>
  )
}
