import { Button } from "@/components/ui/button"
import { GuarantorsTable } from "@/components/guarantors-table"
import { createClient } from "@/lib/supabase/server"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function GuarantorsPage() {
  const supabase = await createClient()
  const { data: guarantors } = await supabase.from("guarantors").select("*").order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Garantes / Avales</h1>
          <p className="text-muted-foreground">Administra los garantes de tus contratos</p>
        </div>
        <Button asChild className="bg-primary">
          <Link href="/garantes/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Garante
          </Link>
        </Button>
      </div>

      <GuarantorsTable guarantors={guarantors || []} />
    </div>
  )
}
