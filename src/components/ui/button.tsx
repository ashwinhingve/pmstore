"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[image:var(--surface-brand)] text-[var(--brand-ink)] font-semibold shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-brand)] hover:brightness-105",
        destructive:
          "bg-[var(--ink)] text-[var(--paper-card)] border border-[var(--ink)] shadow-[var(--shadow-xs)] hover:bg-[var(--ink-deep)] hover:shadow-[var(--shadow-sm)]",
        outline:
          "border-2 border-[var(--brand)] bg-[var(--paper-card)] text-[var(--brand-deep)] hover:bg-[var(--brand-soft)]",
        secondary:
          "bg-[var(--foil-soft)] text-[var(--ink)] hover:bg-[var(--foil)]",
        ghost: "hover:bg-[var(--brand-soft)] text-[var(--ink)]",
        link: "text-[var(--brand-deep)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-[var(--radius-sm)] px-3",
        lg: "h-12 rounded-[var(--radius-sm)] px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Disables the button and swaps in a spinner while a submit is in flight. */
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
