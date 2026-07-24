"use client"

import React from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Shield } from "lucide-react"

export interface Certification {
  name: string;
  description: string;
  image?: string;
  icon?: React.ReactNode;
}

export interface CertificationBadgeProps {
  certification: Certification;
  className?: string;
}

export const CertificationBadge: React.FC<CertificationBadgeProps> = ({
  certification,
  className = "",
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      transition={{ duration: 0.3 }}
      className={`bg-[var(--paper-card)] rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow duration-300 ${className}`}
    >
      {/* Icon or Image */}
      <div className="flex justify-center mb-4">
        {certification.image ? (
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[var(--foil-soft)] p-2">
            <Image
              src={certification.image}
              alt={certification.name}
              width={96}
              height={96}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-[var(--mint)] flex items-center justify-center">
            {certification.icon || <Shield className="w-12 h-12 text-[var(--paper-card)]" />}
          </div>
        )}
      </div>

      {/* Content */}
      <h3 className="text-lg font-bold text-[var(--ink)] text-center mb-2">
        {certification.name}
      </h3>
      <p className="text-sm text-[var(--ink-70)] text-center leading-relaxed">
        {certification.description}
      </p>
    </motion.div>
  )
}
