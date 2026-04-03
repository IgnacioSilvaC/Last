import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Settings } from "lucide-react"
import { ConfigForm } from "@/components/config-form"

const configDescriptions: Record<string, { label: string; description: string; suffix: string }> = {
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
}

// Keys de mora que ya no aplican (la mora es por contrato)
const hiddenKeys = new Set(["interest_rate_daily", "grace_days", "mora_grave_days"])

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Configuración</h1>
        <p className="text-muted-foreground">Parámetros del sistema para tu inmobiliaria</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Parámetros de Negocio
          </CardTitle>
          <CardDescription>
            Configuración de alertas automáticas del sistema. La mora se configura en cada contrato individualmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configs && configs.length > 0 ? (
            <ConfigForm
              configs={configs
                .filter((c: any) => !hiddenKeys.has(c.config_key))
                .map((c: any) => ({
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
