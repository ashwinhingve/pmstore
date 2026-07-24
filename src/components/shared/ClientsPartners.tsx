"use client"

import React from "react"
import Image from "next/image"
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection"

interface Partner {
  name: string
  description: string
  logo: string
  color: string
}

const partners: Partner[] = [
  {
    name: "Yashodhara International Pvt. Ltd.",
    description: "National & International Marketing Partner",
    logo: "/images/partners/yashodhara.png",
    color: "from-[var(--mint)] to-[var(--ink)]",
  },
  {
    name: "Almighty Organics Pvt. Ltd.",
    description: "Certified Organic Supplier",
    logo: "/images/partners/almighty.png",
    color: "from-[var(--mint)] to-[var(--ink)]",
  },
  {
    name: "Deshmukh & Co.",
    description: "Retail Sales Partner",
    logo: "/images/partners/deshmukh.png",
    color: "from-[var(--mint)] to-[var(--ink)]",
  },
  {
    name: "Space Automation",
    description: "Website & eCommerce Partner",
    logo: "/images/partners/space.png",
    color: "from-[var(--mint)] to-[var(--ink)]",
  },
  {
    name: "Royal Saffron (Nowhatta, Kashmir)",
    description: "Supplier of 100% Original, Lab-Tested Saffron & Shilajit (Self-grown & authentically sourced)",
    logo: "/images/partners/royal-saffron.png",
    color: "from-[var(--mint)] to-[var(--ink)]",
  },
]

export function ClientsPartners() {
  return (
    <section className="py-16 md:py-24 bg-[var(--paper)]">
      <div className="container mx-auto px-4">
        <AnimatedSection className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-2 text-[var(--ink)]">
            Our clients and partners
          </h2>
          <div className="w-24 h-1 bg-[var(--mint)] mx-auto mt-4"></div>
          <p className="text-[var(--ink-70)] mt-6 max-w-3xl mx-auto text-lg">
            Trusted partnerships that strengthen our commitment to quality and help us deliver the best products to your doorstep
          </p>
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {partners.map((partner, index) => (
            <StaggerItem key={index}>
              <div className="bg-[var(--paper-card)] rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 group hover:scale-105 h-full flex flex-col">
                {/* Logo */}
                <div className="w-48 h-48 bg-[var(--paper-card)] rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-105 transition-transform duration-300 shadow-md border-2 border-[var(--foil-soft)] p-6">
                  <div className="relative w-full h-full">
                    <Image
                      src={partner.logo}
                      alt={`${partner.name} logo`}
                      fill
                      className="object-contain"
                      quality={100}
                      priority
                    />
                  </div>
                </div>

                {/* Partner Name */}
                <h3 className="text-xl font-bold text-[var(--ink)] mb-3 text-center">
                  {partner.name}
                </h3>

                {/* Description */}
                <p className="text-[var(--ink-70)] text-center leading-relaxed flex-grow">
                  {partner.description}
                </p>

                {/* Decorative bottom accent */}
                <div className={`mt-6 h-1 w-16 bg-gradient-to-r ${partner.color} mx-auto rounded-full group-hover:w-full transition-all duration-300`}></div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Trust Statement */}
        <AnimatedSection direction="up" className="mt-16 text-center">
          <div className="max-w-3xl mx-auto bg-[var(--mint-soft)] rounded-2xl p-8 shadow-lg border-2 border-[var(--mint)]">
            <p className="text-lg text-[var(--ink)] leading-relaxed">
              <span className="font-bold">Building relationships based on trust:</span> Our partners share our vision of delivering 100% pure, adulteration-free products. Together, we are committed to bringing the taste of purity to every home across India.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
