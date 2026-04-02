import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil } from "lucide-react"
import Link from "next/link"

const statusColors = {
  disponible: "bg-green-500/10 text-green-500",
  arrendado: "bg-blue-500/10 text-blue-500",
  mantenimiento: "bg-yellow-500/10 text-yellow-500",
  inactivo: "bg-gray-500/10 text-gray-500",
}

const statusLabels = {
  disponible: "Disponible",
  arrendado: "Arrendado",
  mantenimiento: "Mantenimiento",
  inactivo: "Inactivo",
}

const propertyTypeLabels = {
  casa: "Casa",
  departamento: "Departamento",
  local_comercial: "Local Comercial",
  oficina: "Oficina",
  terreno: "Terreno",
  bodega: "Bodega",
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: property } = await supabase.from("properties").select("*").eq("id", id).single()

  if (!property) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{property.code}</h1>
          <p className="text-muted-foreground">{property.address}</p>
        </div>
        <Button asChild>
          <Link href={`/propiedades/${property.id}/editar`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Propiedad</p>
              <p className="font-medium">{propertyTypeLabels[property.property_type]}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant="secondary" className={statusColors[property.status]}>
                {statusLabels[property.status]}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Renta Mensual</p>
              <p className="text-2xl font-bold">${Number(property.monthly_rent).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ubicación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Dirección</p>
              <p className="font-medium">{property.address}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Ciudad</p>
                <p className="font-medium">{property.city}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-medium">{property.state}</p>
              </div>
            </div>
            {property.postal_code && (
              <div>
                <p className="text-sm text-muted-foreground">Código Postal</p>
                <p className="font-medium">{property.postal_code}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Características</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {property.bedrooms !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Recámaras</p>
                <p className="font-medium">{property.bedrooms}</p>
              </div>
            )}
            {property.bathrooms !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Baños</p>
                <p className="font-medium">{property.bathrooms}</p>
              </div>
            )}
            {property.area_m2 !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Área</p>
                <p className="font-medium">{property.area_m2} m²</p>
              </div>
            )}
          </CardContent>
        </Card>

        {property.description && (
          <Card>
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{property.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
