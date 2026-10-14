'use client';

import { formatDateTime, formatTime, slotStartsOn, takenSlots } from '../booking/scheduling';
import { useBookingDraft } from './booking-draft';
import { useShop } from './shop-context';

export type BookingSlotProps = {
  className?: string;
};

export function BookingSlot({ className }: BookingSlotProps) {
  const { bookings } = useShop();
  const { barber, date, slot, selectSlot } = useBookingDraft();

  if (!barber) {
    return (
      <p data-ui-booking-slot="" data-ui-booking-slot-empty="" className={className}>
        Choose a barber first.
      </p>
    );
  }

  const starts = slotStartsOn(barber, date);
  if (starts.length === 0) {
    return (
      <p data-ui-booking-slot="" data-ui-booking-slot-empty="" className={className}>
        {barber.name} does not work on this day.
      </p>
    );
  }

  const taken = takenSlots(barber, bookings);

  return (
    <div data-ui-booking-slot="" className={className}>
      {starts.map((start) => {
        const value = formatDateTime(date, start);
        const selected = value === slot;
        return (
          <button
            key={value}
            type="button"
            disabled={taken.has(value)}
            aria-pressed={selected}
            onClick={() => selectSlot(selected ? null : value)}
            data-ui-booking-slot-option=""
          >
            {formatTime(start)}
          </button>
        );
      })}
    </div>
  );
}
