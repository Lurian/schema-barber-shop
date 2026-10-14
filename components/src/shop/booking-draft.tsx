'use client';

import { createContext, useContext } from 'react';
import type { Barber } from '../booking/scheduling';

export type BookingDraft = {
  barber: Barber | null;
  date: string;
  slot: string | null;
  selectBarber: (id: string) => void;
  setDate: (date: string) => void;
  selectSlot: (slot: string | null) => void;
  /** Books the draft for the selected client. Returns a message when the booking is refused. */
  confirm: () => string | null;
};

const BookingDraftContext = createContext<BookingDraft | null>(null);

export function useBookingDraft(): BookingDraft {
  const draft = useContext(BookingDraftContext);
  if (!draft) {
    throw new Error('This component must be placed inside AddBookingDrawer.');
  }
  return draft;
}

export { BookingDraftContext };
