import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import { SITE_NAME, SITE_DESCRIPTION, CONTACT, SOCIAL_LINKS } from "@/lib/constants";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[var(--foil-soft)] bg-[var(--paper)]">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative h-12 w-12 flex-shrink-0">
                <Image
                  src="/images/logo.jpg"
                  alt={`${SITE_NAME} Logo`}
                  fill
                  className="object-contain rounded-full"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--ink)]">
                  {SITE_NAME}
                </h3>
                <p className="text-xs font-medium text-muted-foreground">Trusted Pharmacy</p>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {SITE_DESCRIPTION}
            </p>

            {/* Social Media Links */}
            <div className="flex space-x-3">
              <Link
                href={SOCIAL_LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-[var(--mint)] hover:opacity-80 text-white transition-opacity"
                aria-label="Contact us on WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Shop Links */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-[var(--ink)]">Shop</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/products" className="hover:text-[var(--mint)] hover:underline transition-colors">
                  All medicines
                </Link>
              </li>
              <li>
                <Link href="/prescriptions" className="hover:text-[var(--mint)] hover:underline transition-colors">
                  Upload prescription
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-[var(--mint)] hover:underline transition-colors">
                  Your orders
                </Link>
              </li>
              <li>
                <Link href="/saved" className="hover:text-[var(--mint)] hover:underline transition-colors">
                  Saved medicines
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-[var(--ink)]">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-[var(--mint)] hover:underline transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[var(--mint)] hover:underline transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[var(--mint)] hover:underline transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[var(--mint)] hover:underline transition-colors">
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support Links */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-[var(--ink)]">Legal &amp; Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy-policy" className="hover:text-[var(--mint)] hover:underline transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-and-conditions" className="hover:text-[var(--mint)] hover:underline transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-[var(--mint)] hover:underline transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="hover:text-[var(--mint)] hover:underline transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[var(--mint)] hover:underline transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t my-8"></div>

        {/* Compliance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-center md:text-left">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wide">Government approved</p>
            <p className="text-sm text-muted-foreground">Generic-brand medicines</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wide">Licensed pharmacy</p>
            <Link href="/drug-licence" className="text-sm text-muted-foreground hover:text-[var(--mint)] hover:underline transition-colors">
              View drug licence
            </Link>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wide">Trained pharmacists</p>
            <p className="text-sm text-muted-foreground">20+ years of trusted service</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-[var(--mint)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Location</p>
              <p className="text-sm text-muted-foreground">{CONTACT.address.line1}</p>
              <p className="text-sm text-muted-foreground">{CONTACT.address.city}, {CONTACT.address.state} — {CONTACT.address.postalCode}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Mail className="h-5 w-5 text-[var(--mint)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Email Us</p>
              <a
                href={CONTACT.emailHref}
                className="text-sm text-muted-foreground hover:text-[var(--mint)] hover:underline transition-colors"
              >
                {CONTACT.email}
              </a>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Phone className="h-5 w-5 text-[var(--mint)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Call Us</p>
              <a href={CONTACT.phoneHref} className="text-sm text-muted-foreground hover:text-[var(--mint)] hover:underline transition-colors">
                {CONTACT.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              &copy; {currentYear} {SITE_NAME}. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground text-center md:text-right">
              {CONTACT.hours}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
