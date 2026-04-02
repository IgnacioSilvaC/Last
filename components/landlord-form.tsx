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

interface Landlord {
  id: string
  full_name: string
  document_type?: string
  identification?: string
  tax_id?: string
  email?: string
  phone?: string
  address?: string
  bank_name?: string
  bank_account?: string
  bank_cbu?: string
  notes?: string
}

interface LandlordFormProps {
  landlord?: Landlord
  mode?: "create" | "edit"
}

export function LandlordForm({ landlord, mode = "create" }: LandlordFormProps) {
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

    const landlordData = {
      agency_id: agency?.id,
      full_name: formData.get("full_name") as string,
      document_type: formData.get("document_type") as string,
      identification: formData.get("identification") as string,
      tax_id: (formData.get("tax_id") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: formData.get("phone") as string,
      address: (formData.get("address") as string) || null,
      bank_name: (formData.get("bank_name") as string) || null,
      bank_account: (formData.get("bank_account") as string) || null,
      bank_cbu: (formData.get("bank_cbu") as string) || null,
      notes: (formData.get("notes") as string) || null,
    }

    try {
      if (mode === "edit" && landlord) {
        const { error } = await supabase.from("landlords").update(landlordData).eq("id", landlord.id)
        if (error) throw error
        router.push(`/arrendadores/${landlord.id}`)
      } else {
        const { error } = await supabase.from("landlords").insert(landlordData)
        if (error) throw error
        router.push("/arrendadores")
      }
      router.refresh()
    } catch (err: unknown) {
      console.error("[v0] Error saving landlord:", err)
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
              defaultValue={landlord?.full_name}
              placeholder="María González López"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="document_type">Tipo de Documento</Label>
              <Select name="document_type" defaultValue={landlord?.document_type || "DNI"}>
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
                defaultValue={landlord?.identification}
                placeholder="12345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id">CUIT/CUIL</Label>
              <Input id="tax_id" name="tax_id" defaultValue={landlord?.tax_id} placeholder="20-12345678-9" />
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
                defaultValue={landlord?.phone}
                placeholder="11 1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={landlord?.email}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" name="address" defaultValue={landlord?.address} placeholder="Calle y número, Ciudad" />
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Información Bancaria</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Banco</Label>
                <Input
                  id="bank_name"
                  name="bank_name"
                  defaultValue={landlord?.bank_name}
                  placeholder="Banco Nación, Galicia, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_account">Número de Cuenta</Label>
                <Input
                  id="bank_account"
                  name="bank_account"
                  defaultValue={landlord?.bank_account}
                  placeholder="Número de cuenta"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_cbu">CBU/CVU</Label>
                <Input
                  id="bank_cbu"
                  name="bank_cbu"
                  defaultValue={landlord?.bank_cbu}
                  placeholder="0000000000000000000000"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Documentos Adjuntos</h3>
            <div className="space-y-2">
              <Label>Documento de Identidad (DNI)</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" className="max-w-full" />
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG hasta 5MB</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={landlord?.notes}
              placeholder="Observaciones adicionales..."
            />
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : mode === "edit" ? "Actualizar" : "Crear Propietario"}
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
