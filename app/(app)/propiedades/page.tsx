import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { PropertiesTable } from "@/components/properties-table"

export default async function PropertiesPage() {
  const supabase = await createClient()

  const { data: properties } = await supabase.from("properties").select("*").order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Propiedades</h1>
          <p className="text-muted-foreground">Gestiona el inventario de inmuebles</p>
        </div>
        <Button asChild className="bg-primary">
          <Link href="/propiedades/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Propiedad
          </Link>
        </Button>
      </div>

      <PropertiesTable properties={properties || []} />
    </div>
  )
}
