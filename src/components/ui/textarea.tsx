import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            "flex min-h-[120px] w-full rounded-[var(--radius-sm)] border-2 bg-[var(--paper-card)] px-4 py-3 text-base transition-[border-color,box-shadow] duration-[var(--dur-fast)]",
            "placeholder:text-[var(--ink-40)]",
            "focus:outline-none focus:border-[var(--brand)] focus:shadow-[0_0_0_4px_var(--brand-soft)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-y",
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
Textarea.displayName = "Textarea"

export { Textarea }
