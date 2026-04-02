"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Save, Loader2 } from "lucide-react"

interface ConfigItem {
  id: string
  agency_id: string
  config_key: string
  config_value: string
  label: string
  description: string
  suffix: string
}

interface ConfigFormProps {
  configs: ConfigItem[]
}

export function ConfigForm({ configs }: ConfigFormProps) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(configs.map((c) => [c.config_key, c.config_value]))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)

    const supabase = createClient()

    try {
      for (const config of configs) {
        const newValue = values[config.config_key]
        if (newValue !== config.config_value) {
          const { error: updateError } = await supabase
            .from("system_config")
            .update({ config_value: newValue, updated_at: new Date().toISOString() })
            .eq("id", config.id)

          if (updateError) throw updateError
        }
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {configs.map((config) => (
        <div key={config.id} className="space-y-2">
          <Label htmlFor={config.config_key} className="text-sm font-medium">
            {config.label}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={config.config_key}
              value={values[config.config_key] || ""}
              onChange={(e) => setValues({ ...values, [config.config_key]: e.target.value })}
              className="max-w-xs"
            />
            {config.suffix && (
              <span className="text-sm text-muted-foreground">{config.suffix}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      ))}

      {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
      {saved && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">Configuración guardada correctamente.</div>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Guardar Configuración
      </Button>
    </div>
  )
}
