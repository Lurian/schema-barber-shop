'use client';

import type { ReactNode } from 'react';
import { useBookingRow } from '../booking/booking-row';
import { BookingScopeContext } from './scope';

export type ScopeBarberProps = {
  children?: ReactNode;
};

export function ScopeBarber({ children }: ScopeBarberProps) {
  const { booking } = useBookingRow();

  return (
    <BookingScopeContext.Provider value={{ kind: 'barber', id: booking.barberId }}>
      {children}
    </BookingScopeContext.Provider>
  );
}
