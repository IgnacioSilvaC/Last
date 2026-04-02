"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Eye, Pencil, Trash2, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState, useMemo } from "react"

interface Landlord {
  id: string
  full_name: string
  document_type: string | null
  document_number: string | null
  phone: string | null
  email: string | null
}

export function LandlordsTable({ landlords }: { landlords: Landlord[] }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    name: "",
    document: "",
    email: "",
  })

  const filteredLandlords = useMemo(() => {
    return landlords.filter((l) => {
      if (filters.name && !l.full_name?.toLowerCase().includes(filters.name.toLowerCase())) return false
      if (filters.document && !l.document_number?.toLowerCase().includes(filters.document.toLowerCase())) return false
      if (filters.email && !l.email?.toLowerCase().includes(filters.email.toLowerCase())) return false
      return true
    })
  }, [landlords, filters])

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este propietario?")) return

    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from("landlords").delete().eq("id", id)

    if (error) {
      alert("Error al eliminar: " + error.message)
    } else {
      router.refresh()
    }
    setDeletingId(null)
  }

  if (landlords.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No hay propietarios registrados</p>
        <Button asChild className="mt-4">
          <Link href="/arrendadores/nuevo">Agregar Primer Propietario</Link>
        </Button>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b bg-muted/30 flex flex-wrap gap-3 items-center">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar por nombre..."
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          className="w-40 h-8"
        />
        <Input
          placeholder="Filtrar por documento..."
          value={filters.document}
          onChange={(e) => setFilters({ ...filters, document: e.target.value })}
          className="w-40 h-8"
        />
        <Input
          placeholder="Filtrar por email..."
          value={filters.email}
          onChange={(e) => setFilters({ ...filters, email: e.target.value })}
          className="w-40 h-8"
        />
        {(filters.name || filters.document || filters.email) && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ name: "", document: "", email: "" })}>
            Limpiar
          </Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">{filteredLandlords.length} propietarios</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nombre</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLandlords.map((landlord) => (
              <TableRow key={landlord.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{landlord.full_name}</TableCell>
                <TableCell>
                  {landlord.document_type && landlord.document_number
                    ? `${landlord.document_type} ${landlord.document_number}`
                    : "-"}
                </TableCell>
                <TableCell>{landlord.phone || "-"}</TableCell>
                <TableCell>{landlord.email || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/arrendadores/${landlord.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/arrendadores/${landlord.id}/editar`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(landlord.id)}
                      disabled={deletingId === landlord.id}
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
