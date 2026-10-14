'use client';

import { useHoursDraft } from './hours-draft';

export type HoursStartProps = {
  className?: string;
};

export function HoursStart({ className }: HoursStartProps) {
  const { start, setStart } = useHoursDraft();

  return (
    <input
      aria-label="Start"
      type="time"
      step={1800}
      value={start}
      onChange={(event) => setStart(event.target.value)}
      data-ui-hours-start=""
      className={className}
    />
  );
}
