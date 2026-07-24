import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Loading placeholder that matches the final layout (no spinners — CLS rule in
 * src/components/CLAUDE.md). Shimmer pauses under prefers-reduced-motion via
 * the global kill-switch in tokens.css.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-shimmer rounded-[var(--radius-sm)]", className)}
      {...props}
    />
  )
}
