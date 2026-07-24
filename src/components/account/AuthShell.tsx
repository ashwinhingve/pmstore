import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Shared chrome for the auth pages (login, sign out, auth error).
 * Flat --paper background and a token-based card — no gradients, no legacy
 * amber/red. See docs/03-DESIGN-SYSTEM.md.
 */
export function AuthShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--paper-tint)] px-4 py-12">
      <div className={cn("w-full max-w-md", className)}>{children}</div>
    </div>
  )
}

export function AuthCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-md)]",
        className
      )}
    >
      {children}
    </div>
  )
}
