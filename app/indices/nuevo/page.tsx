"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAgency } from "@/hooks/use-agency"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

const months = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
]

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

export default function NewIndexPage() {
  const router = useRouter()
  const { agency } = useAgency()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [indexType, setIndexType] = useState("ICL")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const indexData = {
      agency_id: agency?.id,
      index_type: indexType,
      year: Number(formData.get("year")),
      month: Number(formData.get("month")),
      value: Number(formData.get("value")),
    }

    try {
      const { error: insertError } = await supabase.from("price_indices").insert(indexData)
      if (insertError) throw insertError
      router.push("/indices")
      router.refresh()
    } catch (err: unknown) {
      console.error("[v0] Error saving index:", err)
      setError(err instanceof Error ? err.message : "Error al guardar el índice")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/indices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Índice</h1>
          <p className="text-muted-foreground">Registra un nuevo valor de índice mensual</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Índice</CardTitle>
          <CardDescription>Ingresa los datos del índice para el período correspondiente</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Tipo de Índice *</Label>
                <Select value={indexType} onValueChange={setIndexType} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ICL">ICL - Índice Contratos Locación</SelectItem>
                    <SelectItem value="IPC">IPC - Índice Precios Consumidor</SelectItem>
                    <SelectItem value="UVA">UVA - Unidad Valor Adquisitivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mes *</Label>
                <Select name="month" required defaultValue={String(new Date().getMonth() + 1)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={String(month.value)}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Año *</Label>
                <Select name="year" required defaultValue={String(currentYear)}>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor del Índice * {indexType === "UVA" ? "(en pesos)" : "(%)"}</Label>
              <Input
                id="value"
                name="value"
                type="number"
                step="0.0001"
                required
                placeholder={indexType === "UVA" ? "1234.56" : "5.50"}
              />
              <p className="text-xs text-muted-foreground">
                {indexType === "UVA" ? "Valor del UVA en pesos argentinos" : "Variación porcentual del período"}
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Índice"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
