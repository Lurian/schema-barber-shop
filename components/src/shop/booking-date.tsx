'use client';

import { Field as BaseField } from '@base-ui/react/field';
import { Input as BaseInput } from '@base-ui/react/input';
import { useBookingDraft } from './booking-draft';

export type BookingDateProps = {
  label?: string;
  className?: string;
};

export function BookingDate({ label = 'Date', className }: BookingDateProps) {
  const { date, setDate } = useBookingDraft();

  return (
    <BaseField.Root data-ui-booking-date="" className={className}>
      <BaseField.Label data-ui-booking-date-label="">{label}</BaseField.Label>
      <BaseInput
        type="date"
        value={date}
        onChange={(event) => {
          if (event.target.value) {
            setDate(event.target.value);
          }
        }}
        data-ui-booking-date-input=""
      />
    </BaseField.Root>
  );
}
