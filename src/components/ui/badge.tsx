import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Status pill. Colour vocabulary is deliberately narrow (design system):
 * mint = positive, neutral foil = in-progress/secondary, solid ink = a hard
 * negative. `--rx` red is reserved for prescription flags ONLY — never for a
 * failed payment, a cancelled order or a sale. Use `variant="rx"` only on a
 * Schedule H/H1/X marker.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-semibold capitalize [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--foil-soft)] text-[var(--ink-70)]",
        success: "bg-[var(--mint-soft)] text-[var(--mint)]",
        strong: "bg-[var(--ink)] text-[var(--paper-card)]",
        outline: "border border-[var(--foil)] text-[var(--ink-70)]",
        rx: "bg-[var(--rx-soft)] text-[var(--rx)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
)

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/** Shared status pill. Server-safe — no state, no handlers. */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}

const SUCCESS = new Set([
  "paid", "success", "successful", "delivered", "completed", "complete", "active",
  "confirmed", "approved", "verified", "shipped", "dispatched", "in_transit",
  "out_for_delivery", "fulfilled",
])
const NEGATIVE = new Set([
  "cancelled", "canceled", "failed", "rejected", "declined", "returned", "expired",
])

/**
 * Maps a status string to a Badge variant. Never returns `rx` — prescription
 * red is set explicitly on Rx markers, not inferred from a status. Anything not
 * clearly positive or negative (pending, processing, refunded…) reads neutral.
 */
export function statusBadgeVariant(status?: string): BadgeVariant {
  const s = (status ?? "").toLowerCase().trim().replace(/\s+/g, "_")
  if (SUCCESS.has(s)) return "success"
  if (NEGATIVE.has(s)) return "strong"
  return "neutral"
}

export { badgeVariants }
