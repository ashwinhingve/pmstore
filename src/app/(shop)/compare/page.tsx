import type { Metadata } from 'next';
import { Info, Scale } from 'lucide-react';
import { Container } from '@/components/shared/Container';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/shared/Badge';
import { CompareCard } from '@/components/compare/CompareCard';
import { AddBestToCartButton } from '@/components/compare/AddBestToCartButton';
import { buildCompareViewModel, type CompareProduct } from '@/lib/pharma/compare';
import { getCompareProducts } from '@/lib/pharma/compare-data';
import { formatINR, packUnitShort } from '@/lib/pharma/format';

/**
 * /compare?ids=<id>,<id> — two brands side by side, judged on price per
 * tablet/ml. The URL is the whole state, so a comparison can be shared.
 * Utility page: noindex.
 */

type SearchParams = Promise<{ ids?: string | string[] }>;

function idsCsv(ids: string | string[] | undefined): string {
  return Array.isArray(ids) ? ids.join(',') : (ids ?? '');
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { ids } = await searchParams;
  const products = await getCompareProducts(idsCsv(ids));
  return {
    title:
      products.length === 2
        ? `Compare: ${products[0].name} vs ${products[1].name}`
        : 'Compare medicines',
    robots: { index: false, follow: false },
  };
}

export default async function ComparePage({ searchParams }: { searchParams: SearchParams }) {
  const { ids } = await searchParams;
  const products = await getCompareProducts(idsCsv(ids));

  return (
    <Container className="py-8 md:py-12">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Medicines', href: '/products' },
          { label: 'Compare', href: '/compare' },
        ]}
      />

      <h1 className="mt-4 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-extrabold text-[var(--ink)]">
        Compare
      </h1>

      {products.length < 2 ? (
        <EmptyState
          className="mt-8"
          icon={<Scale className="h-10 w-10" aria-hidden="true" />}
          title="Pick two medicines to compare"
          description="Open any medicine and choose Compare, or pick two brands from your search results. We'll show which one costs less per tablet."
          action={{ label: 'Browse medicines', href: '/products' }}
        />
      ) : (
        <Comparison products={products} />
      )}
    </Container>
  );
}

function Comparison({ products }: { products: CompareProduct[] }) {
  const vm = buildCompareViewModel(products);
  const best = vm.verdict ? products.find((p) => p._id === vm.verdict!.bestId) ?? null : null;
  const other = best ? products.find((p) => p._id !== best._id) ?? null : null;
  const bothOutOfStock = products.every((p) => p.stock <= 0);
  const unit = packUnitShort((best ?? products[0]).packUnit);

  return (
    <section aria-label="Product comparison" className="mt-2">
      {vm.sameComposition ? (
        <p className="text-[var(--ink-70)]">
          Same composition — <span className="strength">{vm.compositionLabel}</span> — priced per{' '}
          {unit}.
        </p>
      ) : (
        <p className="flex items-start gap-2 text-[var(--ink-70)]">
          <Info className="mt-1 h-4 w-4 shrink-0 text-[var(--ink-40)]" aria-hidden="true" />
          These are different medicines with different salts — one is not a substitute for the
          other. The comparison below is price only.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-6">
        {products.map((p) => (
          <CompareCard key={p._id} product={p} isBest={vm.verdict?.bestId === p._id} />
        ))}
      </div>

      {vm.verdict && best && other && (
        <aside
          aria-label="Best option"
          className="mt-6 flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--mint)] bg-[var(--mint-soft)] p-5 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div>
            <Badge tone="mint">Best option</Badge>
            <p className="mt-2 font-medium text-[var(--ink)]">
              {vm.verdict.savings ? (
                <>
                  {best.name} costs less per {unit} — save{' '}
                  <span className="price font-semibold text-[var(--mint)]">
                    {formatINR(vm.verdict.savings.perPack)}
                  </span>{' '}
                  on a pack (<span className="data">{vm.verdict.savings.percent}%</span> less per{' '}
                  {unit}).
                </>
              ) : other.stock <= 0 ? (
                <>
                  {best.name} is the one you can order today — {other.name} is out of stock.
                </>
              ) : (
                <>
                  Both cost the same per {unit} — {best.name} has the cheaper pack.
                </>
              )}
            </p>
          </div>
          <AddBestToCartButton product={best} />
        </aside>
      )}

      {!vm.verdict && bothOutOfStock && (
        <p className="mt-6 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-tint)] p-4 text-[var(--ink-70)]">
          Both brands are out of stock right now. Save them to your medicines and check back.
        </p>
      )}

      {!vm.verdict && !bothOutOfStock && (
        <p className="mt-6 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-tint)] p-4 text-[var(--ink-70)]">
          These brands cost the same per {unit} for the same pack — pick either one.
        </p>
      )}
    </section>
  );
}
