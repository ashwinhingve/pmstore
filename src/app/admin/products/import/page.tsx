import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireAdmin } from "@/lib/auth-helpers"
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

      <h1 className="text-2xl font-bold text-[var(--ink)]">Bulk product import</h1>
      <p className="mt-1 mb-6 text-[var(--ink-70)]">
        Add or update products directly in the grid, or upload a CSV/Excel file. Existing products
        are matched by SKU. Prices, <span style={{ fontFamily: "var(--font-data)" }}>compositionKey</span> and{" "}
        <span style={{ fontFamily: "var(--font-data)" }}>unitPrice</span> are recomputed on save.
      </p>

      <div className="mb-6">
        <ImportTemplateManager />
      </div>

      <ProductBulkImportClient />
    </div>
  )
}
