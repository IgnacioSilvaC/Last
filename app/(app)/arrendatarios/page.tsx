import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { TenantsTable } from "@/components/tenants-table"

export default async function TenantsPage() {
  const supabase = await createClient()
  const { data: tenants } = await supabase.from("tenants").select("*").order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Arrendatarios</h1>
          <p className="text-muted-foreground">Gestiona la información de los arrendatarios</p>
        </div>
        <Button asChild className="bg-primary">
          <Link href="/arrendatarios/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Arrendatario
          </Link>
        </Button>
      </div>

      <TenantsTable tenants={tenants || []} />
    </div>
  )
}
