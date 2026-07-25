import { Truck, Clock, Phone } from "lucide-react";
import { CONTACT } from "@/lib/constants";

/**
 * Slim utility bar above the main header. Scrolls away (not sticky) so it never
 * eats into the sticky header's 72px offset. Hidden on mobile to keep the small
 * viewport focused on search.
 */
export function TopBar() {
  return (
    <div className="hidden bg-[var(--ink)] text-[var(--ink-10)] md:block">
      <div className="mx-auto flex h-9 max-w-[1200px] items-center justify-between px-4 text-xs sm:px-6 lg:px-8">
        <div className="flex items-center gap-5">
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-[var(--mint)]" aria-hidden="true" />
            Free home delivery across Bhopal
          </span>
          <span className="hidden items-center gap-1.5 lg:inline-flex">
            <Clock className="h-3.5 w-3.5 text-[var(--mint)]" aria-hidden="true" />
            {CONTACT.hours}
          </span>
        </div>
        <a
          href={CONTACT.phoneHref}
          className="inline-flex items-center gap-1.5 font-medium transition-colors duration-[var(--dur-fast)] hover:text-[var(--paper)]"
        >
          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="data">{CONTACT.phone}</span>
        </a>
      </div>
    </div>
  );
}
