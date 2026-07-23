'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return {
          title: 'Server Configuration Error',
          message: 'There is a problem with the server configuration. Please contact support.',
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          message: 'You do not have permission to sign in.',
        };
      case 'Verification':
        return {
          title: 'Verification Failed',
          message: 'The verification token has expired or has already been used.',
        };
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
      case 'EmailCreateAccount':
      case 'Callback':
        return {
          title: 'Authentication Error',
          message: 'There was a problem signing you in. Please try again.',
        };
      case 'OAuthAccountNotLinked':
        return {
          title: 'Account Already Exists',
          message: 'An account with this email already exists. Please sign in with the original method you used.',
        };
      case 'EmailSignin':
        return {
          title: 'Email Sign In Error',
          message: 'Unable to send sign in email. Please try again.',
        };
      case 'CredentialsSignin':
        return {
          title: 'Invalid Credentials',
          message: 'The email or password you entered is incorrect.',
        };
      case 'SessionRequired':
        return {
          title: 'Authentication Required',
          message: 'You must be signed in to access this page.',
        };
      default:
        return {
          title: 'Authentication Error',
          message: 'An unexpected error occurred. Please try again.',
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-red-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {errorInfo.title}
          </h1>
          <p className="text-gray-600">{errorInfo.message}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">
              <strong>Error Code:</strong> {error}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full bg-gradient-to-r from-amber-600 to-red-700 text-white py-3 px-4 rounded-lg hover:from-amber-700 hover:to-red-800 font-medium text-center transition-all"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="block w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 font-medium text-center transition-all"
          >
            Go to Homepage
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <Link href="/contact" className="text-amber-600 hover:text-amber-700 font-medium">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
