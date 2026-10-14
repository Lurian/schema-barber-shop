'use client';

import type { ReactNode } from 'react';
import { useBookingRow } from '../booking/booking-row';
import { BookingScopeContext } from './scope';

export type ScopeClientProps = {
  children?: ReactNode;
};

export function ScopeClient({ children }: ScopeClientProps) {
  const { booking } = useBookingRow();

  return (
    <BookingScopeContext.Provider value={{ kind: 'client', id: booking.clientId }}>
      {children}
    </BookingScopeContext.Provider>
  );
}
