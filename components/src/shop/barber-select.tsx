'use client';

import { WEEKDAY_LABELS, WEEKDAYS } from '../booking/scheduling';
import { ChoiceList } from './choice-list';
import { useBarberScope } from './scope';
import { useShop } from './shop-context';

export type BarberSelectProps = {
  className?: string;
};

export function BarberSelect({ className }: BarberSelectProps) {
  const { barbers } = useShop();
  const { barber, selectBarber } = useBarberScope();

  return (
    <ChoiceList
      hook="barber-select"
      label="Barber"
      value={barber?.id ?? null}
      onChange={selectBarber}
      options={barbers.map((candidate) => {
        const days = WEEKDAYS.filter((weekday) => candidate.hours.some((hours) => hours.weekday === weekday));
        return {
          id: candidate.id,
          label: candidate.name,
          detail: days.length > 0 ? days.map((weekday) => WEEKDAY_LABELS[weekday]).join(' · ') : 'No hours yet',
        };
      })}
      className={className}
    />
  );
}
