"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PasswordInputProps extends React.ComponentPropsWithoutRef<typeof Input> {
  label?: string
  helperText?: string
  error?: string | null
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    return (
      <div className="space-y-2">
        {label ? <Label htmlFor={id}>{label}</Label> : null}
        <div className="relative">
          <Input
            id={id}
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={cn("pr-12", className)}
            aria-invalid={Boolean(error)}
            aria-errormessage={error ? `${id}-error` : undefined}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition hover:text-foreground"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
        {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
        {error ? (
          <p className="text-xs text-destructive" id={`${id}-error`} role="alert" aria-live="polite">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)
PasswordInput.displayName = "PasswordInput"
