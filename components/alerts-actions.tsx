"use client"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CheckCheck, Loader2, RefreshCw } from "lucide-react"
import { useAgency } from "@/hooks/use-agency"

export function AlertsActions() {
  const router = useRouter()
  const { agency } = useAgency()
  const [markingRead, setMarkingRead] = useState(false)
  const [generating, setGenerating] = useState(false)

  const handleMarkAllRead = async () => {
    setMarkingRead(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from("alerts")
      .update({ is_read: true, read_by: user?.id, read_at: new Date().toISOString() })
      .eq("is_read", false)

    router.refresh()
    setMarkingRead(false)
  }

  const handleGenerateAlerts = async () => {
    if (!agency?.id) return
    setGenerating(true)
    const supabase = createClient()

    // Call the DB function to generate alerts
    await supabase.rpc("generate_alerts", { p_agency_id: agency.id })
    // Also mark overdue payments
    await supabase.rpc("mark_overdue_payments", {})
    // Calculate interest
    await supabase.rpc("calculate_overdue_interest", { p_agency_id: agency.id })

    router.refresh()
    setGenerating(false)
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleGenerateAlerts} disabled={generating}>
        {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
        Actualizar Alertas
      </Button>
      <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markingRead}>
        {markingRead ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-1" />}
        Marcar todas leídas
      </Button>
    </div>
  )
}
