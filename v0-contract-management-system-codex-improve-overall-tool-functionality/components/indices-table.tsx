"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

interface PriceIndex {
  id: string
  index_type: string
  year: number
  month: number
  value: number
}

interface IndicesTableProps {
  indices: PriceIndex[]
}

export function IndicesTable({ indices }: IndicesTableProps) {
  const router = useRouter()
  const supabase = createClient()
  const [filterType, setFilterType] = useState<string>("all")
  const [filterYear, setFilterYear] = useState<string>("all")

  const years = [...new Set(indices.map((i) => i.year))].sort((a, b) => b - a)

  const filteredIndices = indices.filter((index) => {
    if (filterType !== "all" && index.index_type !== filterType) return false
    if (filterYear !== "all" && index.year !== Number(filterYear)) return false
    return true
  })

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este índice?")) return
    await supabase.from("price_indices").delete().eq("id", id)
    router.refresh()
  }

  const typeColors: Record<string, string> = {
    ICL: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    IPC: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    UVA: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="ICL">ICL</SelectItem>
            <SelectItem value="IPC">IPC</SelectItem>
            <SelectItem value="UVA">UVA</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los años</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIndices.length > 0 ? (
              filteredIndices.map((index) => (
                <TableRow key={index.id}>
                  <TableCell>
                    <Badge variant="secondary" className={typeColors[index.index_type] || ""}>
                      {index.index_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {months[index.month - 1]} {index.year}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {index.index_type === "UVA"
                      ? `$${Number(index.value).toFixed(2)}`
                      : `${Number(index.value).toFixed(2)}%`}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(index.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No hay índices registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
