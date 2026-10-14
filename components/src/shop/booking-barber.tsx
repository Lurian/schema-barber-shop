'use client';

import { useBookingDraft } from './booking-draft';
import { ChoiceList } from './choice-list';
import { useShop } from './shop-context';

export type BookingBarberProps = {
  className?: string;
};

export function BookingBarber({ className }: BookingBarberProps) {
  const { barbers } = useShop();
  const { barber, selectBarber } = useBookingDraft();

  return (
    <ChoiceList
      hook="booking-barber"
      label="Barber"
      value={barber?.id ?? null}
      onChange={selectBarber}
      options={barbers.map((candidate) => ({ id: candidate.id, label: candidate.name }))}
      className={className}
    />
  );
}
