'use client';

import { createContext, useContext } from 'react';
import type { Barber, Booking, Client, WorkingHours } from '../booking/scheduling';

export type NewBooking = {
  clientId: string;
  barberId: string;
  startsAt: string;
};

export type ShopState = {
  barbers: Barber[];
  clients: Client[];
  bookings: Booking[];
  /** Books a slot for a client. Returns a message when the booking is refused. */
  addBooking: (booking: NewBooking) => string | null;
  cancel: (id: string) => void;
  /** Replaces a barber's weekly hours. Returns a message when the hours are invalid. */
  setHours: (barberId: string, hours: WorkingHours[]) => string | null;
};

const ShopContext = createContext<ShopState | null>(null);

export function useShop(): ShopState {
  const state = useContext(ShopContext);
  if (!state) {
    throw new Error('This component must be placed inside ShopRoot.');
  }
  return state;
}

export { ShopContext };
