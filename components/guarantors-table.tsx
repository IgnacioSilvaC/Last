"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Eye, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface Guarantor {
  id: string
  full_name: string
  document_type: string | null
  document_number: string | null
  phone: string | null
  email: string | null
  occupation: string | null
  monthly_income: number | null
  guarantee_type: string | null
}

const guaranteeTypeLabels: Record<string, string> = {
  propietario: "Propietario",
  recibo_sueldo: "Recibo de Sueldo",
  seguro_caucion: "Seguro de Caución",
  otro: "Otro",
}

export function GuarantorsTable({ guarantors }: { guarantors: Guarantor[] }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este garante?")) return

    setIsDeleting(id)
    const supabase = createClient()
    const { error } = await supabase.from("guarantors").delete().eq("id", id)

    if (error) {
      alert("Error al eliminar: " + error.message)
    } else {
      router.refresh()
    }
    setIsDeleting(null)
  }

  if (guarantors.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No hay garantes registrados</p>
        <Button asChild className="mt-4">
          <Link href="/garantes/nuevo">Agregar Primer Garante</Link>
        </Button>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre Completo</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Tipo de Garantía</TableHead>
              <TableHead>Ingreso Mensual</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guarantors.map((guarantor) => (
              <TableRow key={guarantor.id}>
                <TableCell className="font-medium">{guarantor.full_name}</TableCell>
                <TableCell>
                  {guarantor.document_type && guarantor.document_number
                    ? `${guarantor.document_type} ${guarantor.document_number}`
                    : "-"}
                </TableCell>
                <TableCell>{guarantor.email || "-"}</TableCell>
                <TableCell>{guarantor.phone || "-"}</TableCell>
                <TableCell>
                  {guarantor.guarantee_type ? (
                    <Badge variant="outline">
                      {guaranteeTypeLabels[guarantor.guarantee_type] || guarantor.guarantee_type}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {guarantor.monthly_income ? `$${Number(guarantor.monthly_income).toLocaleString("es-AR")}` : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/garantes/${guarantor.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/garantes/${guarantor.id}/editar`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(guarantor.id)}
                      disabled={isDeleting === guarantor.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
