import { LandlordForm } from "@/components/landlord-form"

export default function NewLandlordPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Arrendador</h1>
        <p className="text-muted-foreground">Registra un nuevo propietario en el sistema</p>
      </div>

      <LandlordForm />
    </div>
  )
}
