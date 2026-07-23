import mongoose from 'mongoose';
// Register all models so populate() works everywhere
import '@/models/index';

// Ensures the email_1 index on users is sparse so mobile OTP users (no email) can coexist.
// Runs once per process. Silently no-ops if index is already correct.
async function ensureSparseEmailIndex() {
  try {
    const col = mongoose.connection.collection('users');
    await col.dropIndex('email_1').catch(() => {});
    await col.createIndex({ email: 1 }, { unique: true, sparse: true, background: true });
  } catch {
    // Non-fatal — app still works, just logs if something unexpected happens
  }
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB(): Promise<mongoose.Connection> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
    await ensureSparseEmailIndex();
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
