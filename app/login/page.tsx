"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Building2, Mail, Shield, BarChart3, FileText } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const trimmedEmail = useMemo(() => email.trim(), [email])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      if (!trimmedEmail || !password) {
        throw new Error("Completa todos los campos para continuar")
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })
      if (error) throw error
      router.push("/dashboard")
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocurrió un error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">Gestión Inmobiliaria</span>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight">
              Administra tus propiedades<br />
              con control total.
            </h2>
            <p className="mt-4 text-slate-400 max-w-md">
              Contratos, pagos, inquilinos y propiedades en una sola plataforma.
              Toma decisiones informadas con datos en tiempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-sm">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10">
                <FileText className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-slate-300">Gestión integral de contratos y aumentos</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-slate-300">Control de pagos, mora e intereses</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10">
                <Shield className="h-4 w-4 text-amber-400" />
              </div>
              <span className="text-slate-300">Alertas automáticas y auditoría completa</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Sistema de gestión inmobiliaria profesional
        </p>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-10 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-sm">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2 text-center lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Gestión Inmobiliaria</h1>
              <p className="text-sm text-muted-foreground">Administración de propiedades y contratos</p>
            </div>

            <div className="hidden lg:block text-center">
              <h1 className="text-2xl font-bold">Iniciar Sesión</h1>
              <p className="text-sm text-muted-foreground mt-1">Ingresa tus credenciales para acceder al sistema</p>
            </div>

            <Card>
              <CardHeader className="lg:hidden">
                <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
                <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 lg:pt-8">
                <form onSubmit={handleLogin}>
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                        <Input
                          id="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="tu@email.com"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <PasswordInput
                      id="password"
                      label="Contraseña"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                    </Button>
                  </div>
                  <div className="mt-4 text-center text-xs text-muted-foreground">
                    Acceso exclusivo para usuarios autorizados.
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
