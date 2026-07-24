import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options: { value: string; label: string }[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          <select
            className={cn(
              "flex h-12 w-full appearance-none rounded-[var(--radius-sm)] border-2 bg-[var(--paper-card)] px-4 py-3 pr-10 text-base transition-[border-color,box-shadow] duration-[var(--dur-fast)]",
              "text-[var(--ink)]",
              "focus:outline-none focus:border-[var(--ink-70)] focus:shadow-[0_0_0_4px_var(--foil-soft)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-[var(--ink)] aria-invalid:border-[var(--ink)]"
                : "border-[var(--foil-soft)]",
              className
            )}
            aria-invalid={!!error}
            ref={ref}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--ink-40)] pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-[var(--ink)] font-medium">{error}</p>
        )}
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
