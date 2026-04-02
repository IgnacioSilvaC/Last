import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Home, ClipboardList } from "lucide-react"
import Link from "next/link"

const actionLabels: Record<string, { label: string; color: string }> = {
  create: { label: "Creación", color: "bg-green-500/10 text-green-600" },
  update: { label: "Actualización", color: "bg-blue-500/10 text-blue-600" },
  delete: { label: "Eliminación", color: "bg-red-500/10 text-red-600" },
  login: { label: "Inicio sesión", color: "bg-gray-500/10 text-gray-600" },
  logout: { label: "Cierre sesión", color: "bg-gray-500/10 text-gray-600" },
  payment: { label: "Pago", color: "bg-emerald-500/10 text-emerald-600" },
  increase: { label: "Aumento", color: "bg-amber-500/10 text-amber-600" },
  alert: { label: "Alerta", color: "bg-violet-500/10 text-violet-600" },
}

const entityLabels: Record<string, string> = {
  contract: "Contrato",
  payment: "Pago",
  partial_payment: "Pago Parcial",
  tenant: "Inquilino",
  landlord: "Propietario",
  property: "Propiedad",
  guarantor: "Garante",
  alert: "Alerta",
  config: "Configuración",
}

export default async function AuditPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: logs } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard"><Home className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Auditoría</h1>
          <p className="text-muted-foreground">Registro de acciones del sistema</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Últimas acciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => {
                    const action = actionLabels[log.action] || { label: log.action, color: "bg-gray-500/10 text-gray-600" }
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell className="text-sm">{log.user_email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={action.color}>
                            {action.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {entityLabels[log.entity_type] || log.entity_type}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.new_values ? JSON.stringify(log.new_values).substring(0, 100) : "-"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No hay registros de auditoría</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
