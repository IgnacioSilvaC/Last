"use client"

import type React from "react"
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
import { Upload } from "lucide-react"

interface Tenant {
  id: string
  full_name: string
  identification_type?: string
  identification?: string
  email?: string
  phone?: string
  address?: string
  occupation?: string
  employer?: string
  monthly_income?: number
  emergency_contact_name?: string
  emergency_contact_phone?: string
  notes?: string
}

interface TenantFormProps {
  tenant?: Tenant
  mode?: "create" | "edit"
}

export function TenantForm({ tenant, mode = "create" }: TenantFormProps) {
  const router = useRouter()
  const { agency } = useAgency()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sanitizeNumber = (value: string | null): number | null => {
    if (!value) return null
    const num = Number.parseFloat(value)
    if (isNaN(num)) return null
    // Limit to 10 digits before decimal (max for DECIMAL(12,2))
    return Math.min(num, 9999999999.99)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const tenantData = {
      agency_id: agency?.id,
      full_name: formData.get("full_name") as string,
      identification_type: formData.get("identification_type") as string,
      identification: formData.get("identification") as string,
      email: (formData.get("email") as string) || null,
      phone: formData.get("phone") as string,
      address: (formData.get("address") as string) || null,
      occupation: (formData.get("occupation") as string) || null,
      employer: (formData.get("employer") as string) || null,
      monthly_income: sanitizeNumber(formData.get("monthly_income") as string),
      emergency_contact_name: (formData.get("emergency_contact_name") as string) || null,
      emergency_contact_phone: (formData.get("emergency_contact_phone") as string) || null,
      notes: (formData.get("notes") as string) || null,
    }

    try {
      if (mode === "edit" && tenant) {
        const { error } = await supabase.from("tenants").update(tenantData).eq("id", tenant.id)
        if (error) throw error
        router.push(`/arrendatarios/${tenant.id}`)
      } else {
        const { error } = await supabase.from("tenants").insert(tenantData)
        if (error) throw error
        router.push("/arrendatarios")
      }
      router.refresh()
    } catch (err: unknown) {
      console.error("[v0] Error saving tenant:", err)
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo *</Label>
            <Input
              id="full_name"
              name="full_name"
              required
              defaultValue={tenant?.full_name}
              placeholder="Juan Pérez García"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="identification_type">Tipo de Documento</Label>
              <Select name="identification_type" defaultValue={tenant?.identification_type || "DNI"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DNI">DNI</SelectItem>
                  <SelectItem value="CUIT">CUIT</SelectItem>
                  <SelectItem value="CUIL">CUIL</SelectItem>
                  <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identification">Número de Documento *</Label>
              <Input
                id="identification"
                name="identification"
                required
                defaultValue={tenant?.identification}
                placeholder="12345678"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                defaultValue={tenant?.phone}
                placeholder="11 1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={tenant?.email}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección Actual</Label>
            <Input id="address" name="address" defaultValue={tenant?.address} placeholder="Calle y número, Ciudad" />
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Información Laboral</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="occupation">Ocupación</Label>
                <Input
                  id="occupation"
                  name="occupation"
                  defaultValue={tenant?.occupation}
                  placeholder="Empleado, Independiente, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthly_income">Ingreso Mensual</Label>
                <Input
                  id="monthly_income"
                  name="monthly_income"
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999999999"
                  defaultValue={tenant?.monthly_income}
                  placeholder="150000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employer">Empleador</Label>
                <Input
                  id="employer"
                  name="employer"
                  defaultValue={tenant?.employer}
                  placeholder="Nombre de la empresa"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Contacto de Emergencia</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">Nombre</Label>
                <Input
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  defaultValue={tenant?.emergency_contact_name}
                  placeholder="Nombre del contacto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Teléfono</Label>
                <Input
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  type="tel"
                  defaultValue={tenant?.emergency_contact_phone}
                  placeholder="11 9876-5432"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Documentos Adjuntos</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Documento de Identidad (DNI)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png" className="max-w-full" />
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG hasta 5MB</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Recibo de Sueldo</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png" className="max-w-full" />
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG hasta 5MB</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={tenant?.notes}
              placeholder="Observaciones adicionales..."
            />
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : mode === "edit" ? "Actualizar" : "Crear Inquilino"}
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
