"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Upload } from "lucide-react"

const DEFAULT_AGENCY_ID = "00000000-0000-0000-0000-000000000001"

interface Tenant {
  id: string
  full_name: string
  document_type?: string
  document_number?: string
  tax_id?: string
  email?: string
  phone?: string
  address?: string
  occupation?: string
  employer?: string
  employer_phone?: string
  monthly_income?: number
  document_url?: string
  salary_receipt_url?: string
  notes?: string
}

interface TenantFormProps {
  tenant?: Tenant
  mode?: "create" | "edit"
}

export function TenantForm({ tenant, mode = "create" }: TenantFormProps) {
  const router = useRouter()
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
      agency_id: DEFAULT_AGENCY_ID,
      full_name: formData.get("full_name") as string,
      document_type: formData.get("document_type") as string,
      document_number: formData.get("document_number") as string,
      tax_id: (formData.get("tax_id") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: formData.get("phone") as string,
      address: (formData.get("address") as string) || null,
      occupation: (formData.get("occupation") as string) || null,
      employer: (formData.get("employer") as string) || null,
      employer_phone: (formData.get("employer_phone") as string) || null,
      monthly_income: sanitizeNumber(formData.get("monthly_income") as string),
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

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="document_type">Tipo de Documento</Label>
              <Select name="document_type" defaultValue={tenant?.document_type || "DNI"}>
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
              <Label htmlFor="document_number">Número de Documento *</Label>
              <Input
                id="document_number"
                name="document_number"
                required
                defaultValue={tenant?.document_number}
                placeholder="12345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id">CUIT/CUIL</Label>
              <Input id="tax_id" name="tax_id" defaultValue={tenant?.tax_id} placeholder="20-12345678-9" />
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

              <div className="space-y-2">
                <Label htmlFor="employer_phone">Teléfono del Empleador</Label>
                <Input
                  id="employer_phone"
                  name="employer_phone"
                  defaultValue={tenant?.employer_phone}
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
