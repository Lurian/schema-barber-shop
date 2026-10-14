'use client';

import { useBookingRow } from './booking-row';

export type BarberNameProps = {
  className?: string;
};

export function BarberName({ className }: BarberNameProps) {
  const { barber, booking } = useBookingRow();
  return (
    <span data-ui-barber-name="" className={className}>
      {barber?.name ?? booking.barberId}
    </span>
  );
}
