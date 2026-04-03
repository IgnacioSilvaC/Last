import { GuarantorForm } from "@/components/guarantor-form"

export default function NewGuarantorPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Garante</h1>
        <p className="text-muted-foreground">Registra un nuevo garante o aval</p>
      </div>

      <GuarantorForm />
    </div>
  )
}
