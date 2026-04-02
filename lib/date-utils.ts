// Utilidades para manejo de fechas en zona local (evitar problemas UTC)

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD sin conversión UTC
 */
export function getTodayLocalString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Convierte un string de fecha YYYY-MM-DD a Date en zona local
 * Agrega T12:00:00 para evitar problemas de zona horaria
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  return new Date(dateStr + "T12:00:00")
}

/**
 * Convierte una Date a string YYYY-MM-DD en zona local
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Formatea una fecha para mostrar al usuario en formato DD/MM/YYYY
 * Acepta string YYYY-MM-DD o Date
 */
export function formatDateDisplay(dateStr: string | Date): string {
  if (!dateStr) return ""
  if (typeof dateStr === "string") {
    const date = parseLocalDate(dateStr)
    return date.toLocaleDateString("es-AR")
  }
  return dateStr.toLocaleDateString("es-AR")
}

/**
 * Obtiene el primer día del mes actual
 */
export function getFirstDayOfCurrentMonth(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
}

/**
 * Obtiene el último día del mes actual
 */
export function getLastDayOfCurrentMonth(): string {
  const today = new Date()
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return formatDateForInput(lastDay)
}

/**
 * Obtiene el nombre del mes a partir del número (1-12)
 */
export function getMonthName(month: number): string {
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

/**
 * Calcula la fecha del próximo aumento basado en la frecuencia
 */
export function calculateNextIncreaseDate(startDate: string, frequencyMonths: number, fromDate?: string): string {
  const start = parseLocalDate(startDate)
  const reference = fromDate ? parseLocalDate(fromDate) : new Date()

  const nextIncrease = new Date(start)
  nextIncrease.setMonth(nextIncrease.getMonth() + frequencyMonths)

  while (nextIncrease <= reference) {
    nextIncrease.setMonth(nextIncrease.getMonth() + frequencyMonths)
  }

  return formatDateForInput(nextIncrease)
}

/**
 * Obtiene el período de vigencia del precio actual
 */
export function getPriceValidityPeriod(
  startDate: string,
  frequencyMonths: number,
  referenceDate?: string,
): { from: string; to: string } {
  const start = parseLocalDate(startDate)
  const reference = referenceDate ? parseLocalDate(referenceDate) : new Date()

  // Encontrar el inicio del período actual
  const periodStart = new Date(start)
  const periodEnd = new Date(start)
  periodEnd.setMonth(periodEnd.getMonth() + frequencyMonths)
  periodEnd.setDate(periodEnd.getDate() - 1) // Último día antes del aumento

  while (periodEnd < reference) {
    periodStart.setMonth(periodStart.getMonth() + frequencyMonths)
    periodEnd.setMonth(periodEnd.getMonth() + frequencyMonths)
  }

  return {
    from: formatDateForInput(periodStart),
    to: formatDateForInput(periodEnd),
  }
}
