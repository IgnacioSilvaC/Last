"use client"

import { createClient } from "@/lib/supabase/client"
import { useAgency } from "@/hooks/use-agency"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Home } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface PriceIndex {
  id: string
  index_type: string
  year: number
  month: number
  value: number
}

const MONTHS = [
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

export default function IndicesPage() {
  const { agency } = useAgency()
  const [indices, setIndices] = useState<PriceIndex[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for new index
  const [newIndexType, setNewIndexType] = useState("ICL")
  const [newYear, setNewYear] = useState(new Date().getFullYear())
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1)
  const [newValue, setNewValue] = useState("")

  const supabase = createClient()

  const loadIndices = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("price_indices")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(50)

    if (error) {
      console.error("[v0] Error loading indices:", error)
    } else {
      setIndices(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadIndices()
  }, [])

  const handleAddIndex = async () => {
    if (!newValue || Number(newValue) <= 0) {
      setError("Ingrese un valor válido")
      return
    }

    setIsSaving(true)
    setError(null)

    const { error } = await supabase.from("price_indices").upsert(
      {
        agency_id: agency?.id,
        index_type: newIndexType,
        year: newYear,
        month: newMonth,
        value: Number(newValue),
      },
      { onConflict: "agency_id,index_type,year,month" },
    )

    if (error) {
      console.error("[v0] Error saving index:", error)
      setError(error.message)
    } else {
      setNewValue("")
      loadIndices()
    }
    setIsSaving(false)
  }

  const handleDeleteIndex = async (id: string) => {
    const { error } = await supabase.from("price_indices").delete().eq("id", id)
    if (error) {
      console.error("[v0] Error deleting index:", error)
    } else {
      loadIndices()
    }
  }

  const latestICL = indices.find((i) => i.index_type === "ICL")
  const latestIPC = indices.find((i) => i.index_type === "IPC")
  const latestUVA = indices.find((i) => i.index_type === "UVA")

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Índices de Actualización</h1>
          <p className="text-muted-foreground">Gestiona los índices para el cálculo de aumentos de renta</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">ICL - Último Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestICL?.value ? `${Number(latestICL.value).toFixed(2)}%` : "Sin datos"}
            </div>
            {latestICL && (
              <p className="text-xs text-muted-foreground mt-1">
                {MONTHS[latestICL.month - 1]} {latestICL.year}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">IPC - Último Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestIPC?.value ? `${Number(latestIPC.value).toFixed(2)}%` : "Sin datos"}
            </div>
            {latestIPC && (
              <p className="text-xs text-muted-foreground mt-1">
                {MONTHS[latestIPC.month - 1]} {latestIPC.year}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">UVA - Último Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestUVA?.value ? `$${Number(latestUVA.value).toFixed(2)}` : "Sin datos"}
            </div>
            {latestUVA && (
              <p className="text-xs text-muted-foreground mt-1">
                {MONTHS[latestUVA.month - 1]} {latestUVA.year}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add New Index Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Cargar Nuevo Índice
          </CardTitle>
          <CardDescription>Agrega un nuevo valor de índice para el mes seleccionado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5 items-end">
            <div className="space-y-2">
              <Label>Tipo de Índice</Label>
              <Select value={newIndexType} onValueChange={setNewIndexType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ICL">ICL (BCRA)</SelectItem>
                  <SelectItem value="IPC">IPC (INDEC)</SelectItem>
                  <SelectItem value="UVA">UVA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={String(newYear)} onValueChange={(v) => setNewYear(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={String(newMonth)} onValueChange={(v) => setNewMonth(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder={newIndexType === "UVA" ? "1234.56" : "5.25"}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
            <Button onClick={handleAddIndex} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Agregar"}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Indices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Índices</CardTitle>
          <CardDescription>Últimos 50 valores registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Cargando...</p>
          ) : indices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay índices registrados</p>
          ) : (
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
                {indices.map((index) => (
                  <TableRow key={index.id}>
                    <TableCell>
                      <Badge
                        variant={
                          index.index_type === "ICL" ? "default" : index.index_type === "IPC" ? "secondary" : "outline"
                        }
                      >
                        {index.index_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {MONTHS[index.month - 1]} {index.year}
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
                        onClick={() => handleDeleteIndex(index.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
