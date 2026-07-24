"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

export interface DrawerProps {
  open: boolean
  onClose: () => void
  /** Accessible name for the dialog, rendered in the header. */
  title: string
  side?: "left" | "right"
  children: React.ReactNode
  className?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Slide-in panel used for mobile nav, product filters and the admin sidebar.
 * Owns the scrim, focus trap, Escape-to-close and body scroll lock so callers
 * only provide content.
 */
export function Drawer({ open, onClose, title, side = "left", children, className }: DrawerProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  const reduceMotion = useReducedMotion()

  // Body scroll lock + focus management
  React.useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== "Tab" || !panelRef.current) return
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const offscreen = side === "left" ? "-100%" : "100%"

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" onKeyDown={onKeyDown}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="absolute inset-0 bg-[var(--ink)]/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ x: reduceMotion ? 0 : offscreen, opacity: reduceMotion ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduceMotion ? 0 : offscreen, opacity: reduceMotion ? 0 : 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute top-0 flex h-full w-[min(20rem,85vw)] flex-col bg-[var(--paper-card)] shadow-[var(--shadow-lg)]",
              side === "left" ? "left-0" : "right-0",
              className
            )}
          >
            <div className="flex min-h-14 items-center justify-between border-b border-[var(--foil-soft)] px-4">
              <h2 id={titleId} className="text-[length:var(--step-0)] font-semibold text-[var(--ink)]">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-70)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
