"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useDropzone } from "react-dropzone"
import {
  UploadCloud,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  ImagePlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  TEMPLATE_HEADERS,
  TEMPLATE_HEADER_LABELS,
  REQUIRED_COLUMNS,
  TEMPLATE_EXAMPLE,
  csvCell,
} from "@/lib/import/template-csv"
import { parseCsv, toCsv } from "@/lib/import/csv-parse"
import { applyColumnMapping } from "@/lib/import/column-mapper"

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
interface ValidateResult {
  totalRows: number
  valid: number
  willCreate: number
  willUpdate: number
  newCategories: string[]
  duplicateSkusInFile: string[]
  errors: ImportError[]
}
interface TemplateOption {
  id: string
  name: string
}
interface FullTemplate {
  id: string
  name: string
  includedOptionalFields: string[]
  defaultManufacturer?: string
  defaultSalt?: string
  columnMapping?: Record<string, string>
}

const CANONICAL_HEADERS = new Set(TEMPLATE_HEADERS)
const CHUNK_SIZE_WITH_IMAGES = 40
const CHUNK_SIZE_NO_IMAGES = 100

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

function StepSection({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="data flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-semibold text-[var(--paper-card)]"
          style={{ fontFamily: "var(--font-data)" }}
          aria-hidden="true"
        >
          {number}
        </span>
        <h2 className="font-semibold text-[var(--ink)]">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export function ProductImportClient() {
  const [file, setFile] = useState<File | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [templateId, setTemplateId] = useState("")
  const [fullTemplate, setFullTemplate] = useState<FullTemplate | null>(null)

  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [mappingExpanded, setMappingExpanded] = useState(false)
  const [savingMapping, setSavingMapping] = useState(false)

  const [previewBusy, setPreviewBusy] = useState(false)
  const [validation, setValidation] = useState<ValidateResult | null>(null)

  const [importBusy, setImportBusy] = useState(false)
  const [progress, setProgress] = useState<{
    doneRows: number
    totalRows: number
    doneChunks: number
    totalChunks: number
  } | null>(null)

  const [error, setError] = useState("")
  const [result, setResult] = useState<ImportResult | null>(null)

  useEffect(() => {
    fetch("/api/admin/products/import-templates")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.data)) {
          setTemplates(data.data.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })))
        }
      })
      .catch(() => {})
  }, [])

  // Fetch the full template (including its saved column mapping) whenever a
  // different one is selected — the dropdown list above only carries id+name.
  useEffect(() => {
    if (!templateId) {
      setFullTemplate(null)
      return
    }
    let cancelled = false
    fetch(`/api/admin/products/import-templates/${templateId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.data) setFullTemplate(data.data as FullTemplate)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [templateId])

  // Seed the working column mapping from the selected template's saved one.
  useEffect(() => {
    setColumnMapping(fullTemplate?.columnMapping ? { ...fullTemplate.columnMapping } : {})
    setMappingExpanded(false)
  }, [fullTemplate])

  // Parse the dropped file into rows as soon as it's selected — this both
  // detects headers (for the mapping form) and gives Preview/Import the row
  // count without re-reading the file each time.
  useEffect(() => {
    if (!file) {
      setParsedRows([])
      setDetectedHeaders([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const csv = await fileToCsv(file)
        const rows = parseCsv(csv)
        if (cancelled) return
        setParsedRows(rows)
        setDetectedHeaders(rows.length ? Object.keys(rows[0]) : [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not read that file.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [file])

  const onDrop = useCallback((accepted: File[]) => {
    setError("")
    setResult(null)
    setValidation(null)
    setProgress(null)
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

  function onImagesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setImages(Array.from(e.target.files ?? []))
  }

  // Every header that doesn't already match one of our canonical column
  // names — these are the ones that need (or already have) a mapping.
  const mappableHeaders = useMemo(
    () => detectedHeaders.filter((h) => !CANONICAL_HEADERS.has(h)),
    [detectedHeaders]
  )
  const allMapped = mappableHeaders.length > 0 && mappableHeaders.every((h) => columnMapping[h])
  const showMappingForm = mappableHeaders.length > 0 && (mappingExpanded || !allMapped)

  // Rows remapped onto canonical columns — a no-op for any header that
  // already matched, or wasn't given an explicit mapping.
  const mappedRows = useMemo(
    () => parsedRows.map((r) => applyColumnMapping(r, columnMapping)),
    [parsedRows, columnMapping]
  )

  function updateMapping(header: string, target: string) {
    setValidation(null)
    setResult(null)
    setColumnMapping((m) => {
      const next = { ...m }
      if (target) next[header] = target
      else delete next[header]
      return next
    })
  }

  async function saveMappingToTemplate() {
    if (!templateId || !fullTemplate) return
    setSavingMapping(true)
    try {
      const res = await fetch(`/api/admin/products/import-templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullTemplate.name,
          includedOptionalFields: fullTemplate.includedOptionalFields,
          defaultManufacturer: fullTemplate.defaultManufacturer,
          defaultSalt: fullTemplate.defaultSalt,
          columnMapping,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : data?.error?.message || "Could not save the column mapping.")
        return
      }
      setFullTemplate(data.data as FullTemplate)
    } catch {
      setError("Could not save the column mapping.")
    } finally {
      setSavingMapping(false)
    }
  }

  async function saveMappingAsNewTemplate() {
    const name = window.prompt("Name this template (e.g. the supplier's name):")
    if (!name || !name.trim()) return
    setSavingMapping(true)
    try {
      const res = await fetch("/api/admin/products/import-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), includedOptionalFields: [], columnMapping }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : data?.error?.message || "Could not save the template.")
        return
      }
      const created = data.data as FullTemplate
      setTemplates((ts) => [...ts, { id: created.id, name: created.name }])
      setTemplateId(created.id)
      setFullTemplate(created)
    } catch {
      setError("Could not save the template.")
    } finally {
      setSavingMapping(false)
    }
  }

  async function handlePreview() {
    if (!file || mappedRows.length === 0) return
    setPreviewBusy(true)
    setError("")
    setValidation(null)
    setResult(null)
    try {
      const csv = toCsv(mappedRows, TEMPLATE_HEADERS)
      const body = new FormData()
      body.append("file", new Blob([csv], { type: "text/csv" }), "preview.csv")
      if (templateId) body.append("templateId", templateId)

      const res = await fetch("/api/admin/products/import?mode=validate", { method: "POST", body })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : data?.error?.message || "The preview could not be completed.")
        return
      }
      setValidation(data.data as ValidateResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.")
    } finally {
      setPreviewBusy(false)
    }
  }

  async function handleImport() {
    if (!file || mappedRows.length === 0) return
    setImportBusy(true)
    setError("")
    setResult(null)

    const chunkSize = images.length > 0 ? CHUNK_SIZE_WITH_IMAGES : CHUNK_SIZE_NO_IMAGES
    const chunks: Record<string, string>[][] = []
    for (let i = 0; i < mappedRows.length; i += chunkSize) {
      chunks.push(mappedRows.slice(i, i + chunkSize))
    }

    const aggregate: ImportResult = { created: 0, updated: 0, failed: 0, errors: [] }
    setProgress({ doneRows: 0, totalRows: mappedRows.length, doneChunks: 0, totalChunks: chunks.length })

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const skusInChunk = new Set(chunk.map((r) => (r.sku || "").trim().toUpperCase()))
      const chunkImages = images.filter((img) =>
        skusInChunk.has(img.name.replace(/\.[^.]+$/, "").trim().toUpperCase())
      )

      const csv = toCsv(chunk, TEMPLATE_HEADERS)
      const body = new FormData()
      body.append("file", new Blob([csv], { type: "text/csv" }), `import-batch-${i + 1}.csv`)
      if (templateId) body.append("templateId", templateId)
      chunkImages.forEach((img) => body.append("images", img, img.name))

      try {
        const res = await fetch("/api/admin/products/import?mode=commit", { method: "POST", body })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const msg = typeof data?.error === "string" ? data.error : data?.error?.message || "A batch failed to import."
          setError(
            `Batch ${i + 1} of ${chunks.length} failed: ${msg} — ${aggregate.created + aggregate.updated} products were already imported. It's safe to click Import again; already-imported products won't be duplicated.`
          )
          setResult(aggregate)
          setImportBusy(false)
          setProgress(null)
          return
        }
        const batchResult = data.data as ImportResult
        aggregate.created += batchResult.created
        aggregate.updated += batchResult.updated
        aggregate.failed += batchResult.failed
        aggregate.errors.push(...batchResult.errors)
      } catch (e) {
        setError(
          `Batch ${i + 1} of ${chunks.length} failed: ${e instanceof Error ? e.message : "network error"} — ${aggregate.created + aggregate.updated} products were already imported. It's safe to click Import again; already-imported products won't be duplicated.`
        )
        setResult(aggregate)
        setImportBusy(false)
        setProgress(null)
        return
      }

      setProgress({
        doneRows: Math.min((i + 1) * chunkSize, mappedRows.length),
        totalRows: mappedRows.length,
        doneChunks: i + 1,
        totalChunks: chunks.length,
      })
    }

    setResult(aggregate)
    setImportBusy(false)
    setProgress(null)
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
    if (templateId) {
      // Template-scoped download is built server-side (it also bakes in the
      // template's example manufacturer/salt, if set).
      window.location.href = `/api/admin/products/import-templates/${templateId}/download`
      return
    }
    const header = TEMPLATE_HEADERS.join(",")
    const example = TEMPLATE_HEADERS.map((h) => csvCell(TEMPLATE_EXAMPLE[h] ?? "")).join(",")
    triggerDownload(`${header}\n${example}\n`, "product-import-template.csv")
  }

  function downloadExport() {
    window.location.href = templateId
      ? `/api/admin/products/export?templateId=${encodeURIComponent(templateId)}`
      : "/api/admin/products/export"
  }

  function downloadFailedRows() {
    if (!result?.errors.length) return
    const rows = result.errors.map((e) => `${csvCell(e.sku ?? "")},${csvCell(e.reason)}`)
    triggerDownload(["sku,reason", ...rows].join("\n") + "\n", "product-import-failed-rows.csv")
  }

  function downloadPreviewErrors() {
    if (!validation?.errors.length) return
    const rows = validation.errors.map((e) => `${csvCell(e.sku ?? "")},${csvCell(e.reason)}`)
    triggerDownload(["sku,reason", ...rows].join("\n") + "\n", "product-import-preview-errors.csv")
  }

  const progressPct = progress ? Math.round((progress.doneRows / Math.max(progress.totalRows, 1)) * 100) : 0

  // Steps 3 and 4 only apply once a file is loaded (and step 3 only when the
  // file's headers need mapping), so number sequentially over whichever
  // steps actually apply — no gaps like "step 2, step 4" when 3 is skipped.
  const stepFlags = {
    template: true,
    upload: true,
    mapping: file !== null && mappableHeaders.length > 0,
    photos: file !== null,
    review: file !== null,
  }
  let stepCounter = 0
  const stepNumbers = Object.fromEntries(
    Object.entries(stepFlags).map(([key, visible]) => [key, visible ? ++stepCounter : 0])
  ) as Record<keyof typeof stepFlags, number>

  return (
    <div className="space-y-6">
      {/* Export lives outside the numbered import flow — related, not a step */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-[var(--ink-70)]">
          Already have products to check against?{" "}
          <span className="text-[var(--ink-40)]">
            {templateId
              ? "Export downloads every active product, scoped to the template selected below."
              : "Export downloads every product with every field."}
          </span>
        </p>
        <Button variant="ghost" size="sm" onClick={downloadExport} className="shrink-0 gap-2">
          <Download className="h-4 w-4" /> Export current catalogue
        </Button>
      </div>

      {/* Step 1 — Get the template */}
      <StepSection number={stepNumbers.template} title="Get the template">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--ink-70)]">
            Required columns:{" "}
            <span style={{ fontFamily: "var(--font-data)" }} className="text-[var(--ink)]">
              {REQUIRED_COLUMNS.join(", ")}
            </span>
            . Add salts as{" "}
            <span style={{ fontFamily: "var(--font-data)" }}>salt_1_name / salt_1_strength / salt_1_unit</span>.
          </p>
          <Button variant="outline" onClick={downloadTemplate} className="shrink-0 gap-2">
            <Download className="h-4 w-4" /> Download template
          </Button>
        </div>

        {templates.length > 0 && (
          <div className="mt-4">
            <label htmlFor="import-template" className="mb-1 block text-sm font-medium text-[var(--ink)]">
              Use a saved template
            </label>
            <select
              id="import-template"
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value)
                setValidation(null)
                setResult(null)
              }}
              className="h-11 w-full max-w-sm rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper)] px-3 text-sm text-[var(--ink)]"
            >
              <option value="">All fields (default)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {templateId && (
              <p className="mt-1 text-xs text-[var(--ink-70)]">
                This template also requires a salt/formula and a product image on every row —
                manage templates above.
              </p>
            )}
          </div>
        )}
      </StepSection>

      {/* Step 2 — Upload your file, then check or import it */}
      <StepSection number={stepNumbers.upload} title="Upload your file">
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed p-10 text-center transition-colors ${
            isDragActive
              ? "border-[var(--brand)] bg-[var(--brand-soft)]"
              : "border-[var(--foil)] bg-[var(--paper)] hover:bg-[var(--foil-soft)]"
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="mb-3 h-10 w-10 text-[var(--ink-40)]" aria-hidden="true" />
          <p className="font-medium text-[var(--ink)]">
            {isDragActive ? "Drop the file to load it" : "Drag a CSV or Excel file here"}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-70)]">or click to choose · .csv, .xlsx</p>
        </div>

        {file && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="h-5 w-5 shrink-0 text-[var(--ink-70)]" aria-hidden="true" />
              <span className="truncate text-[var(--ink)]">{file.name}</span>
              {parsedRows.length > 0 && (
                <span className="data text-xs text-[var(--ink-40)]">{parsedRows.length} rows</span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" onClick={handlePreview} disabled={previewBusy || importBusy} className="gap-2">
                {previewBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                  </>
                ) : (
                  "Preview"
                )}
              </Button>
              <Button
                onClick={handleImport}
                disabled={!validation || previewBusy || importBusy}
                title={!validation ? "Run Preview first" : undefined}
                className="gap-2"
              >
                {importBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Importing…
                  </>
                ) : (
                  "Import"
                )}
              </Button>
              {!previewBusy && !importBusy && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    setError("")
                    setResult(null)
                    setValidation(null)
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

        {progress && (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper)] p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-[var(--ink)]">
                Importing… {progress.doneRows}/{progress.totalRows} rows ({progress.doneChunks}/{progress.totalChunks} batches)
              </span>
              <span className="data text-[var(--ink-70)]">{progressPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--foil-soft)]">
              <div
                className="h-full bg-[var(--brand)] transition-[width] duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </StepSection>

      {/* Step 3 — Match columns, only shown when the file's headers don't already match ours */}
      {stepFlags.mapping && (
        <StepSection number={stepNumbers.mapping} title="Match columns">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--ink-70)]">
              {allMapped
                ? `Using ${templateId ? "the saved" : "your"} mapping for ${mappableHeaders.length} column${
                    mappableHeaders.length === 1 ? "" : "s"
                  } that ${mappableHeaders.length === 1 ? "doesn't" : "don't"} match our column names.`
                : `${mappableHeaders.length} column${mappableHeaders.length === 1 ? "" : "s"} in your file ${
                    mappableHeaders.length === 1 ? "doesn't" : "don't"
                  } match our column names — map ${mappableHeaders.length === 1 ? "it" : "them"} below.`}
            </p>
            {allMapped && (
              <Button type="button" size="sm" variant="outline" onClick={() => setMappingExpanded((v) => !v)}>
                {mappingExpanded ? "Hide" : "Edit mapping"}
              </Button>
            )}
          </div>

          {showMappingForm && (
            <>
              <div className="mt-4 space-y-2">
                {mappableHeaders.map((header) => (
                  <div key={header} className="flex items-center gap-3">
                    <span
                      className="w-1/2 truncate text-sm text-[var(--ink)]"
                      style={{ fontFamily: "var(--font-data)" }}
                      title={header}
                    >
                      {header}
                    </span>
                    <select
                      aria-label={`Map column "${header}"`}
                      value={columnMapping[header] ?? ""}
                      onChange={(e) => updateMapping(header, e.target.value)}
                      className="h-11 flex-1 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper)] px-3 text-sm text-[var(--ink)]"
                    >
                      <option value="">— not used —</option>
                      {TEMPLATE_HEADERS.map((key) => (
                        <option key={key} value={key}>
                          {TEMPLATE_HEADER_LABELS[key] ?? key}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                {templateId ? (
                  <Button type="button" size="sm" variant="secondary" onClick={saveMappingToTemplate} loading={savingMapping}>
                    Save this mapping to the template
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={saveMappingAsNewTemplate}
                    loading={savingMapping}
                    disabled={Object.keys(columnMapping).length === 0}
                  >
                    Save mapping as a new template…
                  </Button>
                )}
              </div>
            </>
          )}
        </StepSection>
      )}

      {/* Step 4 — optional batch of product images, matched to rows by filename = SKU */}
      {stepFlags.photos && (
        <StepSection number={stepNumbers.photos} title="Add photos (optional)">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--ink)]">
            <ImagePlus className="h-4 w-4 shrink-0 text-[var(--ink-70)]" aria-hidden="true" />
            Choose product images
            <input type="file" accept="image/*" multiple className="sr-only" onChange={onImagesSelected} />
          </label>
          <p className="mt-1 text-xs text-[var(--ink-70)]">
            Name each file after its SKU (e.g. <span style={{ fontFamily: "var(--font-data)" }}>PMS-TAB-DOLO-650.jpg</span>) — matched rows get the image attached automatically. A missing match doesn&apos;t fail the row.
          </p>
          {images.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {images.map((img) => (
                <li
                  key={img.name}
                  className="rounded-[var(--radius-pill)] bg-[var(--foil-soft)] px-2.5 py-1 text-xs text-[var(--ink-70)]"
                  style={{ fontFamily: "var(--font-data)" }}
                >
                  {img.name}
                </li>
              ))}
            </ul>
          )}
        </StepSection>
      )}

      {/* Step 5 — preview and import results */}
      {stepFlags.review && (
        <StepSection number={stepNumbers.review} title="Preview & import">
          {!error && !validation && !result && (
            <p className="text-sm text-[var(--ink-70)]">
              Click Preview above to check your file before anything is written to the store.
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-[var(--ink)]"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          {/* Preview (validate mode) — nothing has been written yet */}
          {validation && !result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[var(--brand)]" aria-hidden="true" />
                <h3 className="font-semibold text-[var(--ink)]">Preview — nothing has been imported yet</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Valid rows" value={validation.valid} tone="mint" />
                <Stat label="New products" value={validation.willCreate} tone="mint" />
                <Stat label="Existing products" value={validation.willUpdate} tone="mint" />
                <Stat label="Errors" value={validation.totalRows - validation.valid} tone="ink" />
              </div>
              <p className="text-xs text-[var(--ink-70)]">
                Existing products are already in your store — they&apos;ll be updated, not duplicated.
              </p>

              {validation.duplicateSkusInFile.length > 0 && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)]"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>
                    {validation.duplicateSkusInFile.length} SKU{validation.duplicateSkusInFile.length === 1 ? "" : "s"}{" "}
                    {validation.duplicateSkusInFile.length === 1 ? "appears" : "appear"} more than once in this file —
                    only the last row for each will be imported:{" "}
                    <span style={{ fontFamily: "var(--font-data)" }}>{validation.duplicateSkusInFile.join(", ")}</span>
                  </p>
                </div>
              )}

              {validation.newCategories.length > 0 && (
                <p className="text-sm text-[var(--ink-70)]">
                  New categories that will be created: {validation.newCategories.join(", ")}
                </p>
              )}

              {validation.errors.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-[var(--ink-70)]">
                      {validation.totalRows - validation.valid > validation.errors.length
                        ? `First ${validation.errors.length} of ${validation.totalRows - validation.valid} rows with errors`
                        : `${validation.errors.length} row${validation.errors.length === 1 ? "" : "s"} with errors`}
                    </h4>
                    <Button variant="outline" size="sm" onClick={downloadPreviewErrors} className="shrink-0 gap-2">
                      <Download className="h-4 w-4" /> Download errors
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
                        {validation.errors.map((e, i) => (
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

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[var(--brand)]" aria-hidden="true" />
                <h3 className="font-semibold text-[var(--ink)]">Import finished</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Created" value={result.created} tone="mint" />
                <Stat label="Updated" value={result.updated} tone="mint" />
                <Stat label="Failed" value={result.failed} tone="ink" />
              </div>

              {result.errors.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-[var(--ink-70)]">
                      {result.failed > result.errors.length
                        ? `First ${result.errors.length} of ${result.failed} rows that failed`
                        : `${result.errors.length} row${result.errors.length === 1 ? "" : "s"} that failed`}
                    </h4>
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
        </StepSection>
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
