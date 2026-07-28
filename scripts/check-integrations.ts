import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local before anything reads process.env.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * Pre-launch integration health check.
 *
 *   npx tsx scripts/check-integrations.ts          # config audit only (no network)
 *   npx tsx scripts/check-integrations.ts --ping   # also ping live endpoints
 *
 * Config audit is offline and safe. --ping makes read-only calls (Mongo ping,
 * Delhivery serviceability, Fast2SMS wallet, Cloudinary ping) — no orders, no
 * SMS, no charges. Cashfree has no safe read without an order, so it is
 * config-only; verify it with a sandbox payment during QA.
 *
 * Exit code is non-zero if any REQUIRED env var is missing, so it can gate a
 * deploy.
 */

const PING = process.argv.includes('--ping');

interface Check {
  name: string;
  required: string[];
  optional?: string[];
  /** Read-only live probe; returns a status line, throws on failure. */
  ping?: () => Promise<string>;
}

function has(name: string): boolean {
  const v = process.env[name];
  return !!v && v.trim().length > 0;
}

/** Reject if a ping hangs. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

const checks: Check[] = [
  {
    name: 'MongoDB',
    required: ['MONGODB_URI'],
    ping: async () => {
      const mongoose = (await import('mongoose')).default;
      await mongoose.connect(process.env.MONGODB_URI!);
      await mongoose.connection.db!.admin().ping();
      await mongoose.disconnect();
      return 'connected, ping ok';
    },
  },
  {
    name: 'Cashfree (payments)',
    required: ['CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY'],
    optional: ['CASHFREE_ENV', 'CASHFREE_RETURN_URL'],
    // No safe read-only call; confirm with a sandbox order in QA.
  },
  {
    name: 'Delhivery (shipping)',
    required: ['DELHIVERY_API_KEY'],
    optional: ['DELHIVERY_BASE_URL', 'DELHIVERY_RETURN_PINCODE'],
    ping: async () => {
      const base = process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com';
      const res = await fetch(
        `${base}/c/api/pin-codes/json/?filter_codes=110001`,
        { headers: { Authorization: `Token ${process.env.DELHIVERY_API_KEY}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return 'serviceability API reachable';
    },
  },
  {
    name: 'Fast2SMS (OTP / SMS)',
    required: ['FAST2SMS_API_KEY'],
    optional: ['ADMIN_PHONE'],
    ping: async () => {
      const res = await fetch('https://www.fast2sms.com/dev/wallet', {
        headers: { authorization: process.env.FAST2SMS_API_KEY! },
      });
      const data: any = await res.json().catch(() => ({}));
      if (data.return === false) throw new Error(data.message || 'wallet check failed');
      return data.wallet != null ? `wallet balance ₹${data.wallet}` : 'reachable';
    },
  },
  {
    name: 'Cloudinary (images)',
    required: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
    ping: async () => {
      const { v2 } = await import('cloudinary');
      v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const r = await v2.api.ping();
      return `status ${r.status}`;
    },
  },
  {
    name: 'Google OAuth (login)',
    required: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  },
  {
    name: 'NextAuth',
    required: ['NEXTAUTH_SECRET'],
    optional: ['NEXTAUTH_URL'],
  },
];

async function main() {
  console.log(`\nPMStore integration health — ${PING ? 'config + live ping' : 'config only'}\n`);

  let missingRequired = 0;

  for (const check of checks) {
    const missing = check.required.filter((v) => !has(v));
    const missingOpt = (check.optional ?? []).filter((v) => !has(v));
    const configured = missing.length === 0;
    if (!configured) missingRequired++;

    const mark = configured ? '✓' : '✗';
    console.log(`${mark} ${check.name}`);
    console.log(`    required: ${check.required.map((v) => `${v}${has(v) ? '' : ' (MISSING)'}`).join(', ')}`);
    if (check.optional?.length) {
      console.log(`    optional: ${check.optional.map((v) => `${v}${has(v) ? '' : ' (unset)'}`).join(', ')}`);
    }

    if (PING && configured && check.ping) {
      try {
        const status = await withTimeout(check.ping(), 20_000);
        console.log(`    live: ok — ${status}`);
      } catch (err: any) {
        console.log(`    live: FAILED — ${err.message}`);
      }
    } else if (PING && configured && !check.ping) {
      console.log('    live: skipped (no safe read-only probe)');
    }
    console.log('');
  }

  if (missingRequired > 0) {
    console.log(`${missingRequired} integration(s) missing required config.\n`);
    process.exit(1);
  }
  console.log('All integrations configured.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('check-integrations failed:', err);
  process.exit(1);
});
