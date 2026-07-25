import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { RotateCcw, Upload, Search as SearchIcon } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { SearchBar } from '@/components/search/SearchBar';

/**
 * Shop home — search-first (docs/03-DESIGN-SYSTEM.md § Layout). A repeat-purchase
 * product opens on the repeat action, so: search, then "order again" (only when
 * signed in), then "upload prescription". No hero banner, no carousel.
 */
export default async function ShopHome() {
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <h1 className="text-[length:var(--step-3)] font-extrabold tracking-tight text-[var(--ink)]">
          Find your medicine
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[var(--ink-70)]">
          Search by brand or salt. We show the price per tablet, so you can compare honestly.
        </p>
      </div>

      {/* Door 1 — search */}
      <div className="mt-8 flex justify-center">
        <SearchBar className="max-w-2xl" />
      </div>

      {/* Doors 2 & 3 — repeat purchase and prescription */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {signedIn && (
          <Door
            href="/orders"
            icon={<RotateCcw className="h-6 w-6" aria-hidden="true" />}
            title="Order again"
            description="Your recent orders, ready to reorder in a tap."
          />
        )}
        <Door
          href="/prescriptions"
          icon={<Upload className="h-6 w-6" aria-hidden="true" />}
          title="Upload prescription"
          description="Send a prescription and we'll build your order."
        />
        {!signedIn && (
          <Door
            href="/products"
            icon={<SearchIcon className="h-6 w-6" aria-hidden="true" />}
            title="Browse medicines"
            description="Explore the catalogue by category and price."
          />
        )}
      </div>
    </main>
  );
}

function Door({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-start gap-4 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-5 shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--foil)]"
    >
      <span className="mt-0.5 text-[var(--mint)]">{icon}</span>
      <span>
        <span className="block font-[family-name:var(--font-display)] font-semibold text-[var(--ink)]">
          {title}
        </span>
        <span className="mt-0.5 block text-[0.875rem] text-[var(--ink-70)]">{description}</span>
      </span>
    </Link>
  );
}
