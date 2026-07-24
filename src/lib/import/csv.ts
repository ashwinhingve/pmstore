/**
 * Minimal RFC4180-ish CSV parser (quoted fields, embedded commas/newlines,
 * doubled-quote escaping). Pure and dependency-free so both the importer script
 * and its tests share exactly one parser.
 *
 * Returns one object per data row, keyed by the trimmed header names. Blank
 * lines are skipped.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      record.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.some((f) => f !== '')) rows.push(record);
      record = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || record.length) {
    record.push(field);
    if (record.some((f) => f !== '')) rows.push(record);
  }

  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => (obj[h] = r[i] ?? ''));
    return obj;
  });
}
