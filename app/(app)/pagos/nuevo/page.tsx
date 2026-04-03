import { PaymentForm } from "@/components/payment-form"

export default function NewPaymentPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registrar Pago</h1>
        <p className="text-muted-foreground">Registra un nuevo pago de renta</p>
      </div>

      <PaymentForm />
    </div>
  )
}
