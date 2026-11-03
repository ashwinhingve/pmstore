/**
 * Turn an uploaded catalogue file into CSV text.
 *
 * A `.csv` is read as-is; an Excel file has its FIRST sheet converted to CSV via
 * the `xlsx` library (dynamically imported so it never ships in the page bundle).
 * Client-only — it reads a browser `File`.
 */
export async function fileToCsv(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    return file.text();
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const first = wb.SheetNames[0];
    if (!first) throw new Error('That spreadsheet has no sheets.');
    return XLSX.utils.sheet_to_csv(wb.Sheets[first]);
  }
  throw new Error('Unsupported file. Upload a .csv or .xlsx file.');
}
