import { describe, it, expect } from 'vitest';
import { parseCsv } from './csv-parse';
import { parseProductRow } from './product-row';
import {
  toWorkingRows, validateRows, rowsWithErrors, workingRowsToCsv, errorReportCsv,
  type WorkingRow,
} from './wizard-row';
import { detectColumns } from './column-detect';

const completeRow = (over: Partial<WorkingRow> = {}): WorkingRow => ({
  sku: 'PMS-1', name: 'Dolo 650', manufacturer: 'Micro Labs', category: 'General & OTC',
  composition: 'Paracetamol 650mg', form: 'tablet', price: '30.5', pack_size: '15',
  pack_unit: 'tablet', mrp: '36', stock: '10', ...over,
});

describe('toWorkingRows', () => {
  it('applies a column mapping to raw rows', () => {
    const raw = [{ 'Product Name': 'Dolo 650', MRP: '36', 'Selling Price': '30.5' }];
    const mapping = detectColumns(Object.keys(raw[0]));
    const rows = toWorkingRows(raw, mapping);
    expect(rows[0].name).toBe('Dolo 650');
    expect(rows[0].mrp).toBe('36');
    expect(rows[0].price).toBe('30.5');
  });

  it('rebuilds a composition string from split salt_* columns (re-importing an export)', () => {
    const raw = [{
      sku: 'X', name: 'Combo', salt_1_name: 'Paracetamol', salt_1_strength: '650', salt_1_unit: 'mg',
      salt_2_name: 'Caffeine', salt_2_strength: '50', salt_2_unit: 'mg',
    }];
    const mapping = detectColumns(Object.keys(raw[0])); // no "composition" column present
    const rows = toWorkingRows(raw, mapping);
    expect(rows[0].composition).toBe('Paracetamol 650mg + Caffeine 50mg');
  });
});

describe('validateRows', () => {
  it('reports a clean row with no errors', () => {
    const issues = validateRows([completeRow()]);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('flags missing required fields with plain-English messages', () => {
    const issues = validateRows([completeRow({ price: '', form: '' })]);
    const messages = issues.map((i) => i.message);
    expect(messages).toContain('Selling price is missing');
    expect(messages.some((m) => m.startsWith('Dosage form is missing'))).toBe(true);
    expect(rowsWithErrors(issues).has(0)).toBe(true);
  });

  it('rejects an unknown dosage form', () => {
    const issues = validateRows([completeRow({ form: 'blob' })]);
    expect(issues.some((i) => i.field === 'form' && i.severity === 'error')).toBe(true);
  });

  it('warns (not errors) when MRP is below the selling price', () => {
    const issues = validateRows([completeRow({ mrp: '10', price: '30' })]);
    const mrpIssue = issues.find((i) => i.field === 'mrp');
    expect(mrpIssue?.severity).toBe('warning');
  });

  it('warns when there is no composition', () => {
    const issues = validateRows([completeRow({ composition: '' })]);
    expect(issues.some((i) => i.field === 'composition' && i.severity === 'warning')).toBe(true);
  });
});

describe('workingRowsToCsv → the server parser accepts it', () => {
  it('round-trips a single-salt row to a valid ParsedProductRow', () => {
    const csv = workingRowsToCsv([completeRow()]);
    const parsed = parseCsv(csv);
    const result = parseProductRow(parsed[0]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.salts).toEqual([{ name: 'paracetamol', strength: 650, unit: 'mg' }]);
      expect(result.value.price).toBe(30.5);
      expect(result.value.packSize).toBe(15);
    }
  });

  it('expands a two-salt composition into salt_1 and salt_2', () => {
    const csv = workingRowsToCsv([
      completeRow({ composition: 'Amoxicillin 500mg + Clavulanic Acid 125mg' }),
    ]);
    const result = parseProductRow(parseCsv(csv)[0]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.salts).toHaveLength(2);
  });
});

describe('errorReportCsv', () => {
  it('lists failed SKUs with their reasons', () => {
    const csv = errorReportCsv([{ sku: 'PMS-9', reason: 'missing name' }]);
    expect(csv.split('\n')[0]).toBe('sku,problem');
    expect(csv).toContain('PMS-9');
    expect(csv).toContain('missing name');
  });
});
