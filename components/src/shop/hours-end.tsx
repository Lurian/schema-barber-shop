'use client';

import { useHoursDraft } from './hours-draft';

export type HoursEndProps = {
  className?: string;
};

export function HoursEnd({ className }: HoursEndProps) {
  const { end, setEnd } = useHoursDraft();

  return (
    <input
      aria-label="End"
      type="time"
      step={1800}
      value={end}
      onChange={(event) => setEnd(event.target.value)}
      data-ui-hours-end=""
      className={className}
    />
  );
}
