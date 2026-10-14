'use client';

import { cloneElement, isValidElement, type ReactNode, useContext } from 'react';
import { BookingScopeContext } from '../shop/scope';
import { useShop } from '../shop/shop-context';
import { BookingRowContext, type BookingRowState } from './booking-row';

export type BookingListProps = {
  emptyText?: string;
  className?: string;
  children?: ReactNode;
};

export function BookingList({ emptyText = 'No bookings yet.', className, children }: BookingListProps) {
  const { bookings, barbers, clients, cancel } = useShop();
  const scope = useContext(BookingScopeContext);

  if (scope && !scope.id) {
    return <EmptyMessage className={className}>Select a {scope.kind} to see their bookings.</EmptyMessage>;
  }

  const rows = scope
    ? bookings.filter((item) => (scope.kind === 'client' ? item.clientId === scope.id : item.barberId === scope.id))
    : bookings;
  if (rows.length === 0) {
    return <EmptyMessage className={className}>{emptyText}</EmptyMessage>;
  }

  const sorted = [...rows].sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  return (
    <ul data-ui-booking-list="" className={className}>
      {sorted.map((item) => {
        const row: BookingRowState = {
          booking: item,
          client: clients.find((candidate) => candidate.id === item.clientId) ?? null,
          barber: barbers.find((candidate) => candidate.id === item.barberId) ?? null,
          cancel: () => cancel(item.id),
        };
        return (
          <li key={item.id} data-ui-booking-list-row="">
            <BookingRowContext.Provider value={row}>{cloneTree(children)}</BookingRowContext.Provider>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyMessage({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p data-ui-booking-list="" data-ui-booking-list-empty="" className={className}>
      {children}
    </p>
  );
}

/** A new element tree per row, so each row mounts its own drawer instead of sharing one. */
function cloneTree(node: ReactNode): ReactNode {
  if (Array.isArray(node)) {
    return node.map((child) => cloneTree(child));
  }
  if (!isValidElement<{ children?: ReactNode }>(node)) {
    return node;
  }
  const cloned = cloneTree(node.props.children);
  return Array.isArray(cloned) ? cloneElement(node, {}, ...cloned) : cloneElement(node, {}, cloned);
}
