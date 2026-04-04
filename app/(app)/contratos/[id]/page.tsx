import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil } from "lucide-react"
import Link from "next/link"
import { BulkMarkPaidButton } from "@/components/bulk-mark-paid-button"

const statusColors: Record<string, string> = {
  activo: "bg-green-500/10 text-green-500",
  borrador: "bg-gray-500/10 text-gray-500",
  finalizado: "bg-blue-500/10 text-blue-500",
  cancelado: "bg-red-500/10 text-red-500",
  renovado: "bg-purple-500/10 text-purple-500",
}

const statusLabels: Record<string, string> = {
  activo: "Activo",
  borrador: "Borrador",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  renovado: "Renovado",
}

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: contract } = await supabase
    .from("contracts")
    .select(
      `
      *,
      properties (*),
      tenants (*),
      landlords (*)
    `,
    )
    .eq("id", id)
    .single()

  if (!contract) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{contract.contract_number}</h1>
          <p className="text-muted-foreground">Detalle del contrato de alquiler</p>
        </div>
        <div className="flex gap-2">
          <BulkMarkPaidButton
            contractId={contract.id}
            contractNumber={contract.contract_number}
          />
          <Button asChild>
            <Link href={`/contratos/${contract.id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">No. Contrato</p>
              <p className="font-medium">{contract.contract_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant="secondary" className={statusColors[contract.status]}>
                {statusLabels[contract.status]}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Alquiler mensual</p>
              <p className="text-2xl font-bold">${Number(contract.monthly_rent).toFixed(2)}</p>
            </div>
            {contract.security_deposit && (
              <div>
                <p className="text-sm text-muted-foreground">Depósito</p>
                <p className="font-medium">${Number(contract.security_deposit).toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Día de Pago</p>
              <p className="font-medium">Día {contract.payment_day} de cada mes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Propiedad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Código</p>
              <p className="font-medium">{contract.properties.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dirección</p>
              <p className="font-medium">{contract.properties.address}</p>
            </div>
            {contract.properties.city && (
              <div>
                <p className="text-sm text-muted-foreground">Ciudad</p>
                <p className="font-medium">{contract.properties.city}</p>
              </div>
            )}
            <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
              <Link href={`/propiedades/${contract.properties.id}`}>Ver Propiedad</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vigencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
              <p className="font-medium">{new Date(contract.start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de finalización</p>
              <p className="font-medium">{new Date(contract.end_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duración</p>
              <p className="font-medium">
                {Math.ceil(
                  (new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) /
                    (1000 * 60 * 60 * 24 * 30),
                )}{" "}
                meses
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inquilino</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{contract.tenants.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{contract.tenants.phone}</p>
            </div>
            {contract.tenants.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{contract.tenants.email}</p>
              </div>
            )}
            <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
              <Link href={`/arrendatarios/${contract.tenants.id}`}>Ver inquilino</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Propietario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{contract.landlords.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{contract.landlords.phone}</p>
            </div>
            {contract.landlords.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{contract.landlords.email}</p>
              </div>
            )}
            <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
              <Link href={`/arrendadores/${contract.landlords.id}`}>Ver propietario</Link>
            </Button>
          </CardContent>
        </Card>

        {contract.notes && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{contract.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
