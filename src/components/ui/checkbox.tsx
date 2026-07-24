import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              className="peer sr-only"
              aria-invalid={!!error}
              ref={ref}
              {...props}
            />
            <div
              className={cn(
                "w-5 h-5 rounded border-2 transition-all duration-[var(--dur-fast)] flex items-center justify-center",
                "peer-checked:bg-[var(--mint)] peer-checked:border-[var(--mint)]",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--ink)] peer-focus-visible:outline-offset-2",
                error
                  ? "border-[var(--ink)]"
                  : "border-[var(--foil-soft)] group-hover:border-[var(--ink)]",
                className
              )}
            >
              <Check className="w-3.5 h-3.5 text-[var(--paper-card)] opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
          </div>
          {label && (
            <span className="text-sm text-[var(--ink-70)] leading-tight select-none">
              {label}
            </span>
          )}
        </label>
        {error && (
          <p className="mt-1.5 text-sm text-[var(--ink)] font-medium">{error}</p>
        )}
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
