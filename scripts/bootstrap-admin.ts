import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import User from '../src/models/User';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * One-off script to grant the first admin.
 *
 * Roles are DB-driven — there is no hardcoded admin whitelist in the app. Run
 * this once against the email of the account that should own the admin panel,
 * then REMOVE the ADMIN_BOOTSTRAP_EMAIL variable from the environment.
 *
 * Usage:
 *   ADMIN_BOOTSTRAP_EMAIL=owner@example.com npx tsx scripts/bootstrap-admin.ts
 */
async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase().trim();
  if (!email) {
    throw new Error(
      'ADMIN_BOOTSTRAP_EMAIL is not set. Run: ADMIN_BOOTSTRAP_EMAIL=owner@example.com npx tsx scripts/bootstrap-admin.ts'
    );
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set. Check .env.local');
  }

  await mongoose.connect(mongoUri);

  const user = await User.findOne({ email });
  if (!user) {
    console.error(
      `No user found for ${email}. Ask them to sign in once (which creates the account), then re-run this script.`
    );
    await mongoose.disconnect();
    process.exitCode = 1;
    return;
  }

  if (user.role === 'admin') {
    console.log(`${email} is already an admin. Nothing to do.`);
  } else {
    user.role = 'admin';
    // Use save() — never updateOne/updateMany — so Mongoose pre-save hooks run.
    await user.save();
    console.log(`Granted admin to ${email}.`);
  }

  console.log('Done. Now remove ADMIN_BOOTSTRAP_EMAIL from your environment.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('bootstrap-admin failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
