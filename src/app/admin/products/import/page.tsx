import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireAdmin } from "@/lib/auth-helpers"
import { ProductImportClient } from "@/components/admin/products/ProductImportClient"

export const metadata: Metadata = {
  title: "Import products",
}

export default async function ProductImportPage() {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--ink-70)] hover:text-[var(--ink)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      <h1 className="text-2xl font-bold text-[var(--ink)]">Import products</h1>
      <p className="mt-1 mb-6 text-[var(--ink-70)]">
        Upload a CSV or Excel file to add or update products in bulk. Existing products are matched
        by SKU. Prices, <span style={{ fontFamily: "var(--font-data)" }}>compositionKey</span> and{" "}
        <span style={{ fontFamily: "var(--font-data)" }}>unitPrice</span> are recomputed on save.
      </p>

      <ProductImportClient />
    </div>
  )
}
