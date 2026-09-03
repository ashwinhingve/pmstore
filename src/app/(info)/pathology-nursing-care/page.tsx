import type { Metadata } from "next"
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/shared/AnimatedSection"
import { CONTACT, waHref } from "@/lib/constants"
import { WhatsAppGlyph } from "@/components/shared/WhatsAppGlyph"
import {
  TestTube,
  Droplet,
  Microscope,
  ClipboardCheck,
  Home,
  Syringe,
  Bandage,
  HeartHandshake,
  UserRound,
  PersonStanding,
  Phone,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Pathology & nursing care",
  description:
    "Home sample collection and lab tests, plus home nursing — injections, wound dressing, post-surgical and elder care. Book a visit by phone or WhatsApp.",
  alternates: { canonical: "/pathology-nursing-care" },
}

const PATHOLOGY_SERVICES = [
  { icon: Droplet, title: "Blood tests & CBC", description: "Complete blood count and routine blood work." },
  { icon: TestTube, title: "Sugar & lipid profile", description: "Diabetes and cholesterol monitoring panels." },
  { icon: Microscope, title: "Thyroid panel", description: "TSH, T3 and T4 testing." },
  { icon: ClipboardCheck, title: "Urine & stool routine", description: "Standard routine and microscopy tests." },
  { icon: Home, title: "Home sample collection", description: "A technician visits you to draw the sample." },
]

const NURSING_SERVICES = [
  { icon: HeartHandshake, title: "Home nursing", description: "A trained nurse attends to you at home." },
  { icon: Syringe, title: "Injection & IV administration", description: "Prescribed injections and IV drips." },
  { icon: Bandage, title: "Wound dressing", description: "Regular dressing and wound care." },
  { icon: UserRound, title: "Post-surgical care", description: "Recovery support after a hospital discharge." },
  { icon: PersonStanding, title: "Elder care", description: "Daily assistance and monitoring for seniors." },
  { icon: PersonStanding, title: "Physiotherapy assistance", description: "Help with prescribed physiotherapy routines." },
]

export default function PathologyNursingCarePage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-[image:var(--surface-hero)] py-16 text-[var(--paper)] md:py-24">
        <div className="mx-auto w-full max-w-[1600px] xl:w-4/5 px-4 sm:px-6 lg:px-8">
          <AnimatedSection direction="up" className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-extrabold tracking-tight text-[var(--paper)]">
              Pathology & nursing care
            </h1>
            <p className="text-lg leading-relaxed text-[var(--ink-10)]">
              Lab tests and trained nursing care, at home in Bhopal.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="bg-[var(--paper-card)] py-16 md:py-24">
        <div className="mx-auto w-full max-w-[1600px] xl:w-4/5 px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mb-12 text-center">
            <h2 className="text-[length:var(--step-2)] text-[var(--ink)]">Pathology services</h2>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PATHOLOGY_SERVICES.map((s) => {
              const Icon = s.icon
              return (
                <StaggerItem key={s.title}>
                  <div className="h-full rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper)] p-6 shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] hover:shadow-[var(--shadow-md)]">
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mint-soft)]">
                      <Icon className="h-7 w-7 text-[var(--mint)]" aria-hidden="true" />
                    </span>
                    <h3 className="mb-1.5 text-lg font-bold font-display text-[var(--ink)]">{s.title}</h3>
                    <p className="text-[var(--ink-70)]">{s.description}</p>
                  </div>
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        </div>
      </section>

      <section className="bg-[var(--paper)] py-16 md:py-24">
        <div className="mx-auto w-full max-w-[1600px] xl:w-4/5 px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mb-12 text-center">
            <h2 className="text-[length:var(--step-2)] text-[var(--ink)]">Nursing care services</h2>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {NURSING_SERVICES.map((s) => {
              const Icon = s.icon
              return (
                <StaggerItem key={s.title}>
                  <div className="h-full rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] hover:shadow-[var(--shadow-md)]">
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-soft)]">
                      <Icon className="h-7 w-7 text-[var(--brand)]" aria-hidden="true" />
                    </span>
                    <h3 className="mb-1.5 text-lg font-bold font-display text-[var(--ink)]">{s.title}</h3>
                    <p className="text-[var(--ink-70)]">{s.description}</p>
                  </div>
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        </div>
      </section>

      <section className="bg-[var(--paper-card)] py-16 md:py-20">
        <div className="mx-auto w-full max-w-[1600px] xl:w-4/5 px-4 sm:px-6 lg:px-8">
          <AnimatedSection direction="up" className="mx-auto max-w-xl text-center">
            <h2 className="mb-3 text-[length:var(--step-2)] text-[var(--ink)]">Book a visit</h2>
            <p className="mb-7 text-[var(--ink-70)]">
              Call or message us with what you need and we&apos;ll arrange a visit.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={CONTACT.phoneHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--ink)] px-7 font-semibold text-[var(--paper-card)] shadow-[var(--shadow-sm)] transition-[background-color,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-[var(--ink-deep)]"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call {CONTACT.phone}
              </a>
              <a
                href={waHref("Hi, I'd like to book pathology / nursing care.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--whatsapp)] px-7 font-semibold text-[var(--brand-ink)] shadow-[var(--shadow-sm)] transition-[background-color,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-[var(--whatsapp-deep)]"
              >
                <WhatsAppGlyph className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  )
}
