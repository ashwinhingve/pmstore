import Link from "next/link";
import { MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { NewsletterForm } from "./NewsletterForm";
import { SITE_NAME, SITE_SHORT_NAME, SITE_SLOGAN, SITE_DESCRIPTION, CONTACT, SOCIAL_LINKS } from "@/lib/constants";

const shopLinks = [
  { href: "/products", label: "All medicines" },
  { href: "/custom-order", label: "Custom order" },
  { href: "/prescriptions", label: "Upload prescription" },
  { href: "/orders", label: "Your orders" },
  { href: "/saved", label: "Saved medicines" },
];

const companyLinks = [
  { href: "/about", label: "About us" },
  { href: "/wholesale", label: "Wholesale supply" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQs" },
];

const legalLinks = [
  { href: "/privacy-policy", label: "Privacy policy" },
  { href: "/terms-and-conditions", label: "Terms & conditions" },
  { href: "/refund-policy", label: "Refund policy" },
  { href: "/shipping-policy", label: "Shipping policy" },
  { href: "/drug-licence", label: "Drug licence" },
];

const linkClass =
  "text-sm text-[var(--foil)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--paper)] hover:underline";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[image:var(--surface-hero)] text-[var(--paper)]">
      <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Company Info */}
          <div className="space-y-4">
            <Link href="/" className="inline-block transition-opacity duration-[var(--dur-fast)] hover:opacity-80">
              <div className="mb-2 text-[var(--paper)]">
                <Logo size={40} variant="mark" />
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--paper)]">{SITE_SHORT_NAME}</h3>
              <p className="text-xs font-medium text-[var(--foil)]">{SITE_SLOGAN}</p>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-[var(--foil)]">
              {SITE_DESCRIPTION}
            </p>

            <div className="flex gap-3">
              <Link
                href={SOCIAL_LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--mint)] text-[var(--paper-card)] transition-opacity duration-[var(--dur-fast)] hover:opacity-85"
                aria-label="Contact us on WhatsApp"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Link columns */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--ink-10)]">
              Shop
            </h3>
            <ul className="space-y-2.5">
              {shopLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--ink-10)]">
              Company
            </h3>
            <ul className="space-y-2.5">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--ink-10)]">
              Legal &amp; support
            </h3>
            <ul className="space-y-2.5">
              {legalLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter — light card floating on the navy band */}
        <div className="mb-10 rounded-[var(--radius-lg)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-md)] sm:p-8">
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-[length:var(--step-1)] text-[var(--ink)]">Stay updated</h3>
              <p className="mt-1 text-sm text-[var(--ink-70)]">
                Get news about new medicines and offers.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </div>

        {/* Compliance */}
        <div className="mb-10 grid grid-cols-1 gap-6 border-t border-[var(--paper)]/15 pt-10 text-center md:grid-cols-3 md:text-left">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-10)]">
              Government approved
            </p>
            <p className="text-sm text-[var(--foil)]">Generic-brand medicines</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-10)]">
              Licensed pharmacy
            </p>
            <Link href="/drug-licence" className={linkClass}>
              View drug licence
            </Link>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-10)]">
              Trained pharmacists
            </p>
            <p className="text-sm text-[var(--foil)]">20+ years of trusted service</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--mint-soft)]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-[var(--paper)]">Location</p>
              <p className="text-sm text-[var(--foil)]">{CONTACT.address.line1}</p>
              <p className="text-sm text-[var(--foil)]">
                {CONTACT.address.city}, {CONTACT.address.state} — {CONTACT.address.postalCode}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[var(--mint-soft)]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-[var(--paper)]">Email us</p>
              <a href={CONTACT.emailHref} className={linkClass}>
                {CONTACT.email}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[var(--mint-soft)]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-[var(--paper)]">Call us</p>
              <a href={CONTACT.phoneHref} className={`data ${linkClass}`}>
                {CONTACT.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[var(--paper)]/15 pt-8">
          <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
            <p className="text-center text-sm text-[var(--foil)] md:text-left">
              &copy; {currentYear} {SITE_NAME}. All rights reserved.
            </p>
            <p className="text-center text-sm text-[var(--foil)] md:text-right">{CONTACT.hours}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
