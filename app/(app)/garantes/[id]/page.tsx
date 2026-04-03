import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { Building2, Mail, MapPin, Pencil, Phone, Briefcase, DollarSign } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

type GuaranteedContract = {
  id: string
  status: string
  properties?: { code?: string; address?: string }
  tenants?: { full_name?: string }
}

export default async function GuarantorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: guarantor } = await supabase
    .from("guarantors")
    .select("*, profiles:created_by(full_name)")
    .eq("id", id)
    .single()

  if (!guarantor) {
    notFound()
  }

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*, properties(code, address), tenants(full_name)")
    .eq("guarantor_id", id)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{guarantor.full_name}</h1>
          <p className="text-muted-foreground">Información del garante</p>
        </div>
        <Button asChild>
          <Link href={`/garantes/${guarantor.id}/editar`}>
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
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Identificación</p>
                <p className="text-sm text-muted-foreground">{guarantor.identification}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Teléfono</p>
                <p className="text-sm text-muted-foreground">{guarantor.phone}</p>
              </div>
            </div>

            {guarantor.email && (
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{guarantor.email}</p>
                </div>
              </div>
            )}

            {guarantor.address && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Dirección</p>
                  <p className="text-sm text-muted-foreground">{guarantor.address}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información Financiera</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {guarantor.occupation && (
              <div className="flex items-start gap-3">
                <Briefcase className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Ocupación</p>
                  <p className="text-sm text-muted-foreground">{guarantor.occupation}</p>
                </div>
              </div>
            )}

            {guarantor.monthly_income && (
              <div className="flex items-start gap-3">
                <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Ingreso Mensual</p>
                  <p className="text-sm text-muted-foreground">${guarantor.monthly_income.toLocaleString()}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Registrado por</p>
                <p className="text-sm text-muted-foreground">{guarantor.profiles?.full_name || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contratos Garantizados</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts && contracts.length > 0 ? (
            <div className="space-y-2">
              {contracts.map((contract: GuaranteedContract) => (
                <Link
                  key={contract.id}
                  href={`/contratos/${contract.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="font-medium">{contract.properties?.code}</p>
                    <p className="text-sm text-muted-foreground">{contract.properties?.address}</p>
                    <p className="text-sm text-muted-foreground">Arrendatario: {contract.tenants?.full_name}</p>
                  </div>
                  <Badge variant={contract.status === "activo" ? "default" : "secondary"}>{contract.status}</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No hay contratos garantizados</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
