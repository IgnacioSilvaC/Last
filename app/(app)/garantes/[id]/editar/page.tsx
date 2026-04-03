import { GuarantorForm } from "@/components/guarantor-form"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

export default async function EditGuarantorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: guarantor } = await supabase.from("guarantors").select("*").eq("id", id).single()

  if (!guarantor) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Garante</h1>
        <p className="text-muted-foreground">Modifica los datos de {guarantor.full_name}</p>
      </div>

      <GuarantorForm guarantor={guarantor} mode="edit" />
    </div>
  )
}
