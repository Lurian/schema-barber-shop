'use client';

import { useBookingRow } from './booking-row';

export type ClientNameProps = {
  className?: string;
};

export function ClientName({ className }: ClientNameProps) {
  const { client, booking } = useBookingRow();
  return (
    <span data-ui-client-name="" className={className}>
      {client?.name ?? booking.clientId}
    </span>
  );
}
