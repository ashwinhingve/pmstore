import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock verifyAdminAccess
const verifyAdminAccessMock = vi.fn();
vi.mock('@/lib/auth-helpers', () => ({
  verifyAdminAccess: () => verifyAdminAccessMock(),
}));

// Mock connectDB
vi.mock('@/lib/mongodb/connection', () => ({ default: vi.fn() }));

// Mock buildCompositionKey
const buildCompositionKeyMock = vi.fn();
vi.mock('@/lib/pharma/composition', () => ({
  buildCompositionKey: (...args: any[]) => buildCompositionKeyMock(...args),
}));

// Mock Product model
const findMock = vi.fn();
const selectMock = vi.fn();
const limitMock = vi.fn();
const leanMock = vi.fn();

vi.mock('@/models/Product', () => ({
  default: {
    find: (...args: any[]) => findMock(...args),
  },
}));

// Mock createErrorResponse
const createErrorResponseMock = vi.fn();
vi.mock('@/lib/utils/errorHandler', () => ({
  createErrorResponse: (...args: any[]) => createErrorResponseMock(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  verifyAdminAccessMock.mockResolvedValue({ session: { user: { id: 'admin1' } } });
  findMock.mockReturnValue({ select: selectMock });
  selectMock.mockReturnValue({ limit: limitMock });
  limitMock.mockReturnValue({ lean: leanMock });
  buildCompositionKeyMock.mockReturnValue('paracetamol-650mg|tablet');
});

describe('POST /api/admin/products/check-duplicate', () => {
  it('rejects request without admin access', async () => {
    const error = new Response('Forbidden', { status: 403 });
    verifyAdminAccessMock.mockResolvedValue({ error });

    const req = new Request('http://localhost/api/admin/products/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Product' }),
    });

    const result = await POST(req);
    expect(result).toBe(error);
  });

  it('matches on normalized name only (case-insensitive)', async () => {
    leanMock.mockResolvedValue([
      {
        _id: 'id1',
        name: 'Paracetamol 650mg',
        manufacturer: 'Sun Pharma',
        packSize: 15,
        packUnit: 'tablet',
        compositionKey: 'paracetamol-650mg|tablet',
        slug: 'paracetamol-650mg',
        images: [],
        unitPrice: 4.33,
      },
    ]);

    const req = new Request('http://localhost/api/admin/products/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ name: 'PARACETAMOL 650MG' }),
    });

    const result = await POST(req);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0].name).toBe('Paracetamol 650mg');
  });

  it('matches on full composition when all fields are present', async () => {
    leanMock.mockResolvedValue([
      {
        _id: 'id2',
        name: 'Crocin 650',
        manufacturer: 'GSK',
        packSize: 15,
        packUnit: 'tablet',
        compositionKey: 'paracetamol-650mg|tablet',
        slug: 'crocin-650',
        images: [],
        unitPrice: 4.5,
      },
    ]);

    const req = new Request('http://localhost/api/admin/products/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Crocin 650',
        salts: [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
        form: 'tablet',
        manufacturer: 'GSK',
        packSize: 15,
      }),
    });

    const result = await POST(req);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(buildCompositionKeyMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Paracetamol', strength: 650, unit: 'mg' }),
      ]),
      'tablet'
    );
  });

  it('excludes currentProductId from results', async () => {
    leanMock.mockResolvedValue([]);

    const req = new Request('http://localhost/api/admin/products/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Aspirin 500',
        currentProductId: 'existing-product-id',
      }),
    });

    await POST(req);

    const queryArg = findMock.mock.calls[0][0];
    expect(queryArg._id).toEqual({ $ne: 'existing-product-id' });
  });

  it('returns empty array when no duplicates found', async () => {
    leanMock.mockResolvedValue([]);

    const req = new Request('http://localhost/api/admin/products/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ name: 'Unique Product Name XYZ' }),
    });

    const result = await POST(req);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(data.matches).toEqual([]);
  });

  it('limits results to 5 matches', async () => {
    const req = new Request('http://localhost/api/admin/products/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ name: 'Common Name' }),
    });

    await POST(req);

    expect(limitMock).toHaveBeenCalledWith(5);
  });

  it('serializes _id to string in response', async () => {
    leanMock.mockResolvedValue([
      {
        _id: 'mongodb-object-id-123',
        name: 'Aspirin',
        manufacturer: 'Bayer',
        packSize: 10,
        packUnit: 'tablet',
        compositionKey: 'acetylsalicylic acid-500mg|tablet',
        slug: 'aspirin-500',
        images: [],
        unitPrice: 2.5,
      },
    ]);

    const req = new Request('http://localhost/api/admin/products/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ name: 'Aspirin' }),
    });

    const result = await POST(req);
    const data = await result.json();

    expect(typeof data.matches[0]._id).toBe('string');
    expect(data.matches[0]._id).toBe('mongodb-object-id-123');
  });

  it('silently falls back to name-only matching if composition key build fails', async () => {
    buildCompositionKeyMock.mockImplementation(() => {
      throw new Error('Invalid composition');
    });

    leanMock.mockResolvedValue([
      {
        _id: 'id3',
        name: 'Aspirin 500',
        manufacturer: 'Bayer',
        packSize: 10,
        packUnit: 'tablet',
        compositionKey: 'acetylsalicylic acid-500mg|tablet',
        slug: 'aspirin-500',
        images: [],
        unitPrice: 2.5,
      },
    ]);

    const req = new Request('http://localhost/api/admin/products/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Aspirin 500',
        salts: [{ name: 'Aspirin', strength: 500, unit: 'mg' }],
        form: 'tablet',
        manufacturer: 'Bayer',
        packSize: 10,
      }),
    });

    const result = await POST(req);
    expect(result.status).toBe(200);

    // Should still return results even though composition key failed
    const data = await result.json();
    expect(data.matches).toBeDefined();
  });

  it('validates input with Zod schema and returns 400 on invalid data', async () => {
    createErrorResponseMock.mockReturnValue(
      new Response(JSON.stringify({ error: 'Validation failed' }), { status: 400 })
    );

    const req = new Request('http://localhost/api/admin/products/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ name: '' }), // Empty name should fail validation
    });

    const result = await POST(req);
    expect(result.status).toBe(400);
  });

  it('filters out empty salts when building composition key', async () => {
    leanMock.mockResolvedValue([]);

    const req = new Request('http://localhost/api/admin/products/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        salts: [
          { name: '', strength: 0, unit: 'mg' }, // Empty
          { name: 'Paracetamol', strength: 650, unit: 'mg' }, // Valid
        ],
        form: 'tablet',
        manufacturer: 'Test Pharma',
        packSize: 15,
      }),
    });

    await POST(req);

    // buildCompositionKey should be called with only the valid salt
    expect(buildCompositionKeyMock).toHaveBeenCalledWith(
      [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
      'tablet'
    );
  });

  it('does not build composition key if packSize is zero or missing', async () => {
    leanMock.mockResolvedValue([]);

    const req = new Request('http://localhost/api/admin/products/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        salts: [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
        form: 'tablet',
        manufacturer: 'Test Pharma',
        packSize: 0, // Invalid packSize
      }),
    });

    await POST(req);

    // buildCompositionKey should NOT be called
    expect(buildCompositionKeyMock).not.toHaveBeenCalled();
  });
});
