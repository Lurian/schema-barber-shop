'use client';

import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import { createContext, type ReactNode, useContext, useState } from 'react';

export type DrawerState = {
  /** True while the root has nothing to act on, so the trigger cannot open it. */
  disabled: boolean;
};

const DrawerContext = createContext<DrawerState | null>(null);

export function useDrawer(): DrawerState {
  const state = useContext(DrawerContext);
  if (!state) {
    throw new Error('This component must be placed inside Drawer, AddBookingDrawer, or EditHoursDrawer.');
  }
  return state;
}

/** Open state plus the Base UI root. Roots that provide a draft wrap their children in this. */
export function DrawerShell({
  disabled = false,
  open,
  onOpenChange,
  children,
}: {
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const isOpen = open ?? ownOpen;
  const setOpen = onOpenChange ?? setOwnOpen;

  return (
    <DrawerContext.Provider value={{ disabled }}>
      <BaseDrawer.Root open={isOpen} onOpenChange={setOpen} swipeDirection="right">
        {children}
      </BaseDrawer.Root>
    </DrawerContext.Provider>
  );
}
