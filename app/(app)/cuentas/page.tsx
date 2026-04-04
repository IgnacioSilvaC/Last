import { createClient } from "@/lib/supabase/server"
import { BankAccountsManager } from "@/components/bank-accounts-manager"

export default async function CuentasPage() {
  const supabase = await createClient()
  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("is_active", true)
    .order("bank_name")

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cuentas Bancarias</h1>
        <p className="text-muted-foreground">
          Administrá las cuentas donde se reciben los pagos. Al registrar una transferencia podrás indicar a qué cuenta ingresó.
        </p>
      </div>
      <BankAccountsManager accounts={accounts || []} />
    </div>
  )
}
