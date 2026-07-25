"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import {
  UploadCloud,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImportError {
  sku?: string
  reason: string
}
interface ImportResult {
  created: number
  updated: number
  failed: number
  errors: ImportError[]
}

// The column contract the importer expects (src/lib/import/product-row.ts).
const TEMPLATE_HEADERS = [
  "sku", "name", "brand", "manufacturer", "category", "form", "pack_size", "pack_unit",
  "salt_1_name", "salt_1_strength", "salt_1_unit",
  "salt_2_name", "salt_2_strength", "salt_2_unit",
  "price", "mrp", "gst_rate", "stock", "schedule_class", "prescription_required", "hsn_code",
  "short_description", "storage_instructions", "usage_instructions",
  "side_effects", "contraindications", "image_url_1", "image_url_2", "tags", "is_active",
]

const TEMPLATE_EXAMPLE: Record<string, string> = {
  sku: "PMS-TAB-DOLO-650", name: "Dolo 650", brand: "Dolo", manufacturer: "Micro Labs",
  category: "Pain Relief", form: "tablet", pack_size: "15", pack_unit: "tablets",
  salt_1_name: "Paracetamol", salt_1_strength: "650", salt_1_unit: "mg",
  salt_2_name: "", salt_2_strength: "", salt_2_unit: "",
  price: "30.50", mrp: "36", gst_rate: "12", stock: "100",
  schedule_class: "OTC", prescription_required: "FALSE", hsn_code: "3004",
  short_description: "Paracetamol 650 mg for fever and pain",
  storage_instructions: "Store below 30 C", usage_instructions: "As directed by the physician",
  side_effects: "Nausea|Rash", contraindications: "Severe liver disease",
  image_url_1: "", image_url_2: "", tags: "", is_active: "TRUE",
}

const REQUIRED_COLUMNS = ["sku", "name", "manufacturer", "category", "form", "price", "pack_size"]

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

/** Read a CSV file directly, or convert the first sheet of an Excel file to CSV. */
async function fileToCsv(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith(".csv") || file.type === "text/csv") return file.text()
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx")
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: "array" })
    const first = wb.SheetNames[0]
    if (!first) throw new Error("That spreadsheet has no sheets.")
    return XLSX.utils.sheet_to_csv(wb.Sheets[first])
  }
  throw new Error("Unsupported file. Upload a .csv or .xlsx file.")
}

export function ProductImportClient() {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<ImportResult | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    setError("")
    setResult(null)
    if (accepted[0]) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
  })

  async function handleImport() {
    if (!file) return
    setBusy(true)
    setError("")
    setResult(null)
    try {
      const csv = await fileToCsv(file)
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csv,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : data?.error?.message || "The import could not be completed."
        setError(msg)
        return
      }
      setResult(data.data as ImportResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.")
    } finally {
      setBusy(false)
    }
  }

  function triggerDownload(contents: string, filename: string) {
    const blob = new Blob([contents], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function downloadTemplate() {
    const header = TEMPLATE_HEADERS.join(",")
    const example = TEMPLATE_HEADERS.map((h) => csvCell(TEMPLATE_EXAMPLE[h] ?? "")).join(",")
    triggerDownload(`${header}\n${example}\n`, "product-import-template.csv")
  }

  function downloadFailedRows() {
    if (!result?.errors.length) return
    const rows = result.errors.map((e) => `${csvCell(e.sku ?? "")},${csvCell(e.reason)}`)
    triggerDownload(["sku,reason", ...rows].join("\n") + "\n", "product-import-failed-rows.csv")
  }

  return (
    <div className="space-y-6">
      {/* Template */}
      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-[var(--ink)]">Start from the template</h2>
          <p className="mt-1 text-sm text-[var(--ink-70)]">
            Required columns:{" "}
            <span style={{ fontFamily: "var(--font-data)" }} className="text-[var(--ink)]">
              {REQUIRED_COLUMNS.join(", ")}
            </span>
            . Add salts as{" "}
            <span style={{ fontFamily: "var(--font-data)" }}>salt_1_name / salt_1_strength / salt_1_unit</span>.
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate} className="shrink-0 gap-2">
          <Download className="h-4 w-4" /> Download template
        </Button>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed p-10 text-center transition-colors ${
          isDragActive
            ? "border-[var(--mint)] bg-[var(--mint-soft)]"
            : "border-[var(--foil)] bg-[var(--paper-card)] hover:bg-[var(--foil-soft)]"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mb-3 h-10 w-10 text-[var(--ink-40)]" aria-hidden="true" />
        <p className="font-medium text-[var(--ink)]">
          {isDragActive ? "Drop the file to load it" : "Drag a CSV or Excel file here"}
        </p>
        <p className="mt-1 text-sm text-[var(--ink-70)]">or click to choose · .csv, .xlsx</p>
      </div>

      {/* Selected file */}
      {file && (
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="h-5 w-5 shrink-0 text-[var(--ink-70)]" aria-hidden="true" />
            <span className="truncate text-[var(--ink)]">{file.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button onClick={handleImport} disabled={busy} className="gap-2">
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Importing…
                </>
              ) : (
                "Import"
              )}
            </Button>
            {!busy && (
              <button
                type="button"
                onClick={() => {
                  setFile(null)
                  setError("")
                  setResult(null)
                }}
                aria-label="Remove file"
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-40)] hover:bg-[var(--foil-soft)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-[var(--ink)]"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[var(--mint)]" aria-hidden="true" />
            <h2 className="font-semibold text-[var(--ink)]">Import finished</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Created" value={result.created} tone="mint" />
            <Stat label="Updated" value={result.updated} tone="mint" />
            <Stat label="Failed" value={result.failed} tone="ink" />
          </div>

          {result.errors.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--ink-70)]">
                  {result.failed > result.errors.length
                    ? `First ${result.errors.length} of ${result.failed} rows that failed`
                    : `${result.errors.length} row${result.errors.length === 1 ? "" : "s"} that failed`}
                </h3>
                <Button variant="outline" size="sm" onClick={downloadFailedRows} className="shrink-0 gap-2">
                  <Download className="h-4 w-4" /> Download failed rows
                </Button>
              </div>
              <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--foil-soft)]">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="bg-[var(--foil-soft)] text-xs uppercase tracking-wide text-[var(--ink-70)]">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">SKU</th>
                      <th scope="col" className="px-4 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i} className="border-t border-[var(--foil-soft)]">
                        <td className="px-4 py-2 text-[var(--ink)]" style={{ fontFamily: "var(--font-data)" }}>
                          {e.sku || "—"}
                        </td>
                        <td className="px-4 py-2 text-[var(--ink-70)]">{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "mint" | "ink" }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper)] p-4 text-center">
      <div
        className="text-2xl font-bold"
        style={{ fontFamily: "var(--font-data)", color: tone === "mint" ? "var(--mint)" : "var(--ink)" }}
      >
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wide text-[var(--ink-40)]">{label}</div>
    </div>
  )
}
