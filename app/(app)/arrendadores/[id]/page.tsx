import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import Link from "next/link"

export default async function LandlordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: landlord } = await supabase.from("landlords").select("*").eq("id", id).single()

  if (!landlord) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{landlord.full_name}</h1>
          <p className="text-muted-foreground">Información del arrendador</p>
        </div>
        <Button asChild>
          <Link href={`/arrendadores/${landlord.id}/editar`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre Completo</p>
              <p className="font-medium">{landlord.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Identificación</p>
              <p className="font-medium">{landlord.identification}</p>
            </div>
            {landlord.tax_id && (
              <div>
                <p className="text-sm text-muted-foreground">RFC</p>
                <p className="font-medium">{landlord.tax_id}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{landlord.phone}</p>
            </div>
            {landlord.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{landlord.email}</p>
              </div>
            )}
            {landlord.bank_account && (
              <div>
                <p className="text-sm text-muted-foreground">Cuenta Bancaria</p>
                <p className="font-medium">{landlord.bank_account}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
