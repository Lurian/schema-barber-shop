'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { type BarberScope, BarberScopeContext, type BookingScope, BookingScopeContext } from './scope';
import { useShop } from './shop-context';

export type BarberRootProps = {
  children?: ReactNode;
};

export function BarberRoot({ children }: BarberRootProps) {
  const { barbers } = useShop();
  const [barberId, setBarberId] = useState<string | null>(null);
  const barber = barbers.find((candidate) => candidate.id === barberId) ?? null;

  const scope = useMemo<BarberScope>(() => ({ barber, selectBarber: setBarberId }), [barber]);
  const bookingScope = useMemo<BookingScope>(() => ({ kind: 'barber', id: barber?.id ?? null }), [barber]);

  return (
    <BarberScopeContext.Provider value={scope}>
      <BookingScopeContext.Provider value={bookingScope}>{children}</BookingScopeContext.Provider>
    </BarberScopeContext.Provider>
  );
}
