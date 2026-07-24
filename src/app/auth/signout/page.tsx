'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { AuthShell, AuthCard } from '@/components/account/AuthShell';
import { Button } from '@/components/ui/button';

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
    <AuthShell>
      <AuthCard className="p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--foil-soft)]">
            <LogOut className="h-8 w-8 text-[var(--ink)]" aria-hidden="true" />
          </div>
          <h1 className="mb-2 text-[length:var(--step-1)] text-[var(--ink)]">Sign out</h1>
          <p className="text-[var(--ink-70)]">Do you want to sign out of your account?</p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleSignOut}
            disabled={signingOut}
            className="h-12 w-full text-base font-semibold"
          >
            {signingOut ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--paper-card)]/40 border-t-[var(--paper-card)]" />
                Signing out…
              </span>
            ) : (
              'Yes, sign out'
            )}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={signingOut}
            variant="outline"
            className="h-12 w-full text-base font-semibold"
          >
            Cancel
          </Button>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
