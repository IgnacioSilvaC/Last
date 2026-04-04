"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Loader2, Building } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAgency } from "@/hooks/use-agency"
import { useRouter } from "next/navigation"
import type { BankAccount } from "@/lib/types"

const accountTypeLabels: Record<BankAccount["account_type"], string> = {
  caja_ahorro: "Caja de Ahorro",
  corriente:   "Cuenta Corriente",
  virtual:     "Cuenta Virtual (CVU)",
  otro:        "Otro",
}

interface BankAccountFormData {
  bank_name: string
  account_holder: string
  account_type: BankAccount["account_type"]
  cbu: string
  alias: string
  currency: string
  description: string
}

const emptyForm: BankAccountFormData = {
  bank_name:       "",
  account_holder:  "",
  account_type:    "caja_ahorro",
  cbu:             "",
  alias:           "",
  currency:        "ARS",
  description:     "",
}

interface Props {
  accounts: BankAccount[]
}

export function BankAccountsManager({ accounts: initialAccounts }: Props) {
  const router = useRouter()
  const { agency } = useAgency()
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts)
  const [open, setOpen]         = useState(false)
  const [editing, setEditing]   = useState<BankAccount | null>(null)
  const [form, setForm]         = useState<BankAccountFormData>(emptyForm)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setOpen(true)
  }

  const openEdit = (account: BankAccount) => {
    setEditing(account)
    setForm({
      bank_name:      account.bank_name,
      account_holder: account.account_holder,
      account_type:   account.account_type,
      cbu:            account.cbu || "",
      alias:          account.alias || "",
      currency:       account.currency,
      description:    account.description || "",
    })
    setError(null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!agency?.id) return
    if (!form.bank_name.trim() || !form.account_holder.trim()) {
      setError("Banco y titular son obligatorios.")
      return
    }

    setIsLoading(true)
    setError(null)
    const supabase = createClient()

    const payload = {
      agency_id:       agency.id,
      bank_name:       form.bank_name.trim(),
      account_holder:  form.account_holder.trim(),
      account_type:    form.account_type,
      cbu:             form.cbu.trim() || null,
      alias:           form.alias.trim() || null,
      currency:        form.currency,
      description:     form.description.trim() || null,
    }

    try {
      if (editing) {
        const { data, error: err } = await supabase
          .from("bank_accounts")
          .update(payload)
          .eq("id", editing.id)
          .select()
          .single()
        if (err) throw err
        setAccounts((prev) => prev.map((a) => (a.id === editing.id ? data : a)))
      } else {
        const { data, error: err } = await supabase
          .from("bank_accounts")
          .insert(payload)
          .select()
          .single()
        if (err) throw err
        setAccounts((prev) => [...prev, data])
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta cuenta? Los pagos asociados perderán la referencia.")) return
    setDeletingId(id)
    const supabase = createClient()
    const { error: err } = await supabase.from("bank_accounts").delete().eq("id", id)
    if (err) {
      alert("Error: " + err.message)
    } else {
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    }
    setDeletingId(null)
  }

  const set = (field: keyof BankAccountFormData) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Cuentas Bancarias</CardTitle>
          <CardDescription>Cuentas donde se reciben los pagos de alquiler y comisiones</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cuenta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Cuenta" : "Nueva Cuenta Bancaria"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2 col-span-2">
                  <Label>Banco *</Label>
                  <Input value={form.bank_name} onChange={(e) => set("bank_name")(e.target.value)} placeholder="Ej: Banco Galicia" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Titular de la cuenta *</Label>
                  <Input value={form.account_holder} onChange={(e) => set("account_holder")(e.target.value)} placeholder="Nombre completo o razón social" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de cuenta</Label>
                  <Select value={form.account_type} onValueChange={set("account_type")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(accountTypeLabels) as [BankAccount["account_type"], string][]).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={form.currency} onValueChange={set("currency")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>CBU / CVU</Label>
                  <Input value={form.cbu} onChange={(e) => set("cbu")(e.target.value)} placeholder="22 dígitos" maxLength={22} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Alias</Label>
                  <Input value={form.alias} onChange={(e) => set("alias")(e.target.value)} placeholder="Ej: INMOBILIARIA.PAGOS" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Descripción / uso</Label>
                  <Input value={form.description} onChange={(e) => set("description")(e.target.value)} placeholder="Ej: Cuenta para recibir alquileres USD" />
                </div>
              </div>
              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? "Guardar cambios" : "Crear cuenta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Building className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No hay cuentas registradas.</p>
            <p className="text-sm">Agregá una cuenta para poder vincularla a los pagos por transferencia.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Titular</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>CBU / Alias</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.bank_name}</TableCell>
                  <TableCell>{account.account_holder}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{accountTypeLabels[account.account_type]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {account.cbu && <div>{account.cbu}</div>}
                    {account.alias && <div className="font-medium">{account.alias}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{account.currency}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(account)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(account.id)}
                        disabled={deletingId === account.id}
                      >
                        {deletingId === account.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
