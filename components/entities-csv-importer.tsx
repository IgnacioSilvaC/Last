"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Upload, Download, CheckCircle, AlertCircle, Loader2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAgency } from "@/hooks/use-agency"

type EntityType = "tenants" | "landlords" | "guarantors"

interface ColumnDef {
  csv: string
  db: string
  label: string
  required?: boolean
  transform?: (v: string) => any
}

interface EntityConfig {
  table: string
  labelPlural: string
  columns: ColumnDef[]
  example: Record<string, string>
}

const configs: Record<EntityType, EntityConfig> = {
  tenants: {
    table: "tenants",
    labelPlural: "Arrendatarios",
    columns: [
      { csv: "nombre_completo", db: "full_name", label: "Nombre Completo", required: true },
      { csv: "tipo_documento", db: "identification_type", label: "Tipo Doc." },
      { csv: "numero_documento", db: "identification", label: "Nro. Documento", required: true },
      { csv: "telefono", db: "phone", label: "Teléfono", required: true },
      { csv: "email", db: "email", label: "Email" },
      { csv: "domicilio", db: "address", label: "Domicilio" },
      { csv: "ocupacion", db: "occupation", label: "Ocupación" },
      { csv: "empleador", db: "employer", label: "Empleador" },
      { csv: "ingreso_mensual", db: "monthly_income", label: "Ingreso Mensual", transform: (v) => v ? Number(v) : null },
      { csv: "contacto_emergencia_nombre", db: "emergency_contact_name", label: "Contacto Emergencia" },
      { csv: "contacto_emergencia_telefono", db: "emergency_contact_phone", label: "Tel. Emergencia" },
      { csv: "notas", db: "notes", label: "Notas" },
    ],
    example: {
      nombre_completo: "Juan Pérez",
      tipo_documento: "DNI",
      numero_documento: "12345678",
      telefono: "1145678901",
      email: "juan@email.com",
      domicilio: "Av. Corrientes 1234 CABA",
      ocupacion: "Empleado",
      empleador: "Empresa SA",
      ingreso_mensual: "150000",
      contacto_emergencia_nombre: "María Pérez",
      contacto_emergencia_telefono: "1145678902",
      notas: "",
    },
  },
  landlords: {
    table: "landlords",
    labelPlural: "Arrendadores",
    columns: [
      { csv: "nombre_completo", db: "full_name", label: "Nombre Completo", required: true },
      { csv: "tipo_documento", db: "identification_type", label: "Tipo Doc." },
      { csv: "numero_documento", db: "identification", label: "Nro. Documento", required: true },
      { csv: "telefono", db: "phone", label: "Teléfono", required: true },
      { csv: "email", db: "email", label: "Email" },
      { csv: "domicilio", db: "address", label: "Domicilio" },
      { csv: "cuit", db: "tax_id", label: "CUIT/CUIL" },
      { csv: "condicion_fiscal", db: "tax_condition", label: "Condición Fiscal" },
      { csv: "banco", db: "bank_name", label: "Banco" },
      { csv: "numero_cuenta", db: "bank_account", label: "Nro. Cuenta" },
      { csv: "cbu", db: "bank_cbu", label: "CBU/CVU" },
      { csv: "notas", db: "notes", label: "Notas" },
    ],
    example: {
      nombre_completo: "Ana Gómez",
      tipo_documento: "DNI",
      numero_documento: "87654321",
      telefono: "1156789012",
      email: "ana@email.com",
      domicilio: "Corrientes 5678 CABA",
      cuit: "27-87654321-3",
      condicion_fiscal: "Monotributo",
      banco: "Banco Nación",
      numero_cuenta: "001234567890",
      cbu: "0110000000000001234567",
      notas: "",
    },
  },
  guarantors: {
    table: "guarantors",
    labelPlural: "Garantes",
    columns: [
      { csv: "nombre_completo", db: "full_name", label: "Nombre Completo", required: true },
      { csv: "tipo_documento", db: "identification_type", label: "Tipo Doc." },
      { csv: "numero_documento", db: "identification", label: "Nro. Documento", required: true },
      { csv: "telefono", db: "phone", label: "Teléfono", required: true },
      { csv: "email", db: "email", label: "Email" },
      { csv: "domicilio", db: "address", label: "Domicilio" },
      { csv: "ocupacion", db: "occupation", label: "Ocupación" },
      { csv: "empleador", db: "employer", label: "Empleador" },
      { csv: "ingreso_mensual", db: "monthly_income", label: "Ingreso Mensual", transform: (v) => v ? Number(v) : null },
      { csv: "domicilio_garantia", db: "guarantee_property_address", label: "Domicilio Garantía" },
      { csv: "registro_garantia", db: "guarantee_property_registry", label: "Registro Garantía" },
      { csv: "notas", db: "notes", label: "Notas" },
    ],
    example: {
      nombre_completo: "Carlos Rodríguez",
      tipo_documento: "DNI",
      numero_documento: "34567890",
      telefono: "1167890123",
      email: "carlos@email.com",
      domicilio: "Rivadavia 9012 CABA",
      ocupacion: "Comerciante",
      empleador: "",
      ingreso_mensual: "200000",
      domicilio_garantia: "Mitre 3456 CABA",
      registro_garantia: "12345/2020",
      notas: "",
    },
  },
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

function downloadCSV(filename: string, headers: string[], example: Record<string, string>) {
  const row = headers.map((h) => example[h] || "").join(",")
  const content = [headers.join(","), row].join("\n")
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface ParsedRow {
  raw: Record<string, string>
  mapped: Record<string, any>
  errors: string[]
  rowNum: number
}

export function EntitiesCsvImporter({ type }: { type: EntityType }) {
  const config = configs[type]
  const { agency } = useAgency()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [status, setStatus] = useState<"idle" | "preview" | "importing" | "done">("idle")
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const csvHeaders = config.columns.map((c) => c.csv)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows: rawRows } = parseCSV(text)
      const headerMap: Record<string, number> = {}
      headers.forEach((h, i) => { headerMap[h.toLowerCase().trim()] = i })

      const parsed: ParsedRow[] = rawRows.map((row, idx) => {
        const raw: Record<string, string> = {}
        const mapped: Record<string, any> = {}
        const errors: string[] = []

        config.columns.forEach((col) => {
          const hi = headerMap[col.csv]
          const val = hi !== undefined ? (row[hi] || "") : ""
          raw[col.csv] = val
          if (col.required && !val.trim()) errors.push(`${col.label} es requerido`)
          mapped[col.db] = col.transform ? col.transform(val) : (val.trim() || null)
        })

        if (!mapped.identification_type) mapped.identification_type = "DNI"
        return { raw, mapped, errors, rowNum: idx + 2 }
      })

      setRows(parsed)
      setStatus("preview")
      setGlobalError(null)
    }
    reader.readAsText(file, "UTF-8")
  }

  const handleImport = async () => {
    if (!agency?.id) { setGlobalError("No se pudo determinar la inmobiliaria."); return }
    setStatus("importing")
    const supabase = createClient()
    const validRows = rows.filter((r) => r.errors.length === 0)
    const toInsert = validRows.map((r) => ({ ...r.mapped, agency_id: agency.id }))
    const { error } = await supabase.from(config.table).insert(toInsert)
    if (error) {
      setGlobalError(`Error al importar: ${error.message}`)
      setStatus("preview")
      return
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
        <CardTitle>Importar {config.labelPlural}</CardTitle>
        <CardDescription>
          Campos obligatorios: <strong>nombre_completo</strong>, <strong>numero_documento</strong>, <strong>telefono</strong>.
          El resto es opcional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={() => downloadCSV(`plantilla_${type}.csv`, csvHeaders, config.example)}>
            <Download className="mr-2 h-4 w-4" />
            Descargar Plantilla
          </Button>
          {status !== "importing" && (
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

        {globalError && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{globalError}</div>
        )}

        {status === "done" && result && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="font-medium text-green-700">{result.imported} registros importados</p>
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
                  Importar {validCount} registros
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    {config.columns.slice(0, 5).map((col) => (
                      <TableHead key={col.csv}>{col.label}</TableHead>
                    ))}
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.rowNum} className={row.errors.length > 0 ? "bg-red-50 dark:bg-red-950/10" : ""}>
                      <TableCell className="text-muted-foreground text-xs">{row.rowNum}</TableCell>
                      {config.columns.slice(0, 5).map((col) => (
                        <TableCell key={col.csv}>{row.raw[col.csv] || "-"}</TableCell>
                      ))}
                      <TableCell>
                        {row.errors.length > 0
                          ? <span className="text-xs text-red-600">{row.errors.join(", ")}</span>
                          : <CheckCircle className="h-4 w-4 text-green-500" />}
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
            Importando registros...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
