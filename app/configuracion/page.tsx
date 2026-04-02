import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Home, Settings } from "lucide-react"
import Link from "next/link"
import { ConfigForm } from "@/components/config-form"

const configDescriptions: Record<string, { label: string; description: string; suffix: string }> = {
  interest_rate_daily: {
    label: "Tasa de interés diaria por mora",
    description: "Se aplica al saldo pendiente por cada día de atraso (ej: 0.001 = 0.1% diario)",
    suffix: "por día",
  },
  grace_days: {
    label: "Días de gracia",
    description: "Días adicionales después del vencimiento antes de aplicar mora",
    suffix: "días",
  },
  alert_days_before_due: {
    label: "Días previos para alerta de vencimiento",
    description: "Cuántos días antes del vencimiento de una cuota se genera la alerta",
    suffix: "días",
  },
  alert_days_contract_expiry: {
    label: "Días previos para alerta de fin de contrato",
    description: "Cuántos días antes del fin de contrato se genera la alerta",
    suffix: "días",
  },
  alert_days_insurance_expiry: {
    label: "Días previos para alerta de seguro",
    description: "Cuántos días antes del vencimiento del seguro se genera la alerta",
    suffix: "días",
  },
  inactive_client_days: {
    label: "Días de inactividad de cliente",
    description: "Tras cuántos días sin pagos se marca al cliente como inactivo",
    suffix: "días",
  },
  mora_grave_days: {
    label: "Días para mora grave",
    description: "A partir de cuántos días de atraso se considera mora grave",
    suffix: "días",
  },
}

export default async function ConfigPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Get user profile to check admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard")
  }

  const { data: configs } = await supabase
    .from("system_config")
    .select("*")
    .eq("agency_id", profile.agency_id)
    .order("config_key")

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard"><Home className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Configuración</h1>
          <p className="text-muted-foreground">Parámetros del sistema para tu inmobiliaria</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Parámetros de Negocio
          </CardTitle>
          <CardDescription>
            Estos valores controlan el cálculo de mora, intereses y generación de alertas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configs && configs.length > 0 ? (
            <ConfigForm
              configs={configs.map((c: any) => ({
                ...c,
                ...(configDescriptions[c.config_key] || { label: c.config_key, description: c.description || "", suffix: "" }),
              }))}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No hay configuración cargada. La configuración se crea automáticamente al crear una inmobiliaria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
