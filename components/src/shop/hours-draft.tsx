'use client';

import { createContext, useContext } from 'react';
import type { Weekday } from '../booking/scheduling';

export type HoursDraft = {
  weekday: Weekday;
  start: string;
  end: string;
  setWeekday: (weekday: Weekday) => void;
  setStart: (start: string) => void;
  setEnd: (end: string) => void;
  /** Appends the draft range to the selected barber. Returns a message when the hours are rejected. */
  add: () => string | null;
};

const HoursDraftContext = createContext<HoursDraft | null>(null);

export function useHoursDraft(): HoursDraft {
  const draft = useContext(HoursDraftContext);
  if (!draft) {
    throw new Error('This component must be placed inside EditHoursDrawer.');
  }
  return draft;
}

export { HoursDraftContext };
