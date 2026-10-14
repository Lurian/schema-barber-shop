'use client';

import { createContext, useContext } from 'react';
import type { Barber, Booking, Client } from './scheduling';

export type BookingRowState = {
  booking: Booking;
  client: Client | null;
  barber: Barber | null;
  cancel: () => void;
};

const BookingRowContext = createContext<BookingRowState | null>(null);

export function useBookingRow(): BookingRowState {
  const row = useContext(BookingRowContext);
  if (!row) {
    throw new Error('This component must be placed inside BookingList.');
  }
  return row;
}

export { BookingRowContext };
