import type { ReactNode } from 'react';

export type BookingLabelProps = {
  className?: string;
  children?: ReactNode;
};

export function BookingLabel({ className, children }: BookingLabelProps) {
  return (
    <div data-ui-booking-label="" className={className}>
      {children}
    </div>
  );
}
