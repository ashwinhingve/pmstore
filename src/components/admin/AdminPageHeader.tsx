import * as React from "react"

import { cn } from "@/lib/utils"

interface AdminPageHeaderProps {
  title: string
  /** Plain text, or rich content (e.g. a count in `--font-data`) via ReactNode. */
  description?: React.ReactNode
  /** Optional actions (buttons, filters) pinned to the right of the title. */
  children?: React.ReactNode
  className?: string
}

/**
 * Consistent premium page header for admin screens — display title + supporting
 * line + optional actions slot. Replaces hand-rolled `text-2xl` headings so
 * every admin page reads the same.
 */
export function AdminPageHeader({ title, description, children, className }: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-extrabold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[length:var(--step-0)] text-[var(--ink-70)]">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  )
}
