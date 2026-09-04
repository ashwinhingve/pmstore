'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, Pill } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { AddressStep } from '@/components/checkout/AddressStep';
import { PrescriptionUpload } from '@/components/prescriptions/PrescriptionUpload';
import { isPrescriptionUsable } from '@/lib/checkout/prescription-guard';

interface ExistingPrescription {
  id: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  issueDate: string | null;
  patientName: string | null;
  doctorName: string | null;
  images: { url: string }[];
}

interface RxGateModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  onComplete: (prescriptionId: string, addressId: string) => void;
}

/**
 * Two-step gate shown before a Schedule H/H1/X item can be added to the
 * cart: pick or upload a valid prescription, then confirm a delivery
 * address. Ownership of anything `GET /api/prescriptions` returns is already
 * guaranteed by that route (scoped to the signed-in user) — the 'self'
 * sentinel below only exercises isPrescriptionUsable's status/expiry check.
 */
export function RxGateModal({ open, onClose, productName, onComplete }: RxGateModalProps) {
  const [step, setStep] = useState<'prescription' | 'address'>('prescription');
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<ExistingPrescription[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('prescription');
    setSelectedId(null);
    setShowUpload(false);
    setLoading(true);
    fetch('/api/prescriptions')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body) => {
        const usable = ((body.data || []) as ExistingPrescription[]).filter((p) =>
          isPrescriptionUsable(
            { userId: 'self', status: p.status, issueDate: p.issueDate ? new Date(p.issueDate) : null },
            'self',
          ),
        );
        setExisting(usable);
        setShowUpload(usable.length === 0);
      })
      .catch(() => {
        setExisting([]);
        setShowUpload(true);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleUploaded = (id: string) => {
    setSelectedId(id);
    setStep('address');
  };

  const handleUseExisting = () => {
    if (selectedId) setStep('address');
  };

  return (
    <Drawer open={open} onClose={onClose} title="Prescription required" side="right">
      <div className="flex flex-col gap-4 p-4">
        {step === 'prescription' && (
          <>
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--rx-soft)] p-3">
              <Pill className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rx)]" aria-hidden="true" />
              <p className="text-sm text-[var(--ink)]">
                {productName} needs a valid prescription. Attach one below to add it to your cart.
              </p>
            </div>

            {loading && (
              <div className="animate-shimmer h-24 rounded-[var(--radius-md)]" aria-hidden="true" />
            )}

            {!loading && existing.length > 0 && !showUpload && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[var(--ink)]">Use a prescription on file</p>
                <ul className="space-y-2">
                  {existing.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={`flex w-full items-center gap-3 rounded-[var(--radius-md)] border-2 p-3 text-left transition-colors duration-[var(--dur-fast)] ${
                          selectedId === p.id
                            ? 'border-[var(--ink)] bg-[var(--foil-soft)]'
                            : 'border-[var(--foil-soft)] hover:border-[var(--foil)]'
                        }`}
                      >
                        {p.images[0]?.url && (
                          <Image
                            src={p.images[0].url}
                            alt="Prescription"
                            width={44}
                            height={44}
                            className="h-11 w-11 shrink-0 rounded-[var(--radius-sm)] object-cover"
                            unoptimized
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--ink)]">
                            {p.patientName || 'Prescription'} {p.doctorName ? `· Dr. ${p.doctorName}` : ''}
                          </p>
                          <p className="text-xs text-[var(--ink-70)]">
                            {p.status === 'verified' ? 'Verified' : 'Pending review'}
                          </p>
                        </div>
                        {selectedId === p.id && (
                          <Check className="h-5 w-5 shrink-0 text-[var(--mint)]" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={handleUseExisting}
                  disabled={!selectedId}
                  className="w-full bg-[var(--ink)] text-[var(--paper-card)] hover:opacity-90"
                >
                  Continue
                </Button>
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="w-full text-center text-sm font-medium text-[var(--ink-70)] underline-offset-2 hover:underline"
                >
                  Upload a different prescription instead
                </button>
              </div>
            )}

            {!loading && showUpload && (
              <div className="space-y-3">
                <PrescriptionUpload onUploaded={handleUploaded} />
                {existing.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowUpload(false)}
                    className="w-full text-center text-sm font-medium text-[var(--ink-70)] underline-offset-2 hover:underline"
                  >
                    Use a prescription already on file
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {step === 'address' && selectedId && (
          <AddressStep
            ctaLabel="Continue"
            onNext={(addressId) => onComplete(selectedId, addressId)}
          />
        )}
      </div>
    </Drawer>
  );
}
