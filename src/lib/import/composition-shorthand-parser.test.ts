import { describe, it, expect } from 'vitest';
import { parseCompositionShorthand, saltsToshorthand, normalizeAndValidateForm } from './composition-shorthand-parser';

describe('parseCompositionShorthand', () => {
  describe('valid single-salt compositions', () => {
    it('parses "Paracetamol 650mg"', () => {
      const result = parseCompositionShorthand('Paracetamol 650mg');
      expect(result.ok).toBe(true);
      expect(result.salts).toHaveLength(1);
      expect(result.salts?.[0]).toEqual({
        name: 'paracetamol',
        strength: 650,
        unit: 'mg',
      });
    });

    it('parses with space between strength and unit', () => {
      const result = parseCompositionShorthand('Paracetamol 650 mg');
      expect(result.ok).toBe(true);
      expect(result.salts?.[0]).toEqual({
        name: 'paracetamol',
        strength: 650,
        unit: 'mg',
      });
    });

    it('parses decimal strengths', () => {
      const result = parseCompositionShorthand('Vitamin B12 0.5 mcg');
      expect(result.ok).toBe(true);
      expect(result.salts?.[0]).toEqual({
        name: 'cyanocobalamin',
        strength: 0.5,
        unit: 'mcg',
      });
    });

    it('parses mcg unit', () => {
      const result = parseCompositionShorthand('Vitamin D3 1000 mcg');
      expect(result.ok).toBe(true);
      expect(result.salts?.[0].unit).toBe('mcg');
    });

    it('normalizes salt names (handles aliases)', () => {
      // "acetaminophen" is an alias for "paracetamol"
      const result = parseCompositionShorthand('acetaminophen 500 mg');
      expect(result.ok).toBe(true);
      expect(result.salts?.[0].name).toBe('paracetamol');
    });

    it('handles various known units', () => {
      const units = ['mg', 'mcg', 'g', 'ml', 'iu', '%'];
      for (const unit of units) {
        const result = parseCompositionShorthand(`Medication 100 ${unit}`);
        expect(result.ok).toBe(true);
        expect(result.salts?.[0].unit).toBe(unit as any);
      }
    });
  });

  describe('valid multi-salt compositions', () => {
    it('parses "Paracetamol 650mg + Caffeine 50mg"', () => {
      const result = parseCompositionShorthand('Paracetamol 650mg + Caffeine 50mg');
      expect(result.ok).toBe(true);
      expect(result.salts).toHaveLength(2);
      expect(result.salts?.[0]).toEqual({
        name: 'paracetamol',
        strength: 650,
        unit: 'mg',
      });
      expect(result.salts?.[1]).toEqual({
        name: 'caffeine',
        strength: 50,
        unit: 'mg',
      });
    });

    it('parses three-ingredient combination', () => {
      const result = parseCompositionShorthand(
        'Paracetamol 650mg + Caffeine 50mg + Ibuprofen 200mg'
      );
      expect(result.ok).toBe(true);
      expect(result.salts).toHaveLength(3);
    });

    it('handles extra spaces around + operator', () => {
      const result = parseCompositionShorthand(
        'Paracetamol 650mg   +   Caffeine 50mg'
      );
      expect(result.ok).toBe(true);
      expect(result.salts).toHaveLength(2);
    });

    it('parses Amoxicillin + Clavulanic Acid combination', () => {
      const result = parseCompositionShorthand(
        'Amoxicillin 500mg + Clavulanic Acid 125mg'
      );
      expect(result.ok).toBe(true);
      expect(result.salts).toHaveLength(2);
      expect(result.salts?.[0].name).toBe('amoxicillin');
      expect(result.salts?.[1].name).toBe('clavulanic acid');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = parseCompositionShorthand('');
      expect(result.ok).toBe(true);
      expect(result.salts).toEqual([]);
    });

    it('handles whitespace-only string', () => {
      const result = parseCompositionShorthand('   ');
      expect(result.ok).toBe(true);
      expect(result.salts).toEqual([]);
    });

    it('handles case-insensitive units', () => {
      const result = parseCompositionShorthand('Paracetamol 650 MG');
      expect(result.ok).toBe(true);
      expect(result.salts?.[0].unit).toBe('mg');
    });

    it('handles salt names with multiple words', () => {
      const result = parseCompositionShorthand('Clavulanic Acid 125mg');
      expect(result.ok).toBe(true);
      expect(result.salts?.[0].name).toBe('clavulanic acid');
    });

    it('handles salt names with "B Complex"', () => {
      const result = parseCompositionShorthand('Vitamin B Complex 100mg');
      expect(result.ok).toBe(true);
      expect(result.salts?.[0].name).toBe('vitamin b complex');
    });
  });

  describe('error cases', () => {
    it('rejects missing unit', () => {
      const result = parseCompositionShorthand('Paracetamol 650');
      expect(result.ok).toBe(false);
      expect(result.error).toContain("doesn't match pattern");
    });

    it('rejects invalid unit', () => {
      const result = parseCompositionShorthand('Paracetamol 650 kg');
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects negative strength', () => {
      const result = parseCompositionShorthand('Paracetamol -650mg');
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects zero strength', () => {
      const result = parseCompositionShorthand('Paracetamol 0mg');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid strength');
    });

    it('rejects missing salt name', () => {
      const result = parseCompositionShorthand('650mg');
      expect(result.ok).toBe(false);
    });

    it('rejects malformed multi-salt when one part is bad', () => {
      const result = parseCompositionShorthand(
        'Paracetamol 650mg + Invalid Part'
      );
      expect(result.ok).toBe(false);
      expect(result.error).toContain("doesn't match pattern");
    });

    it('rejects non-numeric strength', () => {
      const result = parseCompositionShorthand('Paracetamol abc mg');
      expect(result.ok).toBe(false);
      expect(result.error).toContain("doesn't match pattern");
    });
  });

  describe('roundtrip (parse + serialize)', () => {
    it('roundtrip: "Paracetamol 650mg"', () => {
      const input = 'Paracetamol 650mg';
      const parsed = parseCompositionShorthand(input);
      expect(parsed.ok).toBe(true);

      const serialized = saltsToshorthand(parsed.salts!);
      // Note: the serialized form will be normalized, so check structure not exact string
      expect(serialized).toBe('paracetamol 650mg');
    });

    it('roundtrip: multi-salt composition', () => {
      const parsed = parseCompositionShorthand(
        'Paracetamol 650mg + Caffeine 50mg'
      );
      expect(parsed.ok).toBe(true);

      const serialized = saltsToshorthand(parsed.salts!);
      expect(serialized).toContain('paracetamol');
      expect(serialized).toContain('caffeine');
      expect(serialized).toContain('+');
    });
  });

  describe('saltsToshorthand', () => {
    it('serializes empty array to empty string', () => {
      const result = saltsToshorthand([]);
      expect(result).toBe('');
    });

    it('serializes single salt', () => {
      const result = saltsToshorthand([
        { name: 'paracetamol', strength: 650, unit: 'mg' },
      ]);
      expect(result).toBe('paracetamol 650mg');
    });

    it('serializes multiple salts with +', () => {
      const result = saltsToshorthand([
        { name: 'paracetamol', strength: 650, unit: 'mg' },
        { name: 'caffeine', strength: 50, unit: 'mg' },
      ]);
      expect(result).toBe('paracetamol 650mg + caffeine 50mg');
    });

    it('handles decimal strengths', () => {
      const result = saltsToshorthand([
        { name: 'vitamin b12', strength: 0.5, unit: 'mcg' },
      ]);
      expect(result).toBe('vitamin b12 0.5mcg');
    });
  });

  describe('normalizeAndValidateForm', () => {
    it('accepts valid forms', () => {
      const forms = ['tablet', 'syrup', 'injection', 'cream'];
      for (const form of forms) {
        const result = normalizeAndValidateForm(form);
        expect(result.ok).toBe(true);
        expect(result.form).toBe(form);
      }
    });

    it('normalizes capsule -> tablet', () => {
      const result = normalizeAndValidateForm('capsule');
      expect(result.ok).toBe(true);
      expect(result.form).toBe('tablet');
    });

    it('normalizes suspension -> syrup', () => {
      const result = normalizeAndValidateForm('suspension');
      expect(result.ok).toBe(true);
      expect(result.form).toBe('syrup');
    });

    it('rejects invalid form', () => {
      const result = normalizeAndValidateForm('invalid_form');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid dosage form');
    });

    it('rejects empty form', () => {
      const result = normalizeAndValidateForm('');
      expect(result.ok).toBe(false);
    });
  });
});
