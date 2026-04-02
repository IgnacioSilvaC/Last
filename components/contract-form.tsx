"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { ArrowLeft, Building2, Users, DollarSign, TrendingUp, Shield, Save, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import type { Contract, Property, Tenant, Landlord, Guarantor } from "@/lib/types"
import { useAgency } from "@/hooks/use-agency"

function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getMonthName(month: number): string {
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]
  return months[month - 1] || ""
}

interface ContractFormProps {
  contract?: Contract
  mode?: "create" | "edit"
  properties: Property[]
  tenants: Tenant[]
  landlords: Landlord[]
  guarantors: Guarantor[]
}

export function ContractForm({
  contract,
  mode = "create",
  properties,
  tenants,
  landlords,
  guarantors,
}: ContractFormProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const { agency } = useAgency()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("parties")

  // Form state - Parties
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(contract?.property_id || "")
  const [selectedTenantId, setSelectedTenantId] = useState<string>(contract?.tenant_id || "")
  const [selectedLandlordId, setSelectedLandlordId] = useState<string>(contract?.landlord_id || "")
  const [selectedGuarantorId, setSelectedGuarantorId] = useState<string>(contract?.guarantor_id || "")
  const [selectedGuarantor2Id, setSelectedGuarantor2Id] = useState<string>(contract?.guarantor2_id || "")
  const [showSecondGuarantor, setShowSecondGuarantor] = useState(!!contract?.guarantor2_id)

  // Form state - Contract details
  const [contractNumber, setContractNumber] = useState(contract?.contract_number || "")
  const [contractType, setContractType] = useState(contract?.contract_type || "vivienda")
  const [startDate, setStartDate] = useState<string>(contract?.start_date || "")
  const [endDate, setEndDate] = useState<string>(contract?.end_date || "")

  // Form state - Financial
  const [currency, setCurrency] = useState(contract?.currency || "ARS")
  const [monthlyRent, setMonthlyRent] = useState<number>(contract?.monthly_rent || 0)
  const [depositMonths, setDepositMonths] = useState<number>(contract?.deposit_months || 1)
  const [adminFeePercentage, setAdminFeePercentage] = useState<number>(contract?.admin_fee_percentage || 0)
  const [expensesAmount, setExpensesAmount] = useState<number>(contract?.expenses_amount || 0)
  const [expensesIncluded, setExpensesIncluded] = useState<boolean>(contract?.expenses_included || false)
  const [paymentDay, setPaymentDay] = useState<number>(contract?.payment_day || 1)

  // Form state - Increases
  const [increaseType, setIncreaseType] = useState<string>(contract?.increase_type || "")
  const [increasePercentage, setIncreasePercentage] = useState<number>(contract?.increase_percentage || 0)
  const [increaseFrequencyMonths, setIncreaseFrequencyMonths] = useState<number>(
    contract?.increase_frequency_months || 3,
  )

  // Form state - Insurance & Penalties
  const [hasFireInsurance, setHasFireInsurance] = useState<boolean>(contract?.has_fire_insurance || false)
  const [fireInsurancePolicy, setFireInsurancePolicy] = useState(contract?.fire_insurance_policy || "")
  const [fireInsuranceCompany, setFireInsuranceCompany] = useState(contract?.fire_insurance_company || "")
  const [latePaymentFeePercentage, setLatePaymentFeePercentage] = useState<number>(
    contract?.late_payment_fee_percentage || 0,
  )
  const [graceDays, setGraceDays] = useState<number>(contract?.grace_days || 0)

  // Form state - Notes
  const [specialClauses, setSpecialClauses] = useState(contract?.special_clauses || "")
  const [notes, setNotes] = useState(contract?.notes || "")

  const propertyOptions = properties.map((p) => ({
    value: p.id,
    label: p.code || p.address,
    description: p.address,
  }))

  const tenantOptions = tenants.map((t) => ({
    value: t.id,
    label: t.full_name,
    description: t.email || t.identification || "",
  }))

  const landlordOptions = landlords.map((l) => ({
    value: l.id,
    label: l.full_name,
    description: l.email || l.identification || "",
  }))

  const guarantorOptions = guarantors.map((g) => ({
    value: g.id,
    label: g.full_name,
    description: g.email || g.identification || "",
  }))

  // Calculate payment schedule with period ranges
  const paymentSchedule = useMemo(() => {
    if (!startDate || !endDate || !monthlyRent) return []

    const start = parseLocalDate(startDate)
    const end = parseLocalDate(endDate)
    const schedule: Array<{
      month: number
      year: number
      monthName: string
      amount: number
      isIncrease: boolean
      periodStart: string
      periodEnd: string
    }> = []

    const currentDate = new Date(start)
    let currentAmount = monthlyRent
    let paymentNumber = 0
    let periodStartMonth = start.getMonth() + 1
    let periodStartYear = start.getFullYear()

    while (currentDate <= end) {
      paymentNumber++
      const month = currentDate.getMonth() + 1
      const year = currentDate.getFullYear()

      // Check if this month has an increase
      let isIncrease = false
      if (increaseType && increaseFrequencyMonths > 0 && paymentNumber > 1) {
        if ((paymentNumber - 1) % increaseFrequencyMonths === 0) {
          isIncrease = true
          // Calculate increase based on type
          if (increaseType === "porcentaje" && increasePercentage > 0) {
            currentAmount = currentAmount * (1 + increasePercentage / 100)
          } else {
            // For ICL, IPC, UVA - use a placeholder percentage (would need actual index values)
            currentAmount = currentAmount * 1.05 // 5% placeholder
          }
          // Update period start
          periodStartMonth = month
          periodStartYear = year
        }
      }

      // Calculate period end (next increase or contract end)
      let periodEndMonth = month
      let periodEndYear = year
      if (increaseType && increaseFrequencyMonths > 0) {
        const monthsUntilNextIncrease = increaseFrequencyMonths - ((paymentNumber - 1) % increaseFrequencyMonths)
        if (monthsUntilNextIncrease < increaseFrequencyMonths) {
          const nextIncreaseDate = new Date(year, month - 1 + monthsUntilNextIncrease - 1)
          if (nextIncreaseDate <= end) {
            periodEndMonth = nextIncreaseDate.getMonth() + 1
            periodEndYear = nextIncreaseDate.getFullYear()
          } else {
            periodEndMonth = end.getMonth() + 1
            periodEndYear = end.getFullYear()
          }
        }
      }

      schedule.push({
        month,
        year,
        monthName: getMonthName(month),
        amount: Math.round(currentAmount * 100) / 100,
        isIncrease,
        periodStart: `${getMonthName(periodStartMonth)} ${periodStartYear}`,
        periodEnd: `${getMonthName(periodEndMonth)} ${periodEndYear}`,
      })

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    return schedule
  }, [startDate, endDate, monthlyRent, increaseType, increasePercentage, increaseFrequencyMonths])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!startDate || !endDate) {
      setError("Las fechas de inicio y fin son requeridas")
      setLoading(false)
      return
    }

    // Calculate next increase date
    let nextIncreaseDate: string | null = null
    if (increaseType && increaseFrequencyMonths > 0 && startDate) {
      const start = parseLocalDate(startDate)
      const nextIncrease = new Date(start)
      nextIncrease.setMonth(nextIncrease.getMonth() + increaseFrequencyMonths)
      nextIncreaseDate = formatDateForInput(nextIncrease)
    }

    if (!agency?.id) {
      setError("No se pudo determinar la inmobiliaria. Recargá la página.")
      setLoading(false)
      return
    }

    const contractData = {
      agency_id: agency.id,
      property_id: selectedPropertyId || null,
      tenant_id: selectedTenantId || null,
      landlord_id: selectedLandlordId || null,
      guarantor_id: selectedGuarantorId || null,
      guarantor2_id: showSecondGuarantor && selectedGuarantor2Id ? selectedGuarantor2Id : null,
      contract_number: contractNumber,
      start_date: startDate,
      end_date: endDate,
      currency,
      monthly_rent: monthlyRent,
      current_rent_amount: monthlyRent,
      deposit_months: depositMonths,
      security_deposit: Math.round(monthlyRent * depositMonths * 100) / 100,
      admin_fee_percentage: adminFeePercentage,
      expenses_amount: expensesAmount,
      expenses_included: expensesIncluded,
      payment_day: paymentDay,
      increase_type: increaseType || null,
      increase_percentage: increasePercentage,
      increase_frequency_months: increaseFrequencyMonths,
      next_increase_date: nextIncreaseDate,
      has_fire_insurance: hasFireInsurance,
      fire_insurance_policy: hasFireInsurance ? fireInsurancePolicy : null,
      fire_insurance_company: hasFireInsurance ? fireInsuranceCompany : null,
      late_payment_penalty_percentage: latePaymentFeePercentage,
      late_payment_grace_days: graceDays,
      special_clauses: specialClauses,
      notes,
      status: "activo",
    }

    try {
      if (mode === "edit" && contract?.id) {
        const { error: updateError } = await supabase.from("contracts").update(contractData).eq("id", contract.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from("contracts").insert(contractData)
        if (insertError) throw insertError

        // Update property status
        if (selectedPropertyId) {
          await supabase.from("properties").update({ status: "arrendado" }).eq("id", selectedPropertyId)
        }
      }

      router.push("/contratos")
      router.refresh()
    } catch (err) {
      console.error("[v0] Error saving contract:", err)
      setError(err instanceof Error ? err.message : "Error al guardar el contrato")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" asChild>
            <Link href="/contratos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{mode === "edit" ? "Editar Contrato" : "Nuevo Contrato"}</h1>
            <p className="text-muted-foreground">Complete los datos del contrato de arrendamiento</p>
          </div>
        </div>

        {error && <div className="bg-destructive/10 text-destructive p-4 rounded-lg">{error}</div>}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="parties" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Partes</span>
            </TabsTrigger>
            <TabsTrigger value="property" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Propiedad</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Financiero</span>
            </TabsTrigger>
            <TabsTrigger value="increases" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Aumentos</span>
            </TabsTrigger>
            <TabsTrigger value="insurance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Seguros</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Parties */}
          <TabsContent value="parties" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos del Contrato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contractNumber">Número de Contrato</Label>
                    <Input
                      id="contractNumber"
                      value={contractNumber}
                      onChange={(e) => setContractNumber(e.target.value)}
                      placeholder="CONT-2025-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contractType">Tipo de Contrato</Label>
                    <Select value={contractType} onValueChange={setContractType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vivienda">Vivienda</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="temporario">Temporario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Fecha de Inicio *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Fecha de Fin *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Arrendador (Propietario)</CardTitle>
              </CardHeader>
              <CardContent>
                <SearchableSelect
                  options={landlordOptions}
                  value={selectedLandlordId}
                  onValueChange={setSelectedLandlordId}
                  placeholder="Buscar propietario..."
                  searchPlaceholder="Escriba para filtrar..."
                  emptyMessage="No se encontraron propietarios"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Arrendatario (Inquilino)</CardTitle>
              </CardHeader>
              <CardContent>
                <SearchableSelect
                  options={tenantOptions}
                  value={selectedTenantId}
                  onValueChange={setSelectedTenantId}
                  placeholder="Buscar inquilino..."
                  searchPlaceholder="Escriba para filtrar..."
                  emptyMessage="No se encontraron inquilinos"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Garantes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Garante Principal</Label>
                  <SearchableSelect
                    options={guarantorOptions}
                    value={selectedGuarantorId}
                    onValueChange={setSelectedGuarantorId}
                    placeholder="Buscar garante..."
                    searchPlaceholder="Escriba para filtrar..."
                    emptyMessage="No se encontraron garantes"
                  />
                </div>

                {showSecondGuarantor ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Segundo Garante</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowSecondGuarantor(false)
                          setSelectedGuarantor2Id("")
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Quitar
                      </Button>
                    </div>
                    <SearchableSelect
                      options={guarantorOptions.filter((g) => g.value !== selectedGuarantorId)}
                      value={selectedGuarantor2Id}
                      onValueChange={setSelectedGuarantor2Id}
                      placeholder="Buscar segundo garante..."
                      searchPlaceholder="Escriba para filtrar..."
                      emptyMessage="No se encontraron garantes"
                    />
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowSecondGuarantor(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar 2do Garante
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Property */}
          <TabsContent value="property" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Propiedad</CardTitle>
              </CardHeader>
              <CardContent>
                <SearchableSelect
                  options={propertyOptions}
                  value={selectedPropertyId}
                  onValueChange={setSelectedPropertyId}
                  placeholder="Buscar propiedad..."
                  searchPlaceholder="Escriba para filtrar..."
                  emptyMessage="No se encontraron propiedades"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Financial */}
          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Términos Financieros</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                        <SelectItem value="USD">Dólares (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyRent">Alquiler Mensual *</Label>
                    <Input
                      id="monthlyRent"
                      type="number"
                      step="0.01"
                      min="0"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentDay">Día de Pago</Label>
                    <Input
                      id="paymentDay"
                      type="number"
                      min="1"
                      max="28"
                      value={paymentDay}
                      onChange={(e) => setPaymentDay(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="depositMonths">Meses de Depósito</Label>
                    <Input
                      id="depositMonths"
                      type="number"
                      min="0"
                      value={depositMonths}
                      onChange={(e) => setDepositMonths(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminFee">Comisión Admin. (%)</Label>
                    <Input
                      id="adminFee"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={adminFeePercentage}
                      onChange={(e) => setAdminFeePercentage(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expenses">Expensas</Label>
                    <Input
                      id="expenses"
                      type="number"
                      step="0.01"
                      min="0"
                      value={expensesAmount}
                      onChange={(e) => setExpensesAmount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="expensesIncluded" checked={expensesIncluded} onCheckedChange={setExpensesIncluded} />
                  <Label htmlFor="expensesIncluded">Expensas incluidas en el alquiler</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Increases */}
          <TabsContent value="increases" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Aumentos</CardTitle>
                <CardDescription>Define cómo se actualizará el alquiler durante el contrato</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="increaseType">Tipo de Aumento</Label>
                    <Select value={increaseType} onValueChange={setIncreaseType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin aumento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin aumento</SelectItem>
                        <SelectItem value="ICL">ICL (Índice Contratos Locación)</SelectItem>
                        <SelectItem value="IPC">IPC (Índice Precios Consumidor)</SelectItem>
                        <SelectItem value="UVA">UVA</SelectItem>
                        <SelectItem value="porcentaje_fijo">Porcentaje Fijo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="increaseFrequency">Frecuencia (meses)</Label>
                    <Select
                      value={String(increaseFrequencyMonths)}
                      onValueChange={(v) => setIncreaseFrequencyMonths(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Mensual</SelectItem>
                        <SelectItem value="2">Bimestral</SelectItem>
                        <SelectItem value="3">Trimestral</SelectItem>
                        <SelectItem value="4">Cuatrimestral</SelectItem>
                        <SelectItem value="6">Semestral</SelectItem>
                        <SelectItem value="12">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {increaseType === "porcentaje_fijo" && (
                    <div className="space-y-2">
                      <Label htmlFor="increasePercentage">Porcentaje (%)</Label>
                      <Input
                        id="increasePercentage"
                        type="number"
                        step="0.01"
                        min="0"
                        value={increasePercentage}
                        onChange={(e) => setIncreasePercentage(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                {/* Payment Schedule Preview */}
                {paymentSchedule.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-4">Vista Previa del Cronograma de Pagos</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mes</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Vigencia del Monto</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentSchedule.slice(0, 24).map((payment, index) => (
                            <TableRow
                              key={index}
                              className={payment.isIncrease ? "bg-amber-50 dark:bg-amber-950/20" : ""}
                            >
                              <TableCell>
                                {payment.monthName} {payment.year}
                              </TableCell>
                              <TableCell className="font-medium">
                                {currency === "USD" ? "US$" : "$"}
                                {payment.amount.toLocaleString("es-AR")}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {payment.periodStart} → {payment.periodEnd}
                              </TableCell>
                              <TableCell>
                                {payment.isIncrease && (
                                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    Aumento
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {paymentSchedule.length > 24 && (
                      <p className="text-sm text-muted-foreground mt-2 text-center">
                        Mostrando primeros 24 meses de {paymentSchedule.length} totales
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Insurance */}
          <TabsContent value="insurance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Seguro contra Incendio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="hasFireInsurance" checked={hasFireInsurance} onCheckedChange={setHasFireInsurance} />
                  <Label htmlFor="hasFireInsurance">Tiene seguro contra incendio</Label>
                </div>

                {hasFireInsurance && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fireInsuranceCompany">Compañía Aseguradora</Label>
                      <Input
                        id="fireInsuranceCompany"
                        value={fireInsuranceCompany}
                        onChange={(e) => setFireInsuranceCompany(e.target.value)}
                        placeholder="Ej: La Caja Seguros"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fireInsurancePolicy">Número de Póliza</Label>
                      <Input
                        id="fireInsurancePolicy"
                        value={fireInsurancePolicy}
                        onChange={(e) => setFireInsurancePolicy(e.target.value)}
                        placeholder="Ej: POL-123456"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Multas y Penalidades</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="latePaymentFee">Multa por Mora (%)</Label>
                    <Input
                      id="latePaymentFee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={latePaymentFeePercentage}
                      onChange={(e) => setLatePaymentFeePercentage(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="graceDays">Días de Gracia</Label>
                    <Input
                      id="graceDays"
                      type="number"
                      min="0"
                      value={graceDays}
                      onChange={(e) => setGraceDays(Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notas y Cláusulas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="specialClauses">Cláusulas Especiales</Label>
                  <Textarea
                    id="specialClauses"
                    value={specialClauses}
                    onChange={(e) => setSpecialClauses(e.target.value)}
                    rows={3}
                    placeholder="Cláusulas adicionales del contrato..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas Internas</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Notas internas (no aparecen en el contrato)..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Guardando..." : mode === "edit" ? "Actualizar" : "Crear Contrato"}
          </Button>
        </div>
      </div>
    </form>
  )
}
