import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AgentsTable } from "@/components/agents-table"
import { InviteAgentDialog } from "@/components/invite-agent-dialog"

export default async function AgentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: currentProfile } = await supabase.from("profiles").select("agency_id").eq("id", user?.id).single()

  const { data: agents } = await supabase
    .from("profiles")
    .select("*")
    .eq("agency_id", currentProfile?.agency_id)
    .order("created_at", { ascending: false })

  const { data: invitations } = await supabase
    .from("agent_invitations")
    .select("*")
    .eq("agency_id", currentProfile?.agency_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipo de Agentes</h1>
          <p className="text-muted-foreground">Gestiona los agentes y permisos de tu inmobiliaria</p>
        </div>
        <InviteAgentDialog />
      </div>

      <div className="grid gap-6">
        {invitations && invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Invitaciones Pendientes</CardTitle>
              <CardDescription>Usuarios que aún no han aceptado la invitación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-sm text-muted-foreground capitalize">Rol: {inv.role}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Expira: {new Date(inv.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Agentes Activos</CardTitle>
            <CardDescription>Miembros del equipo con acceso al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <AgentsTable agents={agents || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
