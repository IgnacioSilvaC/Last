"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Eye, Pencil, Trash2, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState, useMemo } from "react"

const statusColors: Record<string, string> = {
  disponible: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  arrendado: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  mantenimiento: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
  inactivo: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
}

const statusLabels: Record<string, string> = {
  disponible: "Disponible",
  arrendado: "Arrendado",
  mantenimiento: "Mantenimiento",
  inactivo: "Inactivo",
}

const propertyTypeLabels: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  local: "Local Comercial",
  oficina: "Oficina",
  cochera: "Cochera",
  terreno: "Terreno",
  galpon: "Galpón",
  otro: "Otro",
}

interface Property {
  id: string
  code: string | null
  address: string
  city: string | null
  state: string | null
  property_type: string
  status: string
  bedrooms: number
  bathrooms: number
  area_m2: number | null
}

export function PropertiesTable({ properties }: { properties: Property[] }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    code: "",
    address: "",
    type: "",
    status: "",
  })

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (filters.code && !p.code?.toLowerCase().includes(filters.code.toLowerCase())) return false
      if (filters.address && !p.address?.toLowerCase().includes(filters.address.toLowerCase())) return false
      if (filters.type && p.property_type !== filters.type) return false
      if (filters.status && p.status !== filters.status) return false
      return true
    })
  }, [properties, filters])

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta propiedad?")) return

    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from("properties").delete().eq("id", id)

    if (error) {
      alert("Error al eliminar: " + error.message)
    } else {
      router.refresh()
    }
    setDeletingId(null)
  }

  if (properties.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No hay propiedades registradas</p>
        <Button asChild className="mt-4">
          <Link href="/propiedades/nueva">Agregar Primera Propiedad</Link>
        </Button>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b bg-muted/30 flex flex-wrap gap-3 items-center">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar por código..."
          value={filters.code}
          onChange={(e) => setFilters({ ...filters, code: e.target.value })}
          className="w-32 h-8"
        />
        <Input
          placeholder="Filtrar por dirección..."
          value={filters.address}
          onChange={(e) => setFilters({ ...filters, address: e.target.value })}
          className="w-40 h-8"
        />
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          <option value="departamento">Departamento</option>
          <option value="casa">Casa</option>
          <option value="local">Local Comercial</option>
          <option value="oficina">Oficina</option>
          <option value="cochera">Cochera</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="disponible">Disponible</option>
          <option value="arrendado">Arrendado</option>
          <option value="mantenimiento">Mantenimiento</option>
          <option value="inactivo">Inactivo</option>
        </select>
        {(filters.code || filters.address || filters.type || filters.status) && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ code: "", address: "", type: "", status: "" })}>
            Limpiar
          </Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">{filteredProperties.length} propiedades</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Código</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ambientes</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProperties.map((property) => (
              <TableRow key={property.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{property.code || "-"}</TableCell>
                <TableCell>
                  <div className="max-w-xs">
                    <p className="truncate font-medium">{property.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {[property.city, property.state].filter(Boolean).join(", ") || "-"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{propertyTypeLabels[property.property_type] || property.property_type}</TableCell>
                <TableCell>
                  {property.bedrooms} amb. / {property.bathrooms} baños
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[property.status] || ""}>
                    {statusLabels[property.status] || property.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/propiedades/${property.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/propiedades/${property.id}/editar`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(property.id)}
                      disabled={deletingId === property.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
