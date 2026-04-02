"use client"

import type React from "react"
import type { Property } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useAgency } from "@/hooks/use-agency"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface PropertyFormProps {
  property?: Property
  mode?: "create" | "edit"
}

export function PropertyForm({ property, mode = "create" }: PropertyFormProps) {
  const router = useRouter()
  const { agency } = useAgency()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const propertyData = {
      agency_id: agency?.id,
      code: formData.get("code") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zip_code: formData.get("zip_code") as string,
      property_type: formData.get("property_type") as string,
      bedrooms: formData.get("bedrooms") ? Number.parseInt(formData.get("bedrooms") as string) : 0,
      bathrooms: formData.get("bathrooms") ? Number.parseInt(formData.get("bathrooms") as string) : 0,
      area_m2: formData.get("area_m2") ? Number.parseFloat(formData.get("area_m2") as string) : null,
      description: formData.get("description") as string,
      status: formData.get("status") as string,
      // Números de suministros
      water_account: formData.get("water_account") as string,
      electricity_account: formData.get("electricity_account") as string,
      gas_account: formData.get("gas_account") as string,
      abl_account: formData.get("abl_account") as string,
    }

    try {
      if (mode === "edit" && property) {
        const { error } = await supabase.from("properties").update(propertyData).eq("id", property.id)
        if (error) throw error
        router.push(`/propiedades/${property.id}`)
      } else {
        const { error } = await supabase.from("properties").insert(propertyData)
        if (error) throw error
        router.push("/propiedades")
      }
      router.refresh()
    } catch (err: unknown) {
      console.error("[v0] Error saving property:", err)
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Código de Propiedad</Label>
              <Input id="code" name="code" defaultValue={property?.code} placeholder="PROP-001" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="property_type">Tipo de Propiedad *</Label>
              <Select name="property_type" required defaultValue={property?.property_type || "departamento"}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="departamento">Departamento</SelectItem>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="local">Local Comercial</SelectItem>
                  <SelectItem value="oficina">Oficina</SelectItem>
                  <SelectItem value="cochera">Cochera</SelectItem>
                  <SelectItem value="terreno">Terreno</SelectItem>
                  <SelectItem value="galpon">Galpón</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección *</Label>
            <Input
              id="address"
              name="address"
              required
              defaultValue={property?.address}
              placeholder="Av. Corrientes 1234, Piso 5, Depto B"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" name="city" defaultValue={property?.city} placeholder="Buenos Aires" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Provincia</Label>
              <Input id="state" name="state" defaultValue={property?.state} placeholder="CABA" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code">Código Postal</Label>
              <Input id="zip_code" name="zip_code" defaultValue={property?.zip_code} placeholder="C1043" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Ambientes</Label>
              <Input
                id="bedrooms"
                name="bedrooms"
                type="number"
                min="0"
                defaultValue={property?.bedrooms || 0}
                placeholder="3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">Baños</Label>
              <Input
                id="bathrooms"
                name="bathrooms"
                type="number"
                min="0"
                defaultValue={property?.bathrooms || 0}
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area_m2">Superficie (m²)</Label>
              <Input
                id="area_m2"
                name="area_m2"
                type="number"
                step="0.01"
                min="0"
                defaultValue={property?.area_m2}
                placeholder="65.00"
              />
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Números de Suministros</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="water_account">Nº Suministro de Agua</Label>
                <Input
                  id="water_account"
                  name="water_account"
                  defaultValue={property?.water_account}
                  placeholder="AySA-123456"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="electricity_account">Nº Suministro de Luz</Label>
                <Input
                  id="electricity_account"
                  name="electricity_account"
                  defaultValue={property?.electricity_account}
                  placeholder="EDENOR-789012"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gas_account">Nº Suministro de Gas</Label>
                <Input
                  id="gas_account"
                  name="gas_account"
                  defaultValue={property?.gas_account}
                  placeholder="MetroGas-345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abl_account">Partida ABL</Label>
                <Input
                  id="abl_account"
                  name="abl_account"
                  defaultValue={property?.abl_account}
                  placeholder="ABL-901234"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado *</Label>
            <Select name="status" required defaultValue={property?.status || "disponible"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disponible">Disponible</SelectItem>
                <SelectItem value="arrendado">Arrendado</SelectItem>
                <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={property?.description}
              placeholder="Descripción detallada de la propiedad..."
            />
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : mode === "edit" ? "Actualizar" : "Crear Propiedad"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
