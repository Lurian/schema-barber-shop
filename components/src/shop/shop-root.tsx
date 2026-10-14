'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { MOCK_BARBERS, MOCK_BOOKINGS, MOCK_CLIENTS } from '../booking/mock-data';
import {
  addMinutes,
  availableSlots,
  type Barber,
  type Booking,
  hoursProblem,
  SLOT_MINUTES,
  type WorkingHours,
} from '../booking/scheduling';
import { type NewBooking, ShopContext, type ShopState } from './shop-context';

export type ShopRootProps = {
  children?: ReactNode;
};

export function ShopRoot({ children }: ShopRootProps) {
  const [barbers, setBarbers] = useState<Barber[]>(MOCK_BARBERS);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);

  const addBooking = useCallback(
    (input: NewBooking): string | null => {
      const barber = barbers.find((candidate) => candidate.id === input.barberId);
      const client = MOCK_CLIENTS.find((candidate) => candidate.id === input.clientId);
      if (!barber || !client) {
        return 'Choose a barber.';
      }
      const date = input.startsAt.slice(0, 10);
      if (!availableSlots(barber, date, bookings).includes(input.startsAt)) {
        return `${barber.name} is not free at ${input.startsAt.slice(11)}.`;
      }
      setBookings((current) => [
        ...current,
        {
          id: `booking-${current.length + 1}-${Date.now()}`,
          barberId: barber.id,
          clientId: client.id,
          startsAt: input.startsAt,
          endsAt: addMinutes(input.startsAt, SLOT_MINUTES),
        },
      ]);
      return null;
    },
    [barbers, bookings],
  );

  const cancel = useCallback((id: string) => {
    setBookings((current) => current.filter((booking) => booking.id !== id));
  }, []);

  const setHours = useCallback((targetId: string, hours: WorkingHours[]): string | null => {
    const problem = hoursProblem(hours);
    if (problem) {
      return problem;
    }
    setBarbers((current) => current.map((item) => (item.id === targetId ? { ...item, hours } : item)));
    return null;
  }, []);

  const state = useMemo<ShopState>(
    () => ({
      barbers,
      clients: MOCK_CLIENTS,
      bookings,
      addBooking,
      cancel,
      setHours,
    }),
    [barbers, bookings, addBooking, cancel, setHours],
  );

  return <ShopContext.Provider value={state}>{children}</ShopContext.Provider>;
}
