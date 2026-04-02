"use client"

import type React from "react"

import { useUser } from "@/hooks/use-user"
import { hasPermission } from "@/lib/permissions"
import type { PERMISSIONS } from "@/lib/permissions"

interface ProtectedActionProps {
  resource: keyof typeof PERMISSIONS
  action: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedAction({ resource, action, children, fallback = null }: ProtectedActionProps) {
  const { profile, loading } = useUser()

  if (loading) return null
  if (!profile) return fallback

  if (!hasPermission(profile.role, resource, action)) {
    return fallback
  }

  return <>{children}</>
}
