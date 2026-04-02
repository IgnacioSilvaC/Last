import type { CurrencyType, PriceIndex } from "./types"

export interface ContractForCalculation {
  id: string
  contract_number?: string
  start_date: string
  end_date: string
  monthly_rent: number
  current_rent_amount?: number | null
  currency: string
  increase_type?: string | null
  increase_percentage?: number | null
  increase_fixed_amount?: number | null
  increase_frequency_months?: number | null
  next_increase_date?: string | null
  payment_day?: number
  late_payment_penalty_percentage?: number
  late_payment_grace_days?: number
}

export interface IncreaseCalculation {
  contractId: string
  increaseDate: Date
  previousRent: number
  newRent: number
  percentageApplied: number
  increaseType: string
  indexValues: { month: number; year: number; value: number }[]
  monthName: string
  missingIndices?: { month: number; year: number }[]
}

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export function getMonthName(month: number): string {
  return monthNames[month - 1] || ""
}

// Redondeo financiero seguro (evita acumulación de error de punto flotante)
function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateIncreaseFromIndices(
  currentRent: number,
  increaseDate: Date,
  frequencyMonths: number,
  indexType: string,
  indices: PriceIndex[],
): IncreaseCalculation | null {
  const indicesUsed: { month: number; year: number; value: number }[] = []
  const missingIndices: { month: number; year: number }[] = []
  let totalPercentage = 0

  for (let i = 1; i <= frequencyMonths; i++) {
    const targetDate = new Date(increaseDate)
    targetDate.setMonth(targetDate.getMonth() - i)

    const targetMonth = targetDate.getMonth() + 1
    const targetYear = targetDate.getFullYear()

    const index = indices.find(
      (idx) =>
        idx.index_type.toUpperCase() === indexType.toUpperCase() &&
        idx.year === targetYear &&
        idx.month === targetMonth,
    )

    if (index) {
      indicesUsed.push({
        month: targetMonth,
        year: targetYear,
        value: Number(index.value),
      })
      totalPercentage += Number(index.value)
    } else {
      missingIndices.push({ month: targetMonth, year: targetYear })
    }
  }

  if (indicesUsed.length === 0) {
    return null
  }

  const newRent = roundCurrency(currentRent * (1 + totalPercentage / 100))

  return {
    contractId: "",
    increaseDate,
    previousRent: currentRent,
    newRent,
    percentageApplied: roundCurrency(totalPercentage),
    increaseType: indexType,
    indexValues: indicesUsed,
    monthName: getMonthName(increaseDate.getMonth() + 1),
    missingIndices: missingIndices.length > 0 ? missingIndices : undefined,
  }
}

export function calculateNextIncrease(
  contract: ContractForCalculation,
  indices: PriceIndex[],
): IncreaseCalculation | null {
  if (!contract.increase_type || contract.increase_type === "none") {
    return null
  }

  const currentRent = contract.current_rent_amount || contract.monthly_rent
  const frequencyMonths = contract.increase_frequency_months || 12

  let nextIncreaseDate: Date
  if (contract.next_increase_date) {
    nextIncreaseDate = new Date(contract.next_increase_date + "T12:00:00")
  } else {
    const startDate = new Date(contract.start_date + "T12:00:00")
    nextIncreaseDate = new Date(startDate)
    nextIncreaseDate.setMonth(nextIncreaseDate.getMonth() + frequencyMonths)
  }

  // Si es porcentaje fijo
  if (contract.increase_type === "porcentaje" && contract.increase_percentage) {
    const percentage = contract.increase_percentage
    const newRent = roundCurrency(currentRent * (1 + percentage / 100))

    return {
      contractId: contract.id,
      increaseDate: nextIncreaseDate,
      previousRent: currentRent,
      newRent,
      percentageApplied: percentage,
      increaseType: "porcentaje",
      indexValues: [],
      monthName: getMonthName(nextIncreaseDate.getMonth() + 1),
    }
  }

  // Si es monto fijo
  if (contract.increase_type === "fijo" && contract.increase_fixed_amount) {
    const newRent = roundCurrency(currentRent + contract.increase_fixed_amount)
    const percentage = roundCurrency((contract.increase_fixed_amount / currentRent) * 100)

    return {
      contractId: contract.id,
      increaseDate: nextIncreaseDate,
      previousRent: currentRent,
      newRent,
      percentageApplied: percentage,
      increaseType: "fijo",
      indexValues: [],
      monthName: getMonthName(nextIncreaseDate.getMonth() + 1),
    }
  }

  // Si es por índice (ICL, IPC, UVA)
  if (["icl", "ipc", "uva"].includes(contract.increase_type.toLowerCase())) {
    const calculation = calculateIncreaseFromIndices(
      currentRent,
      nextIncreaseDate,
      frequencyMonths,
      contract.increase_type,
      indices,
    )

    if (calculation) {
      calculation.contractId = contract.id
      return calculation
    }
  }

  return null
}

export function generateIncreaseSchedule(
  contract: ContractForCalculation,
  indices: PriceIndex[],
): IncreaseCalculation[] {
  const schedule: IncreaseCalculation[] = []

  if (!contract.increase_type || contract.increase_type === "none") {
    return schedule
  }

  const startDate = new Date(contract.start_date + "T12:00:00")
  const endDate = new Date(contract.end_date + "T12:00:00")
  const frequencyMonths = contract.increase_frequency_months || 12

  let currentRent = contract.monthly_rent
  const currentDate = new Date(startDate)
  currentDate.setMonth(currentDate.getMonth() + frequencyMonths)

  while (currentDate <= endDate) {
    let calculation: IncreaseCalculation | null = null

    if (contract.increase_type === "porcentaje" && contract.increase_percentage) {
      const percentage = contract.increase_percentage
      const newRent = roundCurrency(currentRent * (1 + percentage / 100))

      calculation = {
        contractId: contract.id,
        increaseDate: new Date(currentDate),
        previousRent: currentRent,
        newRent,
        percentageApplied: percentage,
        increaseType: "porcentaje",
        indexValues: [],
        monthName: getMonthName(currentDate.getMonth() + 1),
      }
      currentRent = newRent
    } else if (contract.increase_type === "fijo" && contract.increase_fixed_amount) {
      const newRent = roundCurrency(currentRent + contract.increase_fixed_amount)
      calculation = {
        contractId: contract.id,
        increaseDate: new Date(currentDate),
        previousRent: currentRent,
        newRent,
        percentageApplied: roundCurrency((contract.increase_fixed_amount / currentRent) * 100),
        increaseType: "fijo",
        indexValues: [],
        monthName: getMonthName(currentDate.getMonth() + 1),
      }
      currentRent = newRent
    } else if (["icl", "ipc", "uva"].includes(contract.increase_type!.toLowerCase())) {
      calculation = calculateIncreaseFromIndices(
        currentRent,
        new Date(currentDate),
        frequencyMonths,
        contract.increase_type!,
        indices,
      )

      if (calculation) {
        calculation.contractId = contract.id
        currentRent = calculation.newRent
      }
    }

    if (calculation) {
      schedule.push(calculation)
    }

    currentDate.setMonth(currentDate.getMonth() + frequencyMonths)
  }

  return schedule
}

// Formatear moneda
export function formatCurrency(amount: number, currency: CurrencyType | string): string {
  const symbols: Record<string, string> = {
    USD: "US$",
    ARS: "$",
    MXN: "MX$",
  }

  return `${symbols[currency] || "$"} ${amount.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// Calcular días hasta próximo vencimiento (negativo = ya venció)
export function daysUntilDue(dueDate: Date | string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = typeof dueDate === "string" ? new Date(dueDate + "T12:00:00") : new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffTime = due.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function contractNeedsIncrease(contract: ContractForCalculation): boolean {
  if (!contract.increase_type || contract.increase_type === "none") {
    return false
  }

  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  if (contract.next_increase_date) {
    const nextIncrease = new Date(contract.next_increase_date + "T12:00:00")
    return nextIncrease.getMonth() === currentMonth && nextIncrease.getFullYear() === currentYear
  }

  return false
}

export function getContractsNeedingIncrease(
  contracts: ContractForCalculation[],
  daysAhead = 30,
): ContractForCalculation[] {
  const today = new Date()
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + daysAhead)

  return contracts.filter((contract) => {
    if (!contract.increase_type || contract.increase_type === "none") {
      return false
    }

    if (contract.next_increase_date) {
      const nextIncrease = new Date(contract.next_increase_date + "T12:00:00")
      return nextIncrease >= today && nextIncrease <= futureDate
    }

    return false
  })
}

// Calcular interés sobre saldo insoluto (para frontend preview)
// Fórmula: Interés del período = Saldo pendiente x Tasa diaria x Días de atraso
export function calculateInterestOnBalance(
  pendingAmount: number,
  dailyRate: number,
  daysOverdue: number,
): number {
  if (pendingAmount <= 0 || dailyRate <= 0 || daysOverdue <= 0) return 0
  return roundCurrency(pendingAmount * dailyRate * daysOverdue)
}

// Calcular penalidad por mora
export function calculateLateFee(
  pendingAmount: number,
  penaltyPercentage: number,
  daysOverdue: number,
  graceDays: number,
): number {
  if (pendingAmount <= 0 || penaltyPercentage <= 0) return 0
  const effectiveDays = daysOverdue - graceDays
  if (effectiveDays <= 0) return 0
  // Penalidad = saldo pendiente * (% penalidad / 30) * días efectivos de mora
  return roundCurrency(pendingAmount * (penaltyPercentage / 100 / 30) * effectiveDays)
}
