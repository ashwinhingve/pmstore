import * as React from "react"
import { cn } from "@/lib/utils"
import { Phone } from "lucide-react"

export interface PhoneInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-40)]">
            <Phone className="w-5 h-5" />
          </div>
          <input
            type="tel"
            className={cn(
              "flex h-12 w-full rounded-[var(--radius-sm)] border-2 bg-[var(--paper-card)] pl-12 pr-4 py-3 text-base transition-[border-color,box-shadow] duration-[var(--dur-fast)]",
              "placeholder:text-[var(--ink-40)]",
              "focus:outline-none focus:border-[var(--brand)] focus:shadow-[0_0_0_4px_var(--brand-soft)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-[var(--ink)] aria-invalid:border-[var(--ink)]"
                : "border-[var(--foil-soft)]",
              className
            )}
            aria-invalid={!!error}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-[var(--ink)] font-medium">{error}</p>
        )}
      </div>
    )
  }
)
PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
