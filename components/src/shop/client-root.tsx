'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { type BookingScope, BookingScopeContext, type ClientScope, ClientScopeContext } from './scope';
import { useShop } from './shop-context';

export type ClientRootProps = {
  children?: ReactNode;
};

export function ClientRoot({ children }: ClientRootProps) {
  const { clients } = useShop();
  const [clientId, setClientId] = useState<string | null>(null);
  const client = clients.find((candidate) => candidate.id === clientId) ?? null;

  const scope = useMemo<ClientScope>(() => ({ client, selectClient: setClientId }), [client]);
  const bookingScope = useMemo<BookingScope>(() => ({ kind: 'client', id: client?.id ?? null }), [client]);

  return (
    <ClientScopeContext.Provider value={scope}>
      <BookingScopeContext.Provider value={bookingScope}>{children}</BookingScopeContext.Provider>
    </ClientScopeContext.Provider>
  );
}
