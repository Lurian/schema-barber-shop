'use client';

import { type ReactNode, useState } from 'react';
import { useBookingDraft } from './booking-draft';

export type ConfirmBookingProps = {
  className?: string;
  children?: ReactNode;
};

export function ConfirmBooking({ className, children = 'Confirm booking' }: ConfirmBookingProps) {
  const { barber, slot, confirm } = useBookingDraft();
  const [error, setError] = useState<string | null>(null);

  return (
    <div data-ui-confirm-booking="" className={className}>
      {error ? <p data-ui-confirm-booking-error="">{error}</p> : null}
      <button
        type="button"
        disabled={!barber || !slot}
        onClick={() => setError(confirm())}
        data-ui-confirm-booking-control=""
      >
        {children}
      </button>
    </div>
  );
}
