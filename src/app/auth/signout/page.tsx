'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignOutPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Sign out error:', error);
      setSigningOut(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-red-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sign Out
          </h1>
          <p className="text-gray-600">
            Are you sure you want to sign out of your account?
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full bg-gradient-to-r from-amber-600 to-red-700 text-white py-3 px-4 rounded-lg hover:from-amber-700 hover:to-red-800 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingOut ? (
              <span className="flex items-center justify-center gap-2">
                <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing Out...
              </span>
            ) : (
              'Yes, Sign Out'
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={signingOut}
            className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 font-medium transition-all disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
