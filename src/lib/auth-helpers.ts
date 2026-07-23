import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { connectDB } from './mongodb';
import User from '@/models/User';

/**
 * Get the current session from NextAuth
 * This can be used in Server Components, Server Actions, and API Routes
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Require authentication - throws error or redirects if not authenticated
 * Use in Server Components and Server Actions
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session || !session.user) {
    redirect('/login');
  }

  return session;
}

/**
 * Require admin role - throws error or redirects if not admin
 * Use in Server Components and Server Actions
 */
export async function requireAdmin() {
  const session = await requireAuth();

  if (session.user.role !== 'admin') {
    redirect('/');
  }

  return session;
}

/**
 * Check if the current user is an admin
 * Returns true if admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.user?.role === 'admin';
}

/**
 * Check if the current user is authenticated
 * Returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user;
}

/**
 * Get the current user ID
 * Returns the user ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id || null;
}

/**
 * Get the current user's email
 * Returns the email or null if not authenticated
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.email || null;
}

/**
 * Verify admin role for API routes
 * Returns a JSON error response if not admin
 *
 * Usage in API routes:
 * ```
 * const adminCheck = await verifyAdminAccess();
 * if (adminCheck.error) return adminCheck.error;
 * const session = adminCheck.session;
 * ```
 */
export async function verifyAdminAccess(): Promise<{
  session?: any;
  error?: Response;
}> {
  const session = await getSession();

  if (!session || !session.user) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Unauthorized: Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  // Never trust the JWT role for a privileged action (CLAUDE.md rule #4). The
  // session role is derived from the token, which may be stale or forged — a
  // demoted user could still be carrying an old admin claim. Re-read the role
  // from the database, the single source of truth.
  await connectDB();
  const dbUser = await User.findById(session.user.id).select('role').lean<{ role?: string } | null>();

  if (dbUser?.role !== 'admin') {
    return {
      error: new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { session };
}

/**
 * Verify authentication for API routes
 * Returns a JSON error response if not authenticated
 *
 * Usage in API routes:
 * ```
 * const authCheck = await verifyAuthentication();
 * if (authCheck.error) return authCheck.error;
 * const session = authCheck.session;
 * ```
 */
export async function verifyAuthentication(): Promise<{
  session?: any;
  error?: Response;
}> {
  const session = await getSession();

  if (!session || !session.user) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Unauthorized: Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { session };
}
