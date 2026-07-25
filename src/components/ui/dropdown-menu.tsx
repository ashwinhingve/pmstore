"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface DropdownMenuItem {
  label: string
  href?: string
  onClick?: () => void
  icon?: React.ReactNode
  isDestructive?: boolean
}

export interface DropdownMenuProps {
  trigger: React.ReactNode
  items: DropdownMenuItem[]
  align?: "left" | "right"
  header?: React.ReactNode
  className?: string
}

/**
 * Dropdown menu with WAI-ARIA menu pattern support.
 * Features:
 * - role=menu/menuitem
 * - Escape to close and return focus to trigger
 * - Outside-click to close
 * - Arrow navigation (Up/Down)
 * - Trigger has aria-haspopup and aria-expanded
 * - Small enter animation with prefers-reduced-motion support
 *
 * Styling:
 * - Panel: bg --paper-card, border --foil-soft, --radius-md, --shadow-md
 * - Items: min-h-11 px-4 text --ink hover bg --paper-tint
 * - isDestructive items: text --ink-70
 */
export function DropdownMenu({
  trigger,
  items,
  align = "right",
  header,
  className,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [focusedIndex, setFocusedIndex] = React.useState(-1)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const itemRefs = React.useRef<(HTMLElement | null)[]>([])
  const reduceMotion = useReducedMotion()

  // Handle Escape key and outside clicks
  React.useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        menuRef.current &&
        triggerRef.current &&
        !menuRef.current.contains(target) &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    document.addEventListener("mousedown", handleOutsideClick)

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [isOpen])

  // Handle arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const nextIndex = focusedIndex < items.length - 1 ? focusedIndex + 1 : 0
      setFocusedIndex(nextIndex)
      itemRefs.current[nextIndex]?.focus()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const prevIndex = focusedIndex <= 0 ? items.length - 1 : focusedIndex - 1
      setFocusedIndex(prevIndex)
      itemRefs.current[prevIndex]?.focus()
    } else if (e.key === "Home") {
      e.preventDefault()
      setFocusedIndex(0)
      itemRefs.current[0]?.focus()
    } else if (e.key === "End") {
      e.preventDefault()
      const lastIndex = items.length - 1
      setFocusedIndex(lastIndex)
      itemRefs.current[lastIndex]?.focus()
    }
  }

  const handleItemClick = (onClick?: () => void) => {
    onClick?.()
    setIsOpen(false)
  }

  const handleTriggerClick = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setFocusedIndex(-1)
    }
  }

  // Focus the trigger on open
  React.useEffect(() => {
    if (isOpen) {
      setFocusedIndex(-1)
    }
  }, [isOpen])

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2"
      >
        {trigger}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            role="menu"
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{
              duration: reduceMotion ? 0 : 0.12,
              ease: "easeOut",
            }}
            className={cn(
              "absolute top-full mt-2 min-w-48 overflow-hidden rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-md)] z-50",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {header && (
              <>
                <div className="border-b border-[var(--foil-soft)] bg-[var(--mint-soft)] px-4 py-3">
                  {header}
                </div>
              </>
            )}

            <div className="py-2">
              {items.map((item, index) => (
              item.href ? (
                <Link
                  key={index}
                  href={item.href}
                  role="menuitem"
                  ref={(el) => {
                    itemRefs.current[index] = el
                  }}
                  onClick={() => {
                    setIsOpen(false)
                  }}
                  className={cn(
                    "flex min-h-11 items-center gap-3 px-4 py-2 text-sm transition-colors duration-[var(--dur-fast)]",
                    item.isDestructive
                      ? "text-[var(--ink-70)] hover:bg-[var(--paper-tint)]"
                      : "text-[var(--ink)] hover:bg-[var(--paper-tint)]"
                  )}
                >
                  {item.icon && (
                    <span className="flex h-4 w-4 items-center justify-center shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <button
                  key={index}
                  role="menuitem"
                  ref={(el) => {
                    itemRefs.current[index] = el
                  }}
                  onClick={() => handleItemClick(item.onClick)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(-1)}
                  className={cn(
                    "w-full flex min-h-11 items-center gap-3 px-4 py-2 text-sm text-left transition-colors duration-[var(--dur-fast)]",
                    item.isDestructive
                      ? "text-[var(--ink-70)] hover:bg-[var(--paper-tint)]"
                      : "text-[var(--ink)] hover:bg-[var(--paper-tint)]"
                  )}
                >
                  {item.icon && (
                    <span className="flex h-4 w-4 items-center justify-center shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </button>
              )
            ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
