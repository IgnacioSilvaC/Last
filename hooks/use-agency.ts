"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { Agency, Profile } from "@/lib/types"

export function useAgency() {
  const [agency, setAgency] = useState<Agency | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    async function fetchAgencyData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setLoading(false)
          return
        }

        // Obtener perfil con datos de la inmobiliaria
        const { data: profileData } = await supabase
          .from("profiles")
          .select(`
            *,
            agency:agencies(*)
          `)
          .eq("id", user.id)
          .single()

        if (profileData) {
          setProfile(profileData as Profile)
          setAgency(profileData.agency as Agency)
        }
      } catch (error) {
        console.error("Error fetching agency:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAgencyData()
  }, [supabase])

  return { agency, profile, loading, isAdmin: profile?.is_agency_admin || profile?.role === "admin" }
}
