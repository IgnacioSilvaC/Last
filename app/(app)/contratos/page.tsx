import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { ContractsTable } from "@/components/contracts-table"
import { redirect } from "next/navigation"

export default async function ContractsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const canCreate = profile && (profile.role === "admin" || profile.role === "agente")

  const { data: contracts } = await supabase
    .from("contracts")
    .select(
      `
      *,
      properties (code, address),
      tenants (full_name),
      landlords (full_name)
    `,
    )
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Contratos</h1>
          <p className="text-muted-foreground">Gestiona los contratos de arrendamiento</p>
        </div>
        {canCreate && (
          <Button asChild className="bg-primary">
            <Link href="/contratos/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Contrato
            </Link>
          </Button>
        )}
      </div>

      <ContractsTable contracts={contracts || []} />
    </div>
  )
}
