import type { UserRole } from "./types"

export const PERMISSIONS = {
  // Properties permissions
  properties: {
    view: ["admin", "agente", "contador"],
    create: ["admin", "agente"],
    update: ["admin", "agente"],
    delete: ["admin"],
  },
  // Contracts permissions
  contracts: {
    view: ["admin", "agente", "contador"],
    create: ["admin", "agente"],
    update: ["admin", "agente"],
    delete: ["admin"],
  },
  // Tenants permissions
  tenants: {
    view: ["admin", "agente", "contador"],
    create: ["admin", "agente"],
    update: ["admin", "agente"],
    delete: ["admin"],
  },
  // Landlords permissions
  landlords: {
    view: ["admin", "agente", "contador"],
    create: ["admin", "agente"],
    update: ["admin", "agente"],
    delete: ["admin"],
  },
  // Payments permissions
  payments: {
    view: ["admin", "agente", "contador"],
    create: ["admin", "contador"],
    update: ["admin", "contador"],
    delete: ["admin"],
  },
  // Users permissions (admin panel)
  users: {
    view: ["admin"],
    update: ["admin"],
    delete: ["admin"],
  },
} as const

export function hasPermission(userRole: UserRole, resource: keyof typeof PERMISSIONS, action: string): boolean {
  const permissions = PERMISSIONS[resource]
  if (!permissions) return false

  const allowedRoles = permissions[action as keyof typeof permissions]
  if (!allowedRoles) return false

  return allowedRoles.includes(userRole)
}

export function canDelete(userRole: UserRole): boolean {
  return userRole === "admin"
}

export function canManagePayments(userRole: UserRole): boolean {
  return userRole === "admin" || userRole === "contador"
}

export function canManageUsers(userRole: UserRole): boolean {
  return userRole === "admin"
}
