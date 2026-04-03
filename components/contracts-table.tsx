"use client"

import type { Contract } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Eye, Pencil, Trash2, AlertTriangle, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState, useMemo } from "react"
import {
  formatDateDisplay,
  parseLocalDate,
  getMonthName,
  calculateNextIncreaseDate,
  getPriceValidityPeriod,
} from "@/lib/date-utils"

const statusColors: Record<string, string> = {
  activo: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
  borrador: "bg-gray-500/10 text-gray-600 hover:bg-gray-500/20",
  finalizado: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
  cancelado: "bg-red-500/10 text-red-600 hover:bg-red-500/20",
  renovado: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20",
}

const statusLabels: Record<string, string> = {
  activo: "Activo",
  borrador: "Borrador",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  renovado: "Renovado",
}

interface ContractWithRelations extends Contract {
  properties?: { code?: string; address?: string } | null
  tenants?: { full_name?: string } | null
  landlords?: { full_name?: string } | null
}

export function ContractsTable({ contracts }: { contracts: ContractWithRelations[] }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    contract: "",
    property: "",
    tenant: "",
    status: "",
  })

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (filters.contract && !c.contract_number?.toLowerCase().includes(filters.contract.toLowerCase())) return false
      if (
        filters.property &&
        !c.properties?.code?.toLowerCase().includes(filters.property.toLowerCase()) &&
        !c.properties?.address?.toLowerCase().includes(filters.property.toLowerCase())
      )
        return false
      if (filters.tenant && !c.tenants?.full_name?.toLowerCase().includes(filters.tenant.toLowerCase())) return false
      if (filters.status && c.status !== filters.status) return false
      return true
    })
  }, [contracts, filters])

  const handleDelete = async (id: string, propertyId?: string | null) => {
    if (!confirm("¿Estás seguro de eliminar este contrato? La propiedad asociada se marcará como disponible.")) return

    setDeletingId(id)
    const supabase = createClient()

    const { error } = await supabase.from("contracts").delete().eq("id", id)

    if (error) {
      alert("Error al eliminar: " + error.message)
    } else {
      if (propertyId) {
        await supabase.from("properties").update({ status: "disponible" }).eq("id", propertyId)
      }
      router.refresh()
    }
    setDeletingId(null)
  }

  if (contracts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No hay contratos registrados</p>
        <Button asChild className="mt-4">
          <Link href="/contratos/nuevo">Crear Primer Contrato</Link>
        </Button>
      </Card>
    )
  }

  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b bg-muted/30 flex flex-wrap gap-3 items-center">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar por contrato..."
          value={filters.contract}
          onChange={(e) => setFilters({ ...filters, contract: e.target.value })}
          className="w-36 h-8"
        />
        <Input
          placeholder="Filtrar por propiedad..."
          value={filters.property}
          onChange={(e) => setFilters({ ...filters, property: e.target.value })}
          className="w-36 h-8"
        />
        <Input
          placeholder="Filtrar por inquilino..."
          value={filters.tenant}
          onChange={(e) => setFilters({ ...filters, tenant: e.target.value })}
          className="w-36 h-8"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="borrador">Borrador</option>
          <option value="finalizado">Finalizado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        {(filters.contract || filters.property || filters.tenant || filters.status) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ contract: "", property: "", tenant: "", status: "" })}
          >
            Limpiar
          </Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">{filteredContracts.length} contratos</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>No. Contrato</TableHead>
              <TableHead>Propiedad</TableHead>
              <TableHead>Inquilino</TableHead>
              <TableHead>Alquiler mensual</TableHead>
              <TableHead>Administración</TableHead>
              <TableHead>Vigencia Precio</TableHead>
              <TableHead>Próx. Aumento</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContracts.map((contract) => {
              const frequencyMonths = contract.increase_frequency_months || 12
              const hasIncreaseType = !!contract.increase_type

              let priceValidFrom = contract.start_date
              let priceValidTo = ""
              let nextIncreaseDate = ""

              if (hasIncreaseType && contract.start_date) {
                const validity = getPriceValidityPeriod(contract.start_date, frequencyMonths)
                priceValidFrom = validity.from
                priceValidTo = validity.to
                nextIncreaseDate = calculateNextIncreaseDate(contract.start_date, frequencyMonths)
              }

              const adminFee = contract.admin_fee_percentage
                ? (Number(contract.monthly_rent) * Number(contract.admin_fee_percentage)) / 100
                : 0

              const endDate = parseLocalDate(contract.end_date)
              const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0
              const isExpired = daysUntilExpiry <= 0

              const nextIncDate = nextIncreaseDate ? parseLocalDate(nextIncreaseDate) : null
              const isIncreaseThisMonth =
                nextIncDate && nextIncDate.getMonth() === currentMonth && nextIncDate.getFullYear() === currentYear

              const isIncreasePending = nextIncDate && nextIncDate <= today

              return (
                <TableRow
                  key={contract.id}
                  className={isExpiringSoon || isExpired ? "bg-red-50 dark:bg-red-950/20" : "hover:bg-muted/30"}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {contract.contract_number || "-"}
                      {(isExpiringSoon || isExpired) && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="truncate font-medium">{contract.properties?.code || "-"}</p>
                      <p className="truncate text-sm text-muted-foreground">{contract.properties?.address || "-"}</p>
                    </div>
                  </TableCell>
                  <TableCell>{contract.tenants?.full_name || "-"}</TableCell>
                  <TableCell className="font-medium">
                    {contract.currency === "USD" ? "USD " : "$ "}
                    {Number(contract.monthly_rent || 0).toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell>
                    {adminFee > 0 ? (
                      <div>
                        <p className="font-medium text-emerald-600">
                          {contract.currency === "USD" ? "USD " : "$ "}
                          {adminFee.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">({contract.admin_fee_percentage}%)</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {hasIncreaseType && priceValidFrom ? (
                      <div className={`text-sm ${isIncreasePending ? "text-red-600 font-medium" : ""}`}>
                        <p>{formatDateDisplay(priceValidFrom)}</p>
                        {priceValidTo && (
                          <p className={isIncreasePending ? "text-red-500" : "text-muted-foreground"}>
                            → {formatDateDisplay(priceValidTo)}
                          </p>
                        )}
                        {isIncreasePending && (
                          <Badge variant="destructive" className="mt-1 text-xs">
                            ¡Pendiente!
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin aumentos</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {hasIncreaseType && nextIncreaseDate ? (
                      <div className="text-sm">
                        <Badge
                          variant={isIncreaseThisMonth ? "default" : "outline"}
                          className={isIncreaseThisMonth ? "bg-amber-500 text-white" : ""}
                        >
                          {getMonthName(parseLocalDate(nextIncreaseDate).getMonth() + 1)}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {contract.increase_type?.toUpperCase()} c/{frequencyMonths}m
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className={isExpiringSoon || isExpired ? "text-red-600 font-medium" : ""}>
                        {formatDateDisplay(contract.end_date)}
                      </p>
                      {isExpired && (
                        <Badge variant="destructive" className="mt-1">
                          VENCIDO
                        </Badge>
                      )}
                      {isExpiringSoon && (
                        <Badge variant="destructive" className="mt-1 animate-pulse">
                          {daysUntilExpiry} días
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[contract.status] || ""}>
                      {statusLabels[contract.status] || contract.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/contratos/${contract.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/contratos/${contract.id}/editar`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(contract.id, contract.property_id)}
                        disabled={deletingId === contract.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
