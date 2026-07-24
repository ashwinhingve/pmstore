/**
 * Pure CSV parser — no database, no side effects.
 *
 * Handles:
 * - CRLF and LF line endings
 * - Quoted fields with embedded commas and newlines
 * - Escaped double-quotes (`""` → `"`)
 * - BOM trimming
 * - Empty trailing lines
 */

/**
 * Parse CSV text into an array of record objects keyed by header.
 *
 * @param text - Raw CSV text (CRLF or LF)
 * @returns Array of records, one per data row, keyed by header name
 */
export function parseCsv(text: string): Record<string, string>[] {
  // Trim BOM if present
  let content = text.startsWith('﻿') ? text.slice(1) : text;

  // Normalize to LF, split into lines
  const lines = content.replace(/\r\n/g, '\n').split('\n');

  // Find first non-empty line as header
  let headerIdx = 0;
  while (headerIdx < lines.length && !lines[headerIdx].trim()) {
    headerIdx++;
  }

  if (headerIdx >= lines.length) {
    return [];
  }

  // Parse header row
  const headers = parseRow(lines[headerIdx]);
  if (headers.length === 0) {
    return [];
  }

  // Accumulate rows, handling multi-line quoted fields
  const result: Record<string, string>[] = [];
  let i = headerIdx + 1;

  while (i < lines.length) {
    const row = parseRowFromLines(lines, i);
    if (!row.isEmpty) {
      const record: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = row.fields[j] ?? '';
      }
      result.push(record);
      i = row.nextIdx;
    } else {
      i++;
    }
  }

  return result;
}

/**
 * Parse a single CSV row into fields, handling quotes and escaped quotes.
 * Returns an array of field values.
 */
function parseRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote: `""` → `"`
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field delimiter
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Push final field
  fields.push(current.trim());
  return fields;
}

/**
 * Parse rows starting from a given line index, handling multi-line quoted fields.
 * Returns the parsed fields and the index of the next line to process.
 */
function parseRowFromLines(
  lines: string[],
  startIdx: number
): { fields: string[]; nextIdx: number; isEmpty: boolean } {
  let accum = lines[startIdx] ?? '';
  let i = startIdx + 1;

  // Count quotes to detect unclosed quoted fields
  while (i < lines.length && isQuoteUnbalanced(accum)) {
    accum += '\n' + (lines[i] ?? '');
    i++;
  }

  const trimmed = accum.trim();
  if (!trimmed) {
    return { fields: [], nextIdx: i, isEmpty: true };
  }

  const fields = parseRow(accum);
  return { fields, nextIdx: i, isEmpty: false };
}

/**
 * Check if a string has an unbalanced number of unescaped quotes.
 * This is a heuristic: we count quotes outside of escaped-quote pairs.
 */
function isQuoteUnbalanced(text: string): boolean {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') {
      if (text[i + 1] === '"') {
        // Escaped quote: skip it
        i++;
      } else {
        // Unescaped quote
        count++;
      }
    }
  }
  return count % 2 !== 0;
}

/**
 * Convert an array of records into CSV text.
 *
 * @param rows - Array of record objects
 * @param columns - Ordered list of column names to include (optional; if omitted, uses keys from first row)
 * @returns CSV text with proper quoting
 */
export function toCsv(
  rows: Record<string, string | number | boolean | undefined>[],
  columns?: string[]
): string {
  if (rows.length === 0) {
    return '';
  }

  // Determine columns
  const cols = columns ?? Object.keys(rows[0]);

  // Build header
  const header = cols.map(quoteField).join(',');
  const lines = [header];

  // Build data rows
  for (const row of rows) {
    const values = cols.map((col) => {
      const val = row[col];
      const str = val === undefined || val === null ? '' : String(val);
      return quoteField(str);
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Quote a CSV field if it contains comma, quote, or newline; escape quotes as `""`.
 */
function quoteField(value: string): string {
  if (!value) {
    return '';
  }

  const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n');

  if (!needsQuotes) {
    return value;
  }

  // Escape quotes and wrap in quotes
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}
