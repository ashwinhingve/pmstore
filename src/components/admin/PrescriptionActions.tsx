'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/store/useToastStore';

interface PrescriptionActionsProps {
  prescriptionId: string;
}

export function PrescriptionActions({ prescriptionId }: PrescriptionActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/prescriptions/${prescriptionId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to verify prescription');
      }
      toast.success('Prescription verified');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify');
    } finally {
      setVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }
    setRejecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/prescriptions/${prescriptionId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject prescription');
      }
      setShowRejectInput(false);
      setRejectReason('');
      toast.info('Prescription rejected');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setRejecting(false);
    }
  };

  if (showRejectInput) {
    return (
      <div className="flex flex-col gap-2 min-w-fit">
        <input
          type="text"
          placeholder="Reason for rejection"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="px-2 py-1 text-xs border border-[var(--foil-soft)] rounded text-[var(--ink)] placeholder:text-[var(--ink-40)]"
          disabled={rejecting}
        />
        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={handleReject}
            disabled={rejecting || !rejectReason.trim()}
            className="text-xs h-8"
          >
            {rejecting ? 'Rejecting...' : 'Confirm'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowRejectInput(false);
              setRejectReason('');
              setError(null);
            }}
            disabled={rejecting}
            className="text-xs h-8"
          >
            Cancel
          </Button>
        </div>
        {error && <p className="text-xs text-[var(--ink)] bg-[var(--foil-soft)] px-2 py-1 rounded">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        onClick={handleVerify}
        disabled={verifying}
        className="text-xs h-8 flex items-center gap-1 bg-[var(--mint)] hover:opacity-90"
      >
        <CheckCircle className="w-3 h-3" />
        {verifying ? 'Verifying...' : 'Verify'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowRejectInput(true)}
        className="text-xs h-8 border-[var(--ink-40)] text-[var(--ink)] hover:bg-[var(--foil-soft)]"
      >
        <XCircle className="w-3 h-3" />
        Reject
      </Button>
      {error && <span className="text-xs text-[var(--ink)] ml-2">{error}</span>}
    </div>
  );
}
