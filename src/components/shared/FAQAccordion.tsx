"use client"

import React, { useId, useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Plus } from "lucide-react"

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQAccordionProps {
  items: FAQItem[];
  className?: string;
}

/**
 * Animated FAQ disclosure list. Renders as hairline-divided rows so it sits
 * cleanly inside a Card (the /faq page) or a standalone surface (the homepage
 * preview). One item open at a time. Accessible: each button controls a labelled
 * region. Motion stays within the design system — the expand runs at
 * --dur-slow (240ms) and collapses to an instant toggle under prefers-reduced-motion.
 */
export const FAQAccordion: React.FC<FAQAccordionProps> = ({
  items,
  className = "",
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const reduceMotion = useReducedMotion()
  const baseId = useId()

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className={`divide-y divide-[var(--foil-soft)] ${className}`}>
      {items.map((item, index) => {
        const isOpen = openIndex === index
        const buttonId = `${baseId}-q-${index}`
        const regionId = `${baseId}-a-${index}`
        return (
          <div key={index}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={regionId}
                onClick={() => toggleItem(index)}
                className="group flex min-h-12 w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors duration-[var(--dur-fast)] hover:bg-[var(--paper-tint)] sm:px-5"
              >
                <span className="font-[family-name:var(--font-display)] font-semibold text-[var(--ink)]">
                  {item.question}
                </span>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--mint-soft)] text-[var(--mint)] transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] ${
                    isOpen ? "rotate-45" : ""
                  }`}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={regionId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 leading-relaxed text-[var(--ink-70)] sm:px-5">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
