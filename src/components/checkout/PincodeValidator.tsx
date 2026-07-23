'use client';

import { useState, useEffect } from 'react';

interface PincodeValidatorProps {
  value: string;
  onValidationChange?: (valid: boolean, estimatedDays?: number) => void;
  showEstimatedDays?: boolean;
}

export default function PincodeValidator({
  value,
  onValidationChange,
  showEstimatedDays = true,
}: PincodeValidatorProps) {
  const [checking, setChecking] = useState(false);
  const [serviceable, setServiceable] = useState<boolean | null>(null);
  const [estimatedDays, setEstimatedDays] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkServiceability = async () => {
      // Reset states
      setServiceable(null);
      setEstimatedDays(undefined);
      setError(null);

      // Validate PIN code format
      const cleanPincode = value.replace(/\D/g, '');
      if (cleanPincode.length !== 6) {
        if (value.length > 0) {
          setError('PIN code must be 6 digits');
          onValidationChange?.(false);
        }
        return;
      }

      // Check serviceability with API
      setChecking(true);

      try {
        const response = await fetch(
          `/api/shipping/check-serviceability?pincode=${cleanPincode}`
        );
        const data = await response.json();

        if (data.serviceable) {
          setServiceable(true);
          setEstimatedDays(data.estimatedDays);
          onValidationChange?.(true, data.estimatedDays);
        } else {
          setServiceable(false);
          setError(data.error || 'Delivery not available to this PIN code');
          onValidationChange?.(false);
        }
      } catch (err) {
        console.error('Error checking serviceability:', err);
        setError('Failed to verify PIN code');
        onValidationChange?.(false);
      } finally {
        setChecking(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      if (value) {
        checkServiceability();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [value]);

  if (!value || value.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      {checking && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="inline-block w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Checking delivery availability...</span>
        </div>
      )}

      {!checking && serviceable === true && (
        <div className="flex items-start gap-2 text-sm text-green-600">
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <div>
            <p className="font-medium">Delivery available to this PIN code</p>
            {showEstimatedDays && estimatedDays && (
              <p className="text-xs text-gray-600 mt-0.5">
                Estimated delivery in {estimatedDays} days
              </p>
            )}
          </div>
        </div>
      )}

      {!checking && serviceable === false && (
        <div className="flex items-start gap-2 text-sm text-red-600">
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <div>
            <p className="font-medium">
              {error || 'Delivery not available to this PIN code'}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              Please check the PIN code or try a different delivery address
            </p>
          </div>
        </div>
      )}

      {!checking && error && serviceable === null && (
        <div className="flex items-start gap-2 text-sm text-yellow-600">
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
