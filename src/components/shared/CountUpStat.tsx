"use client"

import React, { useEffect, useState } from "react"
import { useInView } from "react-intersection-observer"
import { motion, useReducedMotion } from "framer-motion"

export interface CountUpStatProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export const CountUpStat: React.FC<CountUpStatProps> = ({
  end,
  duration = 2,
  suffix = "",
  prefix = "",
  label,
  icon,
  className = "",
}) => {
  const [count, setCount] = useState(0)
  const reduceMotion = useReducedMotion()
  const [ref, inView] = useInView({
    threshold: 0.3,
    triggerOnce: true,
  })

  useEffect(() => {
    if (inView && reduceMotion) {
      setCount(end)
      return
    }
    if (inView) {
      let startTime: number
      let animationFrame: number

      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime
        const progress = Math.min((currentTime - startTime) / (duration * 1000), 1)

        // Ease-out function for smoother animation
        const easeOut = 1 - Math.pow(1 - progress, 3)
        setCount(Math.floor(easeOut * end))

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate)
        } else {
          setCount(end)
        }
      }

      animationFrame = requestAnimationFrame(animate)

      return () => cancelAnimationFrame(animationFrame)
    }
  }, [inView, end, duration, reduceMotion])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.9 }}
      animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduceMotion ? 1 : 0.9 }}
      transition={{ duration: reduceMotion ? 0 : 0.5 }}
      className={`text-center p-6 ${className}`}
    >
      {icon && (
        <div className="flex justify-center mb-4 text-[var(--ink)]">
          {icon}
        </div>
      )}
      <div className="text-4xl md:text-5xl font-bold text-[var(--ink)] mb-2" style={{ fontFamily: 'var(--font-data)' }}>
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm md:text-base text-[var(--ink-70)] font-medium">
        {label}
      </div>
    </motion.div>
  )
}
