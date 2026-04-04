"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Upload, Download, CheckCircle, AlertCircle, Loader2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAgency } from "@/hooks/use-agency"

// CSV column definitions for contracts
const CSV_HEADERS = [
  "numero_contrato",
  "dni_arrendatario",
  "dni_arrendador",
  "dni_garante",
  "codigo_propiedad",
  "fecha_inicio",
  "fecha_fin",
  "alquiler_mensual",
  "moneda",
  "dia_pago",
  "tipo_aumento",
  "porcentaje_aumento",
  "frecuencia_aumento_meses",
  "tipo_mora",
  "dias_gracia",
  "porcentaje_mora_diario",
  "monto_fijo_mora",
  "comision_porcentaje",
  "expensas",
  "meses_deposito",
  "notas",
]

const CSV_EXAMPLE: Record<string, string> = {
  numero_contrato: "CTR-001",
  dni_arrendatario: "12345678",
  dni_arrendador: "87654321",
  dni_garante: "34567890",
  codigo_propiedad: "PROP-01",
  fecha_inicio: "2024-01-01",
  fecha_fin: "2025-12-31",
  alquiler_mensual: "150000",
  moneda: "ARS",
  dia_pago: "10",
  tipo_aumento: "porcentaje",
  porcentaje_aumento: "30",
  frecuencia_aumento_meses: "12",
  tipo_mora: "porcentaje_diario",
  dias_gracia: "5",
  porcentaje_mora_diario: "0.1",
  monto_fijo_mora: "0",
  comision_porcentaje: "5",
  expensas: "0",
  meses_deposito: "1",
  notas: "",
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  const parse = (line: string): string[] => {
    const cols: string[] = []
    let col = ""
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ }
      else if (line[i] === "," && !inQ) { cols.push(col.trim()); col = "" }
      else { col += line[i] }
    }
    cols.push(col.trim())
    return cols
  }
  return { headers: parse(lines[0]), rows: lines.slice(1).map(parse) }
}

function downloadTemplate() {
  const row = CSV_HEADERS.map((h) => CSV_EXAMPLE[h] || "").join(",")
  const content = [CSV_HEADERS.join(","), row].join("\n")
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "plantilla_contratos.csv"
  a.click()
  URL.revokeObjectURL(url)
}

interface ParsedContract {
  raw: Record<string, string>
  mapped: Record<string, any> | null
  errors: string[]
  warnings: string[]
  rowNum: number
}

export function ContractsCsvImporter() {
  const { agency } = useAgency()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedContract[]>([])
  const [status, setStatus] = useState<"idle" | "loading" | "preview" | "importing" | "done">("idle")
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    if (!agency?.id) { setGlobalError("No se pudo determinar la inmobiliaria."); return }
    setStatus("loading")
    setGlobalError(null)

    const supabase = createClient()

    // Load lookup data
    const [{ data: tenants }, { data: landlords }, { data: guarantors }, { data: properties }] =
      await Promise.all([
        supabase.from("tenants").select("id, identification").eq("agency_id", agency.id),
        supabase.from("landlords").select("id, identification").eq("agency_id", agency.id),
        supabase.from("guarantors").select("id, identification").eq("agency_id", agency.id),
        supabase.from("properties").select("id, code").eq("agency_id", agency.id),
      ])

    const tenantMap = new Map((tenants || []).map((t) => [t.identification, t.id]))
    const landlordMap = new Map((landlords || []).map((l) => [l.identification, l.id]))
    const guarantorMap = new Map((guarantors || []).map((g) => [g.identification, g.id]))
    const propertyMap = new Map((properties || []).map((p) => [p.code, p.id]))

    // Parse CSV
    const text = await file.text()
    const { headers, rows: rawRows } = parseCSV(text)
    const headerMap: Record<string, number> = {}
    headers.forEach((h, i) => { headerMap[h.toLowerCase().trim()] = i })

    const get = (row: string[], col: string) => {
      const i = headerMap[col]
      return i !== undefined ? (row[i] || "").trim() : ""
    }

    const parsed: ParsedContract[] = rawRows.map((row, idx) => {
      const raw: Record<string, string> = {}
      CSV_HEADERS.forEach((h) => { raw[h] = get(row, h) })

      const errors: string[] = []
      const warnings: string[] = []

      // Required fields
      if (!raw.numero_contrato) errors.push("numero_contrato requerido")
      if (!raw.fecha_inicio) errors.push("fecha_inicio requerida")
      if (!raw.fecha_fin) errors.push("fecha_fin requerida")
      if (!raw.alquiler_mensual || isNaN(Number(raw.alquiler_mensual))) errors.push("alquiler_mensual inválido")
      if (!raw.dni_arrendatario) errors.push("dni_arrendatario requerido")
      if (!raw.dni_arrendador) errors.push("dni_arrendador requerido")

      // DNI lookups
      let tenant_id: string | null = null
      let landlord_id: string | null = null
      let guarantor_id: string | null = null
      let property_id: string | null = null

      if (raw.dni_arrendatario) {
        tenant_id = tenantMap.get(raw.dni_arrendatario) || null
        if (!tenant_id) errors.push(`Arrendatario DNI ${raw.dni_arrendatario} no encontrado`)
      }
      if (raw.dni_arrendador) {
        landlord_id = landlordMap.get(raw.dni_arrendador) || null
        if (!landlord_id) errors.push(`Arrendador DNI ${raw.dni_arrendador} no encontrado`)
      }
      if (raw.dni_garante) {
        guarantor_id = guarantorMap.get(raw.dni_garante) || null
        if (!guarantor_id) warnings.push(`Garante DNI ${raw.dni_garante} no encontrado — se omite`)
      }
      if (raw.codigo_propiedad) {
        property_id = propertyMap.get(raw.codigo_propiedad) || null
        if (!property_id) warnings.push(`Propiedad ${raw.codigo_propiedad} no encontrada — se omite`)
      }

      if (errors.length > 0) return { raw, mapped: null, errors, warnings, rowNum: idx + 2 }

      const monthlyRent = Number(raw.alquiler_mensual)
      const depositMonths = Number(raw.meses_deposito) || 1
      const increaseType = raw.tipo_aumento || null
      const increaseFrequency = Number(raw.frecuencia_aumento_meses) || 12
      const latePaymentType = raw.tipo_mora || "ninguna"

      // Calculate next_increase_date
      let next_increase_date: string | null = null
      if (increaseType && increaseType !== "none" && raw.fecha_inicio) {
        const start = new Date(raw.fecha_inicio + "T12:00:00")
        start.setMonth(start.getMonth() + increaseFrequency)
        next_increase_date = start.toISOString().split("T")[0]
      }

      const mapped = {
        contract_number: raw.numero_contrato,
        tenant_id,
        landlord_id,
        guarantor_id,
        property_id,
        start_date: raw.fecha_inicio,
        end_date: raw.fecha_fin,
        monthly_rent: monthlyRent,
        current_rent_amount: monthlyRent,
        currency: raw.moneda || "ARS",
        payment_day: Number(raw.dia_pago) || 10,
        deposit_months: depositMonths,
        security_deposit: Math.round(monthlyRent * depositMonths * 100) / 100,
        increase_type: increaseType,
        increase_percentage: raw.porcentaje_aumento ? Number(raw.porcentaje_aumento) : null,
        increase_frequency_months: increaseFrequency,
        next_increase_date,
        late_payment_type: latePaymentType,
        late_payment_grace_days: Number(raw.dias_gracia) || 0,
        late_payment_penalty_percentage: latePaymentType === "porcentaje_diario" ? Number(raw.porcentaje_mora_diario) || 0 : 0,
        late_payment_fixed_amount: latePaymentType === "monto_fijo" ? Number(raw.monto_fijo_mora) || 0 : 0,
        admin_fee_percentage: Number(raw.comision_porcentaje) || 0,
        expenses_amount: Number(raw.expensas) || 0,
        notes: raw.notas || null,
        status: "activo",
      }

      return { raw, mapped, errors, warnings, rowNum: idx + 2 }
    })

    setRows(parsed)
    setStatus("preview")
  }

  const handleImport = async () => {
    if (!agency?.id) return
    setStatus("importing")
    const supabase = createClient()
    const validRows = rows.filter((r) => r.errors.length === 0 && r.mapped)
    const toInsert = validRows.map((r) => ({ ...r.mapped!, agency_id: agency.id }))

    const { data: inserted, error } = await supabase
      .from("contracts")
      .insert(toInsert)
      .select("id")
    if (error) {
      setGlobalError(`Error al importar: ${error.message}`)
      setStatus("preview")
      return
    }

    // Generate monthly payments for each imported contract
    for (const contract of inserted || []) {
      await supabase.rpc("generate_contract_payments", { p_contract_id: contract.id })
    }

    setResult({ imported: validRows.length, skipped: rows.length - validRows.length })
    setStatus("done")
    setRows([])
  }

  const reset = () => {
    setRows([]); setStatus("idle"); setResult(null); setGlobalError(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  const validCount = rows.filter((r) => r.errors.length === 0).length
  const errorCount = rows.filter((r) => r.errors.length > 0).length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Contratos</CardTitle>
        <CardDescription>
          Usá el DNI del arrendatario, arrendador y garante para vincular automáticamente.
          Importá primero arrendatarios, arrendadores y garantes antes de importar contratos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Descargar Plantilla
          </Button>
          {status !== "importing" && status !== "loading" && (
            <>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <Button onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Subir CSV
              </Button>
            </>
          )}
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
          <p><strong>Campos obligatorios:</strong> numero_contrato, dni_arrendatario, dni_arrendador, fecha_inicio, fecha_fin, alquiler_mensual</p>
          <p><strong>tipo_mora:</strong> porcentaje_diario | monto_fijo | ninguna</p>
          <p><strong>tipo_aumento:</strong> porcentaje | fijo | icl | ipc | uva | none</p>
          <p><strong>moneda:</strong> ARS | USD | MXN (default: ARS)</p>
        </div>

        {globalError && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{globalError}</div>
        )}

        {(status === "loading") && (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando datos para vincular...
          </div>
        )}

        {status === "done" && result && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="font-medium text-green-700">{result.imported} contratos importados</p>
              {result.skipped > 0 && (
                <p className="text-sm text-muted-foreground">{result.skipped} filas con errores fueron omitidas</p>
              )}
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={reset}>Nueva importación</Button>
          </div>
        )}

        {status === "preview" && rows.length > 0 && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="text-green-600 border-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />{validCount} válidos
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="text-red-500 border-red-500">
                  <AlertCircle className="h-3 w-3 mr-1" />{errorCount} con errores (se omitirán)
                </Badge>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={reset}>
                  <X className="mr-1 h-3 w-3" />Cancelar
                </Button>
                <Button size="sm" onClick={handleImport} disabled={validCount === 0}>
                  Importar {validCount} contratos
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>N° Contrato</TableHead>
                    <TableHead>DNI Arrendatario</TableHead>
                    <TableHead>DNI Arrendador</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Alquiler</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.rowNum} className={row.errors.length > 0 ? "bg-red-50 dark:bg-red-950/10" : ""}>
                      <TableCell className="text-muted-foreground text-xs">{row.rowNum}</TableCell>
                      <TableCell>{row.raw.numero_contrato || "-"}</TableCell>
                      <TableCell>{row.raw.dni_arrendatario || "-"}</TableCell>
                      <TableCell>{row.raw.dni_arrendador || "-"}</TableCell>
                      <TableCell>{row.raw.fecha_inicio || "-"}</TableCell>
                      <TableCell>{row.raw.alquiler_mensual || "-"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {row.errors.length > 0
                            ? <span className="text-xs text-red-600">{row.errors.join(" · ")}</span>
                            : <CheckCircle className="h-4 w-4 text-green-500" />}
                          {row.warnings.map((w, i) => (
                            <span key={i} className="block text-xs text-amber-600">{w}</span>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {status === "importing" && (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Importando contratos...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
