import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import { extractIncomingTextMessages, verifyMetaSignature } from './cloud-api';

const textPayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '0',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '919755550126', phone_number_id: '123' },
            contacts: [{ profile: { name: 'Test' }, wa_id: '919999999999' }],
            messages: [
              { from: '919999999999', id: 'wamid.abc', timestamp: '1690000000', type: 'text', text: { body: 'Namaste' } },
            ],
          },
        },
      ],
    },
  ],
};

const statusOnlyPayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '0',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            statuses: [{ id: 'wamid.abc', status: 'delivered', recipient_id: '919999999999' }],
          },
        },
      ],
    },
  ],
};

describe('extractIncomingTextMessages', () => {
  it('pulls text messages out of a Meta payload', () => {
    expect(extractIncomingTextMessages(textPayload)).toEqual([{ from: '919999999999', text: 'Namaste' }]);
  });

  it('ignores delivery/read status callbacks', () => {
    expect(extractIncomingTextMessages(statusOnlyPayload)).toEqual([]);
  });

  it('is safe against malformed input', () => {
    for (const bad of [null, undefined, 42, 'nope', {}, { entry: 'x' }]) {
      expect(extractIncomingTextMessages(bad)).toEqual([]);
    }
  });
});

describe('verifyMetaSignature', () => {
  const originalSecret = process.env.WHATSAPP_APP_SECRET;
  const secret = 'test_app_secret';
  const body = JSON.stringify({ hello: 'world' });
  const goodHeader = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

  beforeEach(() => {
    process.env.WHATSAPP_APP_SECRET = secret;
  });
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.WHATSAPP_APP_SECRET;
    else process.env.WHATSAPP_APP_SECRET = originalSecret;
  });

  it('accepts a correctly signed body', () => {
    expect(verifyMetaSignature(body, goodHeader)).toBe(true);
  });

  it('rejects a tampered body', () => {
    expect(verifyMetaSignature(body + 'x', goodHeader)).toBe(false);
  });

  it('rejects a wrong, missing, or malformed signature header', () => {
    expect(verifyMetaSignature(body, 'sha256=deadbeef')).toBe(false);
    expect(verifyMetaSignature(body, null)).toBe(false);
    expect(verifyMetaSignature(body, 'garbage')).toBe(false);
  });
});
