import Link from 'next/link';
import type { Metadata } from 'next';
import connectDB from '@/lib/mongodb/connection';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { searchQuerySchema } from '@/lib/validations/search';
import { executeSearch, type SearchFacets } from '@/lib/search/execute';
import {
  isExactNameMatch,
  scopeToComposition,
  isSaltNameMatch,
  scopeToSaltOverlap,
} from '@/lib/search/comparison';
import type { Salt } from '@/lib/pharma/composition';
import { normalizeUnit } from '@/lib/pharma/format';
import { ProductCard, type ProductCardData } from '@/components/products/ProductCard';
import { SearchComparison } from '@/components/search/SearchComparison';
import { SearchFilterDrawer } from '@/components/search/SearchFilterDrawer';
import { EmptySearchArt } from '@/components/illustrations';

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
  return { title: q ? `Search: ${q} — PM Store` : 'Search — PM Store' };
}

function firstString(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

/** JSON round-trip so nested ObjectIds (salts[]._id, images[]._id) become plain
 * strings before crossing into React, matching lib/search/execute.ts's serialize(). */
function serializeDoc(doc: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(doc));
}

function unitPriceOf(r: Record<string, unknown>): number {
  return typeof r.unitPrice === 'number' ? r.unitPrice : Number.POSITIVE_INFINITY;
}

/** The id of the cheapest-per-unit in-stock product in a scoped set (or null). */
function cheapestInStockId(results: Record<string, unknown>[]): string | null {
  let best: Record<string, unknown> | null = null;
  for (const r of results) {
    const stock = typeof r.stock === 'number' ? r.stock : 0;
    if (stock <= 0) continue;
    if (!best || unitPriceOf(r) < unitPriceOf(best)) best = r;
  }
  return best ? String(best._id) : null;
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

  // Same-composition comparison: fetched directly by compositionKey (mirrors
  // the Strip's related-products lookup in /api/products/[slug]/route.ts)
  // rather than scraped from whatever else text-matched the search query. A
  // genuine same-salt sibling is found even when its brand name shares no
  // words with the query, and the group is always the searched medicine's
  // own formula — never an unrelated pair that happened to co-occur on the
  // results page.
  const topResult = results[0];
  const brandMatch =
    topResult &&
    isExactNameMatch(q, String(topResult.name ?? '')) &&
    typeof topResult.compositionKey === 'string' &&
    Boolean(topResult.compositionKey);

  // Salt search: the query itself names one of the top result's salts (not
  // just any product that happens to have salts) — e.g. "paracetamol" or
  // "paracetamol 650". Deliberately excludes category/condition words like
  // "vitamin", which would otherwise wrongly narrow the grid to whatever the
  // single top hit's salt is and hide every other equally-relevant vitamin.
  const saltMatch =
    !brandMatch &&
    typeof topResult?.compositionKey === 'string' &&
    Boolean(topResult?.compositionKey) &&
    isSaltNameMatch(q, Array.isArray(topResult?.salts) ? (topResult?.salts as Salt[]) : []);

  let comparisonProducts: Record<string, unknown>[] = [];
  if (brandMatch) {
    const siblings = await Product.find({
      compositionKey: topResult.compositionKey,
      isActive: true,
      isDiscontinued: false,
      _id: { $ne: topResult._id },
    })
      .select(
        'name slug manufacturer price mrp packSize packUnit unitPrice stock compositionKey salts prescriptionRequired images form'
      )
      .sort({ unitPrice: 1 })
      .limit(30)
      .lean();

    if (siblings.length > 0) {
      comparisonProducts = [topResult, ...siblings.map((s) => serializeDoc(s as Record<string, unknown>))];
    }
  }

  // Relevance scope: on an unfiltered first page, the grid shows only what's
  // genuinely relevant to what was searched — never an unrelated product that
  // merely shared a text token. An exact brand match narrows to that
  // medicine's own composition (brandMatch); a salt-name search narrows to
  // that salt and anything sharing it (saltMatch). A category/condition word
  // matches neither and stays wide with the full facets + pagination below.
  // Scoping is confined to page 1 with no other filter applied so the header's
  // total count and pagination never disagree with what's rendered — this is
  // page-layer filtering, after executeSearch() already computed meta.total
  // from the unfiltered hits.
  const hasNarrowingFilter = Boolean(
    firstString(params.category) ||
      firstString(params.prescriptionRequired) ||
      firstString(params.minPrice) ||
      firstString(params.maxPrice)
  );
  const compositionScoped =
    (Boolean(brandMatch) || saltMatch) && !hasNarrowingFilter && parsed.data.page === 1;

  // Tier A (exact brand match): lead with the cheapest per unit so the best
  // value is obvious at a glance. Tier B (salt match): keep relevance order —
  // different strengths/forms aren't a fair apples-to-apples sort key.
  const gridResults = !compositionScoped
    ? results
    : brandMatch
      ? [...scopeToComposition(results, q)].sort((a, b) => unitPriceOf(a) - unitPriceOf(b))
      : scopeToSaltOverlap(results, q);

  // Best-value framing only makes sense for the exact-formula tier — per
  // CLAUDE.md rule #1, comparing per-tablet price across different strengths
  // isn't a fair "better deal" claim.
  const bestValueId = brandMatch && compositionScoped ? cheapestInStockId(gridResults) : null;
  const scopedUnit =
    brandMatch && compositionScoped ? normalizeUnit(String(topResult.packUnit ?? 'unit')) : '';

  return (
    <div className="mx-auto max-w-[1600px] xl:w-4/5 px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <h1 className="text-[length:var(--step-2)] font-extrabold tracking-tight text-[var(--ink)]">
            Results for{' '}
            <span
              style={{
                backgroundImage: 'var(--surface-brand)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'var(--brand-deep)',
              }}
            >
              “{q}”
            </span>
          </h1>
          <span
            className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--brand-soft)] px-3 py-1 text-sm font-semibold text-[var(--brand-deep)]"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {meta.total} {meta.total === 1 ? 'medicine' : 'medicines'}
          </span>
        </div>
        {data.degraded && (
          <p className="mt-3 inline-flex rounded-[var(--radius-sm)] bg-[var(--mint-soft)] px-3 py-2 text-sm text-[var(--mint-deep)]">
            Showing basic results. Full typo-tolerant search comes online once the catalogue index
            is built.
          </p>
        )}
      </header>

      {/* Same-composition comparison: brands sharing the searched salt, side by
          side and led by price per tablet. comparisonProducts (built above) is
          always the searched medicine plus its real compositionKey siblings —
          never unrelated medicines — and stays empty unless the top result is
          the medicine actually searched for, not just a fuzzy/salt-only hit. */}
      {comparisonProducts.length > 1 && <SearchComparison products={comparisonProducts} />}

      {/* Salt search (no exact brand match, but the query names a salt): build
          the comparison card(s) straight from the already-filtered grid —
          SearchComparison groups by compositionKey internally and renders
          nothing if no group has 2+ brands, so this is a safe no-op when the
          salt-relevant set has no comparable pair. */}
      {compositionScoped && saltMatch && gridResults.length > 0 && (
        <SearchComparison products={gridResults} />
      )}

      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        {/* Mobile + desktop filters — hidden once composition-scoped (brand or
            salt match), where the grid is already narrowed to what's relevant
            and price/category facets are moot. */}
        {!compositionScoped && (
          <>
            <SearchFilterDrawer>
              <FacetContent params={params} facets={data.facets} catName={catName} />
            </SearchFilterDrawer>

            <aside
              className="hidden h-fit w-full shrink-0 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 shadow-[var(--shadow-xs)] md:block md:w-60"
              aria-label="Filter results"
            >
              <FacetContent params={params} facets={data.facets} catName={catName} />
            </aside>
          </>
        )}

        <main className="flex-1">
          {compositionScoped && gridResults.length > 0 && (
            <p className="mb-4 inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--mint-soft)] px-3 py-1.5 text-sm font-medium text-[var(--mint-deep)]">
              <span
                className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--mint)] px-2 py-0.5 text-xs font-bold text-[var(--brand-ink)]"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {gridResults.length}
              </span>
              {brandMatch
                ? gridResults.length === 1
                  ? 'Only this brand carries this composition'
                  : `brands with this composition — cheapest per ${scopedUnit} first`
                : gridResults.length === 1
                  ? 'Only this product contains this salt'
                  : 'products with this salt — same-composition brands grouped above'}
            </p>
          )}

          {gridResults.length === 0 ? (
            <NoResults q={q} />
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {gridResults.map((product) => (
                <li key={String(product._id)}>
                  <ProductCard
                    product={product as unknown as ProductCardData}
                    badge={bestValueId && String(product._id) === bestValueId ? 'best-value' : undefined}
                  />
                </li>
              ))}
            </ul>
          )}

          {!compositionScoped && totalPages > 1 && (
            <Pagination current={parsed.data.page} totalPages={totalPages} params={params} />
          )}
        </main>
      </div>
    </div>
  );
}

function FacetContent({
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
    <>
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
    </>
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
        {count != null && <span className="data text-xs text-[var(--ink-40)]">{count}</span>}
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
      <span className="data text-sm text-[var(--ink-70)]">
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
      className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--foil)] bg-[var(--paper-card)] px-4 py-2 text-sm text-[var(--ink-70)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--mint)]/40"
    >
      {children}
    </Link>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--foil)] px-6 py-16 text-center">
      <EmptySearchArt className="mx-auto mb-5 w-44 sm:w-52" />
      <h2 className="text-[length:var(--step-1)] font-semibold text-[var(--ink)]">
        No medicines match “{q}”
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--ink-70)]">
        Check the spelling, or try the salt name — for example “paracetamol” instead of a brand.
      </p>
    </div>
  );
}

function EmptyPrompt({ invalid = false }: { invalid?: boolean }) {
  return (
    <div className="mx-auto max-w-[1600px] xl:w-4/5 px-4 py-20 text-center">
      <EmptySearchArt className="mx-auto mb-6 w-48" />
      <h1 className="text-[length:var(--step-2)] text-[var(--ink)]">
        {invalid ? 'Try a different search' : 'Search for a medicine'}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[var(--ink-70)]">
        Search by brand or salt — Dolo 650, paracetamol, or a condition like blood pressure.
      </p>
    </div>
  );
}
