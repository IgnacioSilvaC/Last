import { TenantForm } from "@/components/tenant-form"

export default function NewTenantPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Arrendatario</h1>
        <p className="text-muted-foreground">Registra un nuevo arrendatario en el sistema</p>
      </div>

      <TenantForm />
    </div>
  )
}
