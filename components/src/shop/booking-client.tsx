'use client';

import { useClientScope } from './scope';

export type BookingClientProps = {
  className?: string;
};

export function BookingClient({ className }: BookingClientProps) {
  const { client } = useClientScope();

  return (
    <p data-ui-booking-client="" className={className}>
      {client ? `Booking for ${client.name}.` : 'Select a client on the page first.'}
    </p>
  );
}
