import { Badge } from "@/components/ui/badge"
import type { UserRole } from "@/lib/types"

const roleColors: Record<UserRole, string> = {
  admin: "bg-red-500/10 text-red-500",
  agente: "bg-blue-500/10 text-blue-500",
  contador: "bg-green-500/10 text-green-500",
  viewer: "bg-gray-500/10 text-gray-500",
}

const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  agente: "Agente",
  contador: "Contador",
  viewer: "Visor",
}

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant="secondary" className={roleColors[role]}>
      {roleLabels[role]}
    </Badge>
  )
}
