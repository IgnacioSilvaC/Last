"use client"

import { useRouter, usePathname } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const months = [
  { value: 1, label: "Enero" }, { value: 2, label: "Febrero" }, { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" }, { value: 5, label: "Mayo" }, { value: 6, label: "Junio" },
  { value: 7, label: "Julio" }, { value: 8, label: "Agosto" }, { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" }, { value: 11, label: "Noviembre" }, { value: 12, label: "Diciembre" },
]

const currentYear = new Date().getFullYear()
const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]

interface Props {
  selectedMonth: number
  selectedYear: number
  bankAccounts: { id: string; bank_name: string; alias?: string | null }[]
}

export function CommissionsFilters({ selectedMonth, selectedYear }: Props) {
  const router   = useRouter()
  const pathname = usePathname()

  const navigate = (month: number, year: number) => {
    router.push(`${pathname}?month=${month}&year=${year}`)
  }

  return (
    <div className="flex gap-2 items-center">
      <Select
        value={String(selectedMonth)}
        onValueChange={(v) => navigate(Number(v), selectedYear)}
      >
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(selectedYear)}
        onValueChange={(v) => navigate(selectedMonth, Number(v))}
      >
        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
