'use client';

import { createContext, useContext } from 'react';
import type { Barber, Client } from '../booking/scheduling';

export type ClientScope = {
  client: Client | null;
  selectClient: (id: string) => void;
};

export type BarberScope = {
  barber: Barber | null;
  selectBarber: (id: string) => void;
};

/** Whose bookings the nearest root is about. `id` is null until something is selected. */
export type BookingScope = { kind: 'client' | 'barber'; id: string | null };

export const ClientScopeContext = createContext<ClientScope | null>(null);
export const BarberScopeContext = createContext<BarberScope | null>(null);
export const BookingScopeContext = createContext<BookingScope | null>(null);

export function useClientScope(): ClientScope {
  const scope = useContext(ClientScopeContext);
  if (!scope) {
    throw new Error('This component must be placed inside ClientRoot.');
  }
  return scope;
}

export function useBarberScope(): BarberScope {
  const scope = useContext(BarberScopeContext);
  if (!scope) {
    throw new Error('This component must be placed inside BarberRoot.');
  }
  return scope;
}
