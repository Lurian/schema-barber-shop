'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { todayDate } from '../booking/scheduling';
import { DrawerShell } from '../drawer/drawer-context';
import { type BookingDraft, BookingDraftContext } from './booking-draft';
import { useClientScope } from './scope';
import { useShop } from './shop-context';

export type AddBookingDrawerProps = {
  children?: ReactNode;
};

export function AddBookingDrawer({ children }: AddBookingDrawerProps) {
  const { barbers, addBooking } = useShop();
  const { client } = useClientScope();
  const [open, setOpen] = useState(false);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDateState] = useState(todayDate);
  const [slot, setSlot] = useState<string | null>(null);

  const selectBarber = useCallback((id: string) => {
    setBarberId(id);
    setSlot(null);
  }, []);

  const setDate = useCallback((next: string) => {
    setDateState(next);
    setSlot(null);
  }, []);

  const confirm = useCallback((): string | null => {
    if (!client || !barberId || !slot) {
      return 'Choose a barber and a time.';
    }
    const message = addBooking({ clientId: client.id, barberId, startsAt: slot });
    if (!message) {
      setOpen(false);
      setSlot(null);
    }
    return message;
  }, [addBooking, barberId, client, slot]);

  const draft = useMemo<BookingDraft>(
    () => ({
      barber: barbers.find((candidate) => candidate.id === barberId) ?? null,
      date,
      slot,
      selectBarber,
      setDate,
      selectSlot: setSlot,
      confirm,
    }),
    [barbers, barberId, confirm, date, selectBarber, setDate, slot],
  );

  return (
    <BookingDraftContext.Provider value={draft}>
      <DrawerShell open={open} onOpenChange={setOpen} disabled={!client}>
        {children}
      </DrawerShell>
    </BookingDraftContext.Provider>
  );
}
