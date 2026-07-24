'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AuthShell, AuthCard } from '@/components/account/AuthShell';
import { Button } from '@/components/ui/button';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return {
          title: 'Server configuration error',
          message: 'There is a problem with the server configuration. Please contact support.',
        };
      case 'AccessDenied':
        return {
          title: 'Access denied',
          message: 'You do not have permission to sign in.',
        };
      case 'Verification':
        return {
          title: 'Verification failed',
          message: 'That code has expired or was already used. Request a new one and try again.',
        };
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
      case 'EmailCreateAccount':
      case 'Callback':
        return {
          title: 'Sign-in error',
          message: 'There was a problem signing you in. Please try again.',
        };
      case 'OAuthAccountNotLinked':
        return {
          title: 'Account already exists',
          message: 'An account with this email already exists. Sign in with the method you used originally.',
        };
      case 'EmailSignin':
        return {
          title: 'Could not send email',
          message: 'We could not send the sign-in email. Please try again.',
        };
      case 'CredentialsSignin':
        return {
          title: 'Sign-in failed',
          message: 'We could not verify that code. Request a new one and try again.',
        };
      case 'SessionRequired':
        return {
          title: 'Sign in required',
          message: 'You must be signed in to view this page.',
        };
      default:
        return {
          title: 'Sign-in error',
          message: 'Something went wrong. Please try again.',
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <AuthShell>
      <AuthCard className="p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--foil-soft)]">
            <AlertTriangle className="h-8 w-8 text-[var(--ink)]" aria-hidden="true" />
          </div>
          <h1 className="mb-2 text-[length:var(--step-1)] text-[var(--ink)]">{errorInfo.title}</h1>
          <p className="text-[var(--ink-70)]">{errorInfo.message}</p>
        </div>

        {error && (
          <div className="mb-6 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper)] p-4">
            <p className="text-sm text-[var(--ink-70)]">
              Reference:{' '}
              <span style={{ fontFamily: 'var(--font-data)' }} className="text-[var(--ink)]">{error}</span>
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Button asChild className="h-12 w-full text-base font-semibold">
            <Link href="/login">Try again</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 w-full text-base font-semibold">
            <Link href="/">Go to homepage</Link>
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--ink-70)]">
            Need help?{' '}
            <Link href="/contact" className="font-medium text-[var(--ink)] hover:underline">
              Contact support
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthShell>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[var(--foil-soft)] border-t-[var(--ink)]" />
          <p className="mt-4 text-[var(--ink-70)]">Loading…</p>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
