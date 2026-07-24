import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-12 w-full rounded-[var(--radius-sm)] border-2 bg-[var(--paper-card)] px-4 py-3 text-base transition-all duration-200",
            "placeholder:text-[var(--ink-40)]",
            "focus:outline-none",
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
        {error && (
          <p className="mt-1.5 text-sm text-[var(--ink)] font-medium">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
