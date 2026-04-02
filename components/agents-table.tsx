"use client"

import type { Profile } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RoleBadge } from "@/components/role-badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"

interface AgentsTableProps {
  agents: Profile[]
}

export function AgentsTable({ agents }: AgentsTableProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const { profile: currentUser } = useUser()

  const handleRoleChange = async (userId: string, newRole: string) => {
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId)
    router.refresh()
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Fecha Alta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.length > 0 ? (
            agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell className="font-medium">{agent.full_name}</TableCell>
                <TableCell>{agent.email}</TableCell>
                <TableCell>{agent.phone || "-"}</TableCell>
                <TableCell>
                  {currentUser?.is_agency_admin && agent.id !== currentUser.id ? (
                    <Select value={agent.role} onValueChange={(value) => handleRoleChange(agent.id, value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="agente">Agente</SelectItem>
                        <SelectItem value="contador">Contador</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <RoleBadge role={agent.role} />
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(agent.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No hay agentes registrados
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
