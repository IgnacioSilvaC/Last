import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, Calendar, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { formatCurrency, calculateNextIncrease, getMonthName } from "@/lib/contract-calculations"
import { ApplyIncreaseButton } from "@/components/apply-increase-button"

export default async function AumentosPage() {
  const supabase = await createClient()

  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  const { data: contracts } = await supabase
    .from("contracts")
    .select(`
      *,
      properties (code, address),
      tenants (full_name)
    `)
    .eq("status", "activo")
    .not("increase_type", "is", null)
    .order("next_increase_date", { ascending: true })

  // Get increases applied this month to filter them out
  const { data: appliedThisMonth } = await supabase
    .from("contract_rent_history")
    .select("contract_id, effective_date")
    .gte("effective_date", `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`)
    .lte("effective_date", `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-31`)

  const appliedContractIds = new Set((appliedThisMonth || []).map((i) => i.contract_id))

  const { data: indices } = await supabase
    .from("price_indices")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(36)

  const { data: appliedIncreases } = await supabase
    .from("contract_rent_history")
    .select(`
      *,
      contracts (contract_number, properties (code))
    `)
    .order("effective_date", { ascending: false })
    .limit(20)

  const pendingIncreases = (contracts || [])
    .filter((contract) => !appliedContractIds.has(contract.id)) // Exclude already applied
    .map((contract) => {
      const calculation = calculateNextIncrease(contract, indices || [])
      if (!calculation) return null

      const increaseDate = calculation.increaseDate
      const isCurrentMonth = increaseDate.getMonth() === currentMonth && increaseDate.getFullYear() === currentYear
      const isOverdue = increaseDate < new Date(currentYear, currentMonth, 1)

      if (!isCurrentMonth && !isOverdue) return null

      return {
        ...calculation,
        contract,
        daysUntil: Math.ceil((increaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        isOverdue,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a!.daysUntil - b!.daysUntil)

  const currentMonthName = getMonthName(currentMonth + 1)

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Gestión de Aumentos</h1>
          <p className="text-muted-foreground">
            Aumentos pendientes para{" "}
            <span className="font-medium text-amber-600">
              {currentMonthName} {currentYear}
            </span>
          </p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {pendingIncreases?.filter((p) => p!.isOverdue).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Aumentos sin aplicar de meses anteriores</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes en {currentMonthName}</CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {pendingIncreases?.filter((p) => !p!.isOverdue).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Aumentos a aplicar este mes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aplicados este mes</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{appliedContractIds.size}</div>
            <p className="text-xs text-muted-foreground">En {currentMonthName}</p>
          </CardContent>
        </Card>
      </div>

      {/* Aumentos Pendientes */}
      <Card className="border-t-4 border-t-amber-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <TrendingUp className="h-5 w-5" />
            Aumentos Pendientes de {currentMonthName} {currentYear}
          </CardTitle>
          <CardDescription>
            Solo contratos que aún no han sido actualizados este mes. Para índices (ICL, IPC, UVA) se suman los valores
            de los meses anteriores según la frecuencia configurada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingIncreases && pendingIncreases.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Contrato</TableHead>
                    <TableHead>Propiedad</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Mes de Aumento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Monto Anterior</TableHead>
                    <TableHead className="text-right">Monto Nuevo</TableHead>
                    <TableHead className="text-right">% Aumento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingIncreases.map((increase) => (
                    <TableRow key={increase!.contract.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <Link href={`/contratos/${increase!.contract.id}`} className="hover:underline text-primary">
                          {increase!.contract.contract_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {increase!.contract.properties?.code || increase!.contract.properties?.address}
                      </TableCell>
                      <TableCell>{increase!.contract.tenants?.full_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{increase!.monthName}</span>
                          <span className="text-xs text-muted-foreground">
                            {increase!.increaseDate.toLocaleDateString("es-AR")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{increase!.increaseType.toUpperCase()}</Badge>
                        {increase!.indexValues.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Suma:{" "}
                            {increase!.indexValues
                              .map((v) => `${getMonthName(v.month).slice(0, 3)} ${v.value}%`)
                              .join(" + ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(increase!.previousRent, increase!.contract.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {formatCurrency(increase!.newRent, increase!.contract.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          +{increase!.percentageApplied.toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {increase!.isOverdue ? (
                          <Badge variant="destructive">Vencido</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500 text-amber-600">
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <ApplyIncreaseButton
                          contractId={increase!.contract.id}
                          previousRent={increase!.previousRent}
                          newRent={increase!.newRent}
                          percentage={increase!.percentageApplied}
                          increaseType={increase!.increaseType}
                          increaseDate={increase!.increaseDate.toISOString().split("T")[0]}
                          indexValues={increase!.indexValues}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-green-600 font-medium">¡Todos los aumentos de {currentMonthName} están al día!</p>
              <p className="text-sm">No hay aumentos pendientes para este mes.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial */}
      <Card className="border-t-4 border-t-green-500">
        <CardHeader>
          <CardTitle className="text-green-600">Historial de Aumentos Aplicados</CardTitle>
          <CardDescription>Últimos 20 aumentos registrados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {appliedIncreases && appliedIncreases.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Monto Anterior</TableHead>
                    <TableHead className="text-right">Monto Nuevo</TableHead>
                    <TableHead className="text-right">% Aplicado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appliedIncreases.map((increase) => (
                    <TableRow key={increase.id} className="hover:bg-muted/30">
                      <TableCell>
                        {new Date(increase.effective_date + "T12:00:00").toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {increase.contracts?.contract_number} - {increase.contracts?.properties?.code}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{increase.increase_type?.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(increase.previous_rent).toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(increase.new_rent).toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          +{Number(increase.increase_percentage).toFixed(2)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay aumentos aplicados aún</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
