import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, AlertTriangle, Info, AlertCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { AlertsActions } from "@/components/alerts-actions"

const severityConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200" },
  critical: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20 border-red-200" },
}

const typeLabels: Record<string, string> = {
  vencimiento_proximo: "Vencimiento Próximo",
  pago_en_mora: "Pago en Mora",
  pago_parcial_recibido: "Pago Parcial",
  contrato_por_vencer: "Contrato por Vencer",
  cliente_sin_actividad: "Inquilino sin actividad",
  seguro_por_vencer: "Seguro por Vencer",
  aumento_pendiente: "Aumento Pendiente",
}

export default async function AlertsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: alerts } = await supabase
    .from("alerts")
    .select("*")
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false })
    .limit(100)

  const unread = (alerts || []).filter((a) => !a.is_read)
  const read = (alerts || []).filter((a) => a.is_read)

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Alertas</h1>
          <p className="text-muted-foreground">
            {unread.length > 0 ? `${unread.length} ${unread.length === 1 ? "alerta sin leer" : "alertas sin leer"}` : "No hay alertas nuevas"}
          </p>
        </div>
        <AlertsActions />
      </div>

      {unread.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Nuevas ({unread.length})
          </h2>
          {unread.map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.info
            const Icon = config.icon
            return (
              <Card key={alert.id} className={`border ${config.bg}`}>
                <CardContent className="flex items-start gap-4 py-4">
                  <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${config.color}`}>{alert.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {typeLabels[alert.alert_type] || alert.alert_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString("es-AR")}
                    </p>
                  </div>
                  {alert.entity_type && alert.entity_id && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/${alert.entity_type === "payment" ? "pagos" : alert.entity_type === "contract" ? "contratos" : "arrendatarios"}/${alert.entity_id}`}>
                        Ver
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {read.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5" />
            Leídas ({read.length})
          </h2>
          {read.map((alert) => (
            <Card key={alert.id} className="border opacity-70">
              <CardContent className="flex items-start gap-4 py-4">
                <Info className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-muted-foreground">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(alert.created_at).toLocaleString("es-AR")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(!alerts || alerts.length === 0) && (
        <Card className="p-12 text-center">
          <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">Sin alertas pendientes</p>
          <p className="text-sm text-muted-foreground">Las alertas se generan de forma automática cuando se detectan vencimientos, cuotas en mora u otros eventos relevantes.</p>
        </Card>
      )}
    </div>
  )
}
