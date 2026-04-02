import { PropertyForm } from "@/components/property-form"

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nueva Propiedad</h1>
        <p className="text-muted-foreground">Registra una nueva propiedad en el sistema</p>
      </div>

      <PropertyForm />
    </div>
  )
}
