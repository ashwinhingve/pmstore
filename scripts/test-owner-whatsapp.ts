import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local before anything reads process.env.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

import { notifyOwnerNewOrderWhatsApp } from '../src/lib/notifications/owner-whatsapp';
import { CONTACT_WHATSAPP_DIGITS } from '../src/lib/constants';

/**
 * Manually fire ONE sample owner WhatsApp alert through CallMeBot.
 *
 *   npx tsx scripts/test-owner-whatsapp.ts
 *
 * Sends a clearly-marked test order (no customer data) to the store WhatsApp
 * number. Use it to verify real delivery once CALLMEBOT_APIKEY is set. With no
 * apikey it just reports that the channel is self-disabled — proving a missing
 * key can never break the order flow.
 *
 * The real confirmation is the message ARRIVING on the phone — a "sent" result
 * only means CallMeBot accepted it.
 */
async function main() {
  const configured = !!process.env.CALLMEBOT_APIKEY;
  const recipient = process.env.CALLMEBOT_PHONE || CONTACT_WHATSAPP_DIGITS;

  console.log('\nOwner WhatsApp alert — test send');
  console.log(`  CALLMEBOT_APIKEY : ${configured ? 'set' : 'MISSING (channel self-disables)'}`);
  console.log(`  recipient number : ${recipient}${process.env.CALLMEBOT_PHONE ? ' (override)' : ' (homepage number default)'}`);
  console.log('');

  const ok = await notifyOwnerNewOrderWhatsApp({
    orderNumber: `TEST-${Date.now().toString(36).toUpperCase()}`,
    items: [{ name: 'Test alert — no action needed', quantity: 1 }],
    itemCount: 1,
    totalAmount: 0,
    paymentMethod: 'cod',
    prescriptionRequired: false,
  });

  if (ok) {
    console.log('✓ CallMeBot accepted the message. Now check WhatsApp on the store phone —');
    console.log('  the alert should arrive within a few seconds. That is the real confirmation.\n');
    process.exit(0);
  }

  if (!configured) {
    console.log('• Not sent: no CALLMEBOT_APIKEY. This is the expected safe no-op when unconfigured.\n');
    process.exit(0);
  }

  console.log('✗ Not accepted. Check that CALLMEBOT_APIKEY is valid and the recipient number is');
  console.log('  registered with CallMeBot (one-time "I allow callmebot to send me messages").\n');
  process.exit(1);
}

main().catch((err) => {
  console.error('test-owner-whatsapp failed:', err);
  process.exit(1);
});
