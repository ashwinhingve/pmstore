"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TabConfig {
  id: string
  label: string
  content: React.ReactNode
}

export interface TabsProps {
  tabs: TabConfig[]
  defaultTab?: string
  onChange?: (tabId: string) => void
  className?: string
}

/**
 * WAI-ARIA compliant tabs component with automatic activation pattern.
 * Supports roving tabindex keyboard navigation (Arrow keys, Home, End).
 *
 * Styling:
 * - Active: 2px bottom border --ink, font-semibold text --ink
 * - Inactive: text --ink-70, hover --ink
 * - Bottom border --foil-soft under the whole list
 * - Min height 44px
 * - Color transitions respect --dur-fast
 */
export function Tabs({ tabs, defaultTab, onChange, className }: TabsProps) {
  const [activeTabId, setActiveTabId] = React.useState(defaultTab || tabs[0]?.id || "")
  const [focusedTabId, setFocusedTabId] = React.useState(activeTabId)
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})
  const instanceId = React.useId()

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId)
    setFocusedTabId(tabId)
    onChange?.(tabId)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, tabId: string) => {
    const tabIds = tabs.map((t) => t.id)
    const currentIndex = tabIds.indexOf(focusedTabId)
    let nextIndex: number | null = null

    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      nextIndex = currentIndex === 0 ? tabIds.length - 1 : currentIndex - 1
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault()
      nextIndex = currentIndex === tabIds.length - 1 ? 0 : currentIndex + 1
    } else if (e.key === "Home") {
      e.preventDefault()
      nextIndex = 0
    } else if (e.key === "End") {
      e.preventDefault()
      nextIndex = tabIds.length - 1
    }

    if (nextIndex !== null) {
      const nextTabId = tabIds[nextIndex]
      setFocusedTabId(nextTabId)
      handleTabChange(nextTabId)
      // Focus the next tab after state updates
      setTimeout(() => tabRefs.current[nextTabId]?.focus(), 0)
    }
  }

  const handleClick = (tabId: string) => {
    setFocusedTabId(tabId)
    handleTabChange(tabId)
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        className="flex border-b border-[var(--foil-soft)]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current[tab.id] = el
            }}
            role="tab"
            aria-selected={activeTabId === tab.id}
            aria-controls={tab.content !== null ? `${instanceId}-tabpanel-${tab.id}` : undefined}
            id={`${instanceId}-tab-${tab.id}`}
            tabIndex={focusedTabId === tab.id ? 0 : -1}
            onClick={() => handleClick(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            className={cn(
              "flex-1 min-h-11 px-4 py-3 text-sm font-medium transition-colors duration-[var(--dur-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]",
              activeTabId === tab.id
                ? "border-b-2 border-[var(--ink)] font-semibold text-[var(--ink)]"
                : "text-[var(--ink-70)] hover:text-[var(--ink)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        tab.content !== null && (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${instanceId}-tabpanel-${tab.id}`}
            aria-labelledby={`${instanceId}-tab-${tab.id}`}
            hidden={activeTabId !== tab.id}
          >
            {activeTabId === tab.id && tab.content}
          </div>
        )
      ))}
    </div>
  )
}
