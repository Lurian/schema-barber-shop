'use client';

import { useBookingRow } from './booking-row';
import { formatDate, splitDateTime } from './scheduling';

export type BookingTimeProps = {
  className?: string;
};

export function BookingTime({ className }: BookingTimeProps) {
  const { booking } = useBookingRow();
  const { date, time } = splitDateTime(booking.startsAt);

  return (
    <span data-ui-booking-time="" className={className}>
      {formatDate(date)}, {time}–{splitDateTime(booking.endsAt).time}
    </span>
  );
}
