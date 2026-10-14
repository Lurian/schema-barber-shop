'use client';

import type { ReactNode } from 'react';
import { DrawerShell } from './drawer-context';

export type DrawerProps = {
  children?: ReactNode;
};

export function Drawer({ children }: DrawerProps) {
  return <DrawerShell>{children}</DrawerShell>;
}
