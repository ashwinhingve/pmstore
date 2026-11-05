import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildOwnerOrderMessage,
  notifyOwnerNewOrderWhatsApp,
  type OwnerOrderAlert,
} from './owner-whatsapp';

const baseOrder: OwnerOrderAlert = {
  orderNumber: 'ORD-7F3K2-8821',
  items: [
    { name: 'Dolo 650mg strip', quantity: 2 },
    { name: 'Pan-D caps', quantity: 1 },
  ],
  itemCount: 3,
  totalAmount: 540,
  paymentMethod: 'cod',
  prescriptionRequired: true,
};

const ADMIN_URL = 'https://pratigyamedicalstore.com';

describe('buildOwnerOrderMessage', () => {
  it('includes order number, total, payment and the admin link', () => {
    const msg = buildOwnerOrderMessage(baseOrder, ADMIN_URL);
    expect(msg).toContain('ORD-7F3K2-8821');
    expect(msg).toContain('₹540.00');
    expect(msg).toContain('COD (collect cash)');
    expect(msg).toContain(`${ADMIN_URL}/admin/orders`);
  });

  it('lists each item with its quantity', () => {
    const msg = buildOwnerOrderMessage(baseOrder, ADMIN_URL);
    expect(msg).toContain('• Dolo 650mg strip ×2');
    expect(msg).toContain('• Pan-D caps ×1');
  });

  it('flags a prescription-required order for verification', () => {
    expect(buildOwnerOrderMessage(baseOrder, ADMIN_URL)).toContain(
      'Rx required: Yes — verify prescription'
    );
  });

  it('marks an OTC order as not requiring a prescription', () => {
    const otc = { ...baseOrder, prescriptionRequired: false };
    expect(buildOwnerOrderMessage(otc, ADMIN_URL)).toContain('Rx required: No');
  });

  it('labels online (prepaid) orders distinctly from COD', () => {
    const online = { ...baseOrder, paymentMethod: 'upi' };
    const msg = buildOwnerOrderMessage(online, ADMIN_URL);
    expect(msg).toContain('Online (paid)');
    expect(msg).not.toContain('collect cash');
  });

  it('collapses very long item lists to a "+N more" summary', () => {
    const many: OwnerOrderAlert = {
      ...baseOrder,
      items: Array.from({ length: 35 }, (_, i) => ({ name: `Item ${i + 1}`, quantity: 1 })),
      itemCount: 35,
    };
    const msg = buildOwnerOrderMessage(many, ADMIN_URL);
    expect(msg).toContain('• Item 30 ×1');
    expect(msg).not.toContain('• Item 31 ×1');
    expect(msg).toContain('• …+5 more');
  });

  it('carries no customer PII — no phone number or street address (rule #6)', () => {
    const msg = buildOwnerOrderMessage(baseOrder, ADMIN_URL);
    // No 10+ digit phone-like run, and none of the address fields leak in.
    expect(msg).not.toMatch(/\d{10,}/);
    expect(msg.toLowerCase()).not.toContain('address');
    expect(msg).not.toContain('Vikash Kunj');
  });
});

describe('notifyOwnerNewOrderWhatsApp', () => {
  // The store WhatsApp number from src/lib/constants.ts (CONTACT.whatsapp),
  // digits only — the same number the homepage corner button links to.
  const HOMEPAGE_NUMBER = '919755550126';

  let savedApikey: string | undefined;
  let savedPhone: string | undefined;

  beforeEach(() => {
    savedApikey = process.env.CALLMEBOT_APIKEY;
    savedPhone = process.env.CALLMEBOT_PHONE;
    delete process.env.CALLMEBOT_APIKEY;
    delete process.env.CALLMEBOT_PHONE;
  });

  afterEach(() => {
    if (savedApikey === undefined) delete process.env.CALLMEBOT_APIKEY;
    else process.env.CALLMEBOT_APIKEY = savedApikey;
    if (savedPhone === undefined) delete process.env.CALLMEBOT_PHONE;
    else process.env.CALLMEBOT_PHONE = savedPhone;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubFetch(response: { ok: boolean; status: number; body: string }) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status,
      text: async () => response.body,
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('self-disables without an apikey — returns false and never calls the network', async () => {
    const fetchMock = stubFetch({ ok: true, status: 200, body: 'queued' });

    const result = await notifyOwnerNewOrderWhatsApp(baseOrder);

    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('defaults the recipient to the homepage WhatsApp number when no override is set', async () => {
    process.env.CALLMEBOT_APIKEY = 'testkey123';
    const fetchMock = stubFetch({ ok: true, status: 200, body: 'Message queued. You will receive it in a few seconds.' });

    const result = await notifyOwnerNewOrderWhatsApp(baseOrder);

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('api.callmebot.com/whatsapp.php');
    expect(calledUrl).toContain(`phone=${HOMEPAGE_NUMBER}`);
    expect(calledUrl).toContain('apikey=testkey123');
  });

  it('uses CALLMEBOT_PHONE as an override when set', async () => {
    process.env.CALLMEBOT_APIKEY = 'testkey123';
    process.env.CALLMEBOT_PHONE = '919812345678';
    const fetchMock = stubFetch({ ok: true, status: 200, body: 'queued' });

    await notifyOwnerNewOrderWhatsApp(baseOrder);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('phone=919812345678');
    expect(calledUrl).not.toContain(HOMEPAGE_NUMBER);
  });

  it('returns false on a non-ok HTTP status', async () => {
    process.env.CALLMEBOT_APIKEY = 'testkey123';
    stubFetch({ ok: false, status: 503, body: '' });

    expect(await notifyOwnerNewOrderWhatsApp(baseOrder)).toBe(false);
  });

  it('returns false when CallMeBot answers 200 but does not accept the message', async () => {
    // CallMeBot replies 200 even for a bad apikey — the body is what proves delivery.
    process.env.CALLMEBOT_APIKEY = 'badkey';
    stubFetch({ ok: true, status: 200, body: 'APIKey is not valid. Please check it.' });

    expect(await notifyOwnerNewOrderWhatsApp(baseOrder)).toBe(false);
  });

  it('never logs the recipient number or apikey (health-data rule #6)', async () => {
    process.env.CALLMEBOT_APIKEY = 'secretkey999';
    stubFetch({ ok: true, status: 200, body: 'APIKey is not valid.' }); // force the error log path
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await notifyOwnerNewOrderWhatsApp(baseOrder);

    const logged = errorSpy.mock.calls.flat().join(' ');
    expect(logged).not.toContain(HOMEPAGE_NUMBER);
    expect(logged).not.toContain('secretkey999');
  });
});
