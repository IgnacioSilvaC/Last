import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus, Home } from "lucide-react"
import Link from "next/link"
import { LandlordsTable } from "@/components/landlords-table"

export default async function LandlordsPage() {
  const supabase = await createClient()
  const { data: landlords } = await supabase.from("landlords").select("*").order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Arrendadores</h1>
            <p className="text-muted-foreground">Gestiona la información de los propietarios</p>
          </div>
        </div>
        <Button asChild className="bg-primary">
          <Link href="/arrendadores/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Arrendador
          </Link>
        </Button>
      </div>

      <LandlordsTable landlords={landlords || []} />
    </div>
  )
}
