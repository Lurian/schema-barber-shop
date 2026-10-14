'use client';

import { WEEKDAY_LABELS, WEEKDAYS, type Weekday } from '../booking/scheduling';
import { useHoursDraft } from './hours-draft';

export type HoursWeekdayProps = {
  className?: string;
};

export function HoursWeekday({ className }: HoursWeekdayProps) {
  const { weekday, setWeekday } = useHoursDraft();

  return (
    <select
      aria-label="Weekday"
      value={weekday}
      onChange={(event) => setWeekday(event.target.value as Weekday)}
      data-ui-hours-weekday=""
      className={className}
    >
      {WEEKDAYS.map((day) => (
        <option key={day} value={day}>
          {WEEKDAY_LABELS[day]}
        </option>
      ))}
    </select>
  );
}
