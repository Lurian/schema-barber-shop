'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import type { Weekday } from '../booking/scheduling';
import { DrawerShell } from '../drawer/drawer-context';
import { type HoursDraft, HoursDraftContext } from './hours-draft';
import { useBarberScope } from './scope';
import { useShop } from './shop-context';

export type EditHoursDrawerProps = {
  children?: ReactNode;
};

export function EditHoursDrawer({ children }: EditHoursDrawerProps) {
  const { setHours } = useShop();
  const { barber } = useBarberScope();
  const [weekday, setWeekday] = useState<Weekday>('MONDAY');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');

  const add = useCallback((): string | null => {
    if (!barber) {
      return 'Select a barber.';
    }
    return setHours(barber.id, [...barber.hours, { weekday, start, end }]);
  }, [barber, end, setHours, start, weekday]);

  const draft = useMemo<HoursDraft>(
    () => ({ weekday, start, end, setWeekday, setStart, setEnd, add }),
    [add, end, start, weekday],
  );

  return (
    <HoursDraftContext.Provider value={draft}>
      <DrawerShell disabled={!barber}>{children}</DrawerShell>
    </HoursDraftContext.Provider>
  );
}
