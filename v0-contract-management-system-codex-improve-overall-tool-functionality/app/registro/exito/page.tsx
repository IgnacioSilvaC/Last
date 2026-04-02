import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MailCheck } from "lucide-react"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <MailCheck className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">¡Cuenta Creada!</CardTitle>
            <CardDescription>Revisa tu correo electrónico</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Te hemos enviado un correo de confirmación. Por favor, verifica tu email haciendo clic en el enlace que te
              enviamos para activar tu cuenta.
            </p>
            <div className="space-y-2">
              <p className="text-center text-xs text-muted-foreground">
                ¿No recibiste el correo? Revisa tu carpeta de spam.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href="/login">Ir al Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
