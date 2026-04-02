import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil } from "lucide-react"
import Link from "next/link"

const statusColors = {
  pendiente: "bg-yellow-500/10 text-yellow-500",
  pagado: "bg-green-500/10 text-green-500",
  atrasado: "bg-red-500/10 text-red-500",
  parcial: "bg-blue-500/10 text-blue-500",
}

const statusLabels = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  atrasado: "Atrasado",
  parcial: "Parcial",
}

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: payment } = await supabase
    .from("payments")
    .select(
      `
      *,
      contracts (
        contract_number,
        tenants (full_name, phone, email),
        properties (code, address)
      )
    `,
    )
    .eq("id", id)
    .single()

  if (!payment) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detalles del Pago</h1>
          <p className="text-muted-foreground">Información completa del registro de pago</p>
        </div>
        <Button asChild>
          <Link href={`/pagos/${payment.id}/editar`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información del Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Monto</p>
              <p className="text-3xl font-bold">${Number(payment.amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant="secondary" className={statusColors[payment.status]}>
                {statusLabels[payment.status]}
              </Badge>
            </div>
            {payment.payment_method && (
              <div>
                <p className="text-sm text-muted-foreground">Método de Pago</p>
                <p className="font-medium">{payment.payment_method}</p>
              </div>
            )}
            {payment.reference_number && (
              <div>
                <p className="text-sm text-muted-foreground">Número de Referencia</p>
                <p className="font-medium">{payment.reference_number}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fechas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
              <p className="font-medium">{new Date(payment.due_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Pago</p>
              <p className="font-medium">{new Date(payment.payment_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Registrado</p>
              <p className="font-medium">{new Date(payment.created_at).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Número de Contrato</p>
              <p className="font-medium">{payment.contracts.contract_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Propiedad</p>
              <p className="font-medium">{payment.contracts.properties.code}</p>
              <p className="text-sm text-muted-foreground">{payment.contracts.properties.address}</p>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
              <Link href={`/contratos/${payment.contract_id}`}>Ver Contrato</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Arrendatario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{payment.contracts.tenants.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{payment.contracts.tenants.phone}</p>
            </div>
            {payment.contracts.tenants.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{payment.contracts.tenants.email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {payment.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{payment.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
