'use client';

import type { ReactNode } from 'react';
import { useBookingRow } from './booking-row';

export type CancelButtonProps = {
  className?: string;
  children?: ReactNode;
};

export function CancelButton({ className, children = 'Cancel' }: CancelButtonProps) {
  const { cancel } = useBookingRow();

  return (
    <button type="button" onClick={cancel} data-ui-cancel-button="" className={className}>
      {children}
    </button>
  );
}
