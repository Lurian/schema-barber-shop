'use client';

import { useState } from 'react';
import { sortHours, WEEKDAY_LABELS, type WorkingHours } from '../booking/scheduling';
import { useBarberScope } from './scope';
import { useShop } from './shop-context';

export type HoursListProps = {
  className?: string;
};

export function HoursList({ className }: HoursListProps) {
  const { setHours } = useShop();
  const { barber } = useBarberScope();
  const [error, setError] = useState<string | null>(null);
  const hours = barber ? sortHours(barber.hours) : [];

  function remove(range: WorkingHours) {
    if (!barber) {
      return;
    }
    setError(
      setHours(
        barber.id,
        barber.hours.filter((candidate) => candidate !== range),
      ),
    );
  }

  if (!barber) {
    return (
      <p data-ui-hours-list="" data-ui-hours-list-empty="" className={className}>
        Select a barber on the page first.
      </p>
    );
  }

  return (
    <div data-ui-hours-list="" className={className}>
      {hours.length === 0 ? (
        <p data-ui-hours-list-empty="">No working hours yet.</p>
      ) : (
        <ul data-ui-hours-list-items="">
          {hours.map((range) => (
            <li key={`${range.weekday}-${range.start}`} data-ui-hours-list-item="">
              <span data-ui-hours-list-range="">
                <span data-ui-hours-list-weekday="">{WEEKDAY_LABELS[range.weekday]}</span>
                {range.start}–{range.end}
              </span>
              <button type="button" onClick={() => remove(range)} data-ui-hours-list-remove="">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {error ? <p data-ui-hours-list-error="">{error}</p> : null}
    </div>
  );
}
