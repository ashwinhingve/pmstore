import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireAdmin } from "@/lib/auth-helpers"
import { ImportWizard } from "@/components/admin/products/import-wizard/ImportWizard"
import { ProductBulkImportClient } from "@/components/admin/products/bulk/ProductBulkImportClient"
import { ImportTemplateManager } from "@/components/admin/products/ImportTemplateManager"

export const metadata: Metadata = {
  title: "Import products",
}

export default async function ProductImportPage() {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-full p-6">
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--ink-70)] hover:text-[var(--ink)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      <h1 className="text-[length:var(--step-2)] font-extrabold tracking-tight text-[var(--ink)]">
        Import products
      </h1>
      <p className="mt-2 mb-6 max-w-3xl text-[var(--ink-70)]">
        Upload a CSV or Excel file and follow the steps. We match your columns automatically, show
        you a preview to fix, and only save what looks right. Existing products are matched by SKU.
      </p>

      <ImportWizard />

      {/* The original spreadsheet grid and template tools stay available for
          power users, out of the way of the guided flow above. */}
      <details className="mt-10 rounded-[var(--radius-md)] border border-[var(--foil-soft)]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--ink)]">
          Advanced: spreadsheet grid &amp; saved templates
        </summary>
        <div className="space-y-6 border-t border-[var(--foil-soft)] p-4">
          <ImportTemplateManager />
          <ProductBulkImportClient />
        </div>
      </details>
    </div>
  )
}
