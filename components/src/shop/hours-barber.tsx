'use client';

import { useBarberScope } from './scope';

export type HoursBarberProps = {
  className?: string;
};

export function HoursBarber({ className }: HoursBarberProps) {
  const { barber } = useBarberScope();

  return (
    <p data-ui-hours-barber="" className={className}>
      {barber ? `Editing ${barber.name}'s hours.` : 'Select a barber on the page first.'}
    </p>
  );
}
