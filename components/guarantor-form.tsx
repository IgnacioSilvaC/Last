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

interface Guarantor {
  id: string
  full_name: string
  document_type?: string
  identification?: string
  tax_id?: string
  email?: string
  phone?: string
  address?: string
  occupation?: string
  employer?: string
  employer_phone?: string
  monthly_income?: number
  property_address?: string
  property_registration?: string
  guarantee_type?: string
  notes?: string
}

interface GuarantorFormProps {
  guarantor?: Guarantor
  mode?: "create" | "edit"
}

export function GuarantorForm({ guarantor, mode = "create" }: GuarantorFormProps) {
  const router = useRouter()
  const { agency } = useAgency()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sanitizeNumber = (value: string | null): number | null => {
    if (!value) return null
    const num = Number.parseFloat(value)
    if (isNaN(num)) return null
    return Math.min(num, 9999999999.99)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const guarantorData = {
      agency_id: agency?.id,
      full_name: formData.get("full_name") as string,
      document_type: formData.get("document_type") as string,
      identification: formData.get("identification") as string,
      tax_id: (formData.get("tax_id") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: formData.get("phone") as string,
      address: (formData.get("address") as string) || null,
      occupation: (formData.get("occupation") as string) || null,
      employer: (formData.get("employer") as string) || null,
      employer_phone: (formData.get("employer_phone") as string) || null,
      monthly_income: sanitizeNumber(formData.get("monthly_income") as string),
      property_address: (formData.get("property_address") as string) || null,
      property_registration: (formData.get("property_registration") as string) || null,
      guarantee_type: formData.get("guarantee_type") as string,
      notes: (formData.get("notes") as string) || null,
    }

    try {
      if (mode === "edit" && guarantor) {
        const { error } = await supabase.from("guarantors").update(guarantorData).eq("id", guarantor.id)
        if (error) throw error
        router.push(`/garantes/${guarantor.id}`)
      } else {
        const { error } = await supabase.from("guarantors").insert(guarantorData)
        if (error) throw error
        router.push("/garantes")
      }
      router.refresh()
    } catch (err: unknown) {
      console.error("[v0] Error saving guarantor:", err)
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
              defaultValue={guarantor?.full_name}
              placeholder="Juan Pérez García"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="document_type">Tipo de Documento</Label>
              <Select name="document_type" defaultValue={guarantor?.document_type || "DNI"}>
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
                defaultValue={guarantor?.identification}
                placeholder="12345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id">CUIT/CUIL</Label>
              <Input id="tax_id" name="tax_id" defaultValue={guarantor?.tax_id} placeholder="20-12345678-9" />
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
                defaultValue={guarantor?.phone}
                placeholder="11 1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={guarantor?.email}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" name="address" defaultValue={guarantor?.address} placeholder="Calle y número, Ciudad" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guarantee_type">Tipo de Garantía *</Label>
            <Select name="guarantee_type" defaultValue={guarantor?.guarantee_type || "propietario"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="propietario">Propietario</SelectItem>
                <SelectItem value="recibo_sueldo">Recibo de Sueldo</SelectItem>
                <SelectItem value="seguro_caucion">Seguro de Caución</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Información Laboral</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="occupation">Ocupación</Label>
                <Input
                  id="occupation"
                  name="occupation"
                  defaultValue={guarantor?.occupation}
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
                  defaultValue={guarantor?.monthly_income}
                  placeholder="150000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employer">Empleador</Label>
                <Input
                  id="employer"
                  name="employer"
                  defaultValue={guarantor?.employer}
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employer_phone">Teléfono del Empleador</Label>
                <Input
                  id="employer_phone"
                  name="employer_phone"
                  defaultValue={guarantor?.employer_phone}
                  placeholder="11 9876-5432"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Propiedad en Garantía (si aplica)</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="property_address">Dirección de la Propiedad</Label>
                <Input
                  id="property_address"
                  name="property_address"
                  defaultValue={guarantor?.property_address}
                  placeholder="Dirección completa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_registration">Matrícula/Inscripción</Label>
                <Input
                  id="property_registration"
                  name="property_registration"
                  defaultValue={guarantor?.property_registration}
                  placeholder="Número de matrícula"
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
              <div className="space-y-2">
                <Label>Escritura de Propiedad</Label>
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
              defaultValue={guarantor?.notes}
              placeholder="Observaciones adicionales..."
            />
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : mode === "edit" ? "Actualizar" : "Crear Garante"}
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
