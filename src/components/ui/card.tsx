import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)]",
  {
    variants: {
      variant: {
        /** Resting card — the default surface almost everywhere. */
        surface: "shadow-[var(--shadow-sm)]",
        /** Raised card — sticky summaries, dropdown panels, feature cards. */
        elevated: "shadow-[var(--shadow-md)]",
        /** Card that is itself a link/button target: raises one elevation step on hover. */
        interactive:
          "shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-md)] focus-within:shadow-[var(--shadow-md)]",
        /** Hairline only — dense admin contexts where shadows would stack noisily. */
        flat: "shadow-none",
      },
      padding: {
        none: "",
        sm: "p-4",
        md: "p-5 sm:p-6",
        lg: "p-6 sm:p-8",
      },
    },
    defaultVariants: {
      variant: "surface",
      padding: "md",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

/** Shared card surface. Server-safe — no state, no handlers. */
export function Card({ className, variant, padding, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant, padding, className }))} {...props} />
}

export { cardVariants }
