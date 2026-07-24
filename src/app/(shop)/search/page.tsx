import Link from 'next/link';
import type { Metadata } from 'next';
import connectDB from '@/lib/mongodb/connection';
import Category from '@/models/Category';
import { searchQuerySchema } from '@/lib/validations/search';
import { executeSearch, type SearchFacets } from '@/lib/search/execute';
import { ProductCard } from '@/components/products/ProductCard';

/**
 * Search results — a Server Component. It calls executeSearch directly (no HTTP
 * hop) and drives filters/pagination through the URL, so the page works with
 * JavaScript disabled and is keyboard-operable end to end (Week 2 acceptance).
 *
 * Facets and pagination are plain links that change the query string; there is
 * no client state here. Restyle to design tokens in the Week 3 design pass.
 */

export const dynamic = 'force-dynamic';

type RawParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<Metadata> {
  const q = firstString((await searchParams).q);
  return { title: q ? `Search: ${q} — PMStore` : 'Search — PMStore' };
}

function firstString(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

/** Build an href that preserves the current params and applies a patch (null clears). */
function hrefWith(current: RawParams, patch: Record<string, string | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    const s = firstString(v);
    if (s) sp.set(k, s);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) sp.delete(k);
    else sp.set(k, v);
  }
  return `/search?${sp.toString()}`;
}

const PRICE_BANDS: { id: string; label: string; min?: string; max?: string }[] = [
  { id: '0', label: 'Under ₹50', max: '50' },
  { id: '50', label: '₹50 – ₹100', min: '50', max: '100' },
  { id: '100', label: '₹100 – ₹200', min: '100', max: '200' },
  { id: '200', label: '₹200 – ₹500', min: '200', max: '500' },
  { id: '500', label: '₹500 – ₹1000', min: '500', max: '1000' },
  { id: 'over', label: 'Over ₹1000', min: '1000' },
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = await searchParams;
  const q = firstString(params.q).trim();

  if (!q) return <EmptyPrompt />;

  const parsed = searchQuerySchema.safeParse(params);
  if (!parsed.success) return <EmptyPrompt invalid />;

  await connectDB();
  const { data, meta } = await executeSearch(parsed.data);

  // Enrich results + category facet with category names (one lookup).
  const catIds = data.facets.category.map((c) => c._id).filter(Boolean);
  const cats = catIds.length
    ? await Category.find({ _id: { $in: catIds } }, { name: 1 }).lean<{ _id: unknown; name: string }[]>()
    : [];
  const catName = new Map(cats.map((c) => [String(c._id), c.name]));

  const results: Record<string, unknown>[] = data.results.map((r) => ({
    ...r,
    category: r.category ? { _id: r.category, name: catName.get(String(r.category)) ?? 'Medicine' } : undefined,
  }));

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-[var(--ink)]">
          Results for <span className="text-[var(--mint)]">“{q}”</span>
        </h1>
        <p className="mt-1 font-mono text-sm tabular-nums text-[var(--ink-70)]">
          {meta.total} {meta.total === 1 ? 'medicine' : 'medicines'}
        </p>
        {data.degraded && (
          <p className="mt-2 rounded-md bg-[var(--mint-soft)] px-3 py-2 text-sm text-[var(--mint)]">
            Showing basic results. Full typo-tolerant search comes online once the catalogue index
            is built.
          </p>
        )}
      </header>

      <div className="flex flex-col gap-6 md:flex-row">
        <FacetSidebar params={params} facets={data.facets} catName={catName} />

        <main className="flex-1">
          {results.length === 0 ? (
            <NoResults q={q} />
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((product) => (
                <li key={String(product._id)}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <Pagination current={parsed.data.page} totalPages={totalPages} params={params} />
          )}
        </main>
      </div>
    </div>
  );
}

function FacetSidebar({
  params,
  facets,
  catName,
}: {
  params: RawParams;
  facets: SearchFacets;
  catName: Map<string, string>;
}) {
  const activeCategory = firstString(params.category);
  const activeRx = firstString(params.prescriptionRequired);
  const activeMin = firstString(params.minPrice);

  return (
    <aside className="w-full shrink-0 md:w-56" aria-label="Filter results">
      {/* Prescription */}
      {facets.prescriptionRequired.length > 0 && (
        <FacetGroup title="Prescription">
          {facets.prescriptionRequired.map((f) => {
            const val = f._id ? 'true' : 'false';
            const active = activeRx === val;
            return (
              <FacetLink
                key={val}
                active={active}
                count={f.count}
                href={hrefWith(params, { prescriptionRequired: active ? null : val, page: null })}
              >
                {f._id ? 'Prescription needed' : 'No prescription'}
              </FacetLink>
            );
          })}
        </FacetGroup>
      )}

      {/* Category */}
      {facets.category.length > 0 && (
        <FacetGroup title="Category">
          {facets.category.map((f) => {
            const id = String(f._id);
            const active = activeCategory === id;
            return (
              <FacetLink
                key={id}
                active={active}
                count={f.count}
                href={hrefWith(params, { category: active ? null : id, page: null })}
              >
                {catName.get(id) ?? 'Medicine'}
              </FacetLink>
            );
          })}
        </FacetGroup>
      )}

      {/* Price band */}
      <FacetGroup title="Price">
        {PRICE_BANDS.map((band) => {
          const active = activeMin === (band.min ?? '') && firstString(params.maxPrice) === (band.max ?? '');
          return (
            <FacetLink
              key={band.id}
              active={active}
              href={hrefWith(params, {
                minPrice: active ? null : band.min ?? null,
                maxPrice: active ? null : band.max ?? null,
                page: null,
              })}
            >
              {band.label}
            </FacetLink>
          );
        })}
      </FacetGroup>
    </aside>
  );
}

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-70)]">{title}</h2>
      <ul className="space-y-1">{children}</ul>
    </section>
  );
}

function FacetLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-pressed={active}
        className={`flex min-h-11 items-center justify-between rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--mint)]/40 ${
          active ? 'bg-[var(--mint-soft)] font-medium text-[var(--mint)]' : 'text-[var(--ink-70)] hover:bg-[var(--foil-soft)]'
        }`}
      >
        <span>{children}</span>
        {count != null && <span className="font-mono text-xs tabular-nums text-[var(--ink-40)]">{count}</span>}
      </Link>
    </li>
  );
}

function Pagination({
  current,
  totalPages,
  params,
}: {
  current: number;
  totalPages: number;
  params: RawParams;
}) {
  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
      <PageLink disabled={current <= 1} href={hrefWith(params, { page: String(current - 1) })}>
        Previous
      </PageLink>
      <span className="font-mono text-sm tabular-nums text-[var(--ink-70)]">
        Page {current} of {totalPages}
      </span>
      <PageLink disabled={current >= totalPages} href={hrefWith(params, { page: String(current + 1) })}>
        Next
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-md px-4 py-2 text-sm text-[var(--ink-40)]">{children}</span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-md border border-[var(--foil)] px-4 py-2 text-sm text-[var(--ink-70)] hover:bg-[var(--foil-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--mint)]/40"
    >
      {children}
    </Link>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--foil)] px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-[var(--ink)]">No medicines match “{q}”</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--ink-70)]">
        Check the spelling, or try the salt name — for example “paracetamol” instead of a brand.
      </p>
    </div>
  );
}

function EmptyPrompt({ invalid = false }: { invalid?: boolean }) {
  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-xl font-semibold text-[var(--ink)]">
        {invalid ? 'Try a different search' : 'Search for a medicine'}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-70)]">
        Search by brand or salt — Dolo 650, paracetamol, or a condition like blood pressure.
      </p>
    </div>
  );
}
