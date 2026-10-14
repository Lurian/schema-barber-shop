'use client';

import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import type { ReactNode } from 'react';
import { useDrawer } from './drawer-context';

type PartProps = {
  className?: string;
  children?: ReactNode;
};

export type DrawerTriggerProps = PartProps;
export type DrawerPortalProps = PartProps;
export type DrawerBackdropProps = { className?: string };
export type DrawerViewportProps = PartProps;
export type DrawerPopupProps = PartProps;
export type DrawerTitleProps = PartProps;
export type DrawerCloseProps = PartProps;

export function DrawerTrigger({ className, children }: DrawerTriggerProps) {
  const { disabled } = useDrawer();
  return (
    <BaseDrawer.Trigger disabled={disabled} data-ui-drawer-trigger="" className={className}>
      {children}
    </BaseDrawer.Trigger>
  );
}

export function DrawerPortal({ className, children }: DrawerPortalProps) {
  return (
    <BaseDrawer.Portal data-ui-drawer-portal="" className={className}>
      {children}
    </BaseDrawer.Portal>
  );
}

export function DrawerBackdrop({ className }: DrawerBackdropProps) {
  return <BaseDrawer.Backdrop data-ui-drawer-backdrop="" className={className} />;
}

export function DrawerViewport({ className, children }: DrawerViewportProps) {
  return (
    <BaseDrawer.Viewport data-ui-drawer-viewport="" className={className}>
      {children}
    </BaseDrawer.Viewport>
  );
}

export function DrawerPopup({ className, children }: DrawerPopupProps) {
  return (
    <BaseDrawer.Popup data-ui-drawer-popup="" className={className}>
      {children}
    </BaseDrawer.Popup>
  );
}

export function DrawerTitle({ className, children }: DrawerTitleProps) {
  return (
    <BaseDrawer.Title data-ui-drawer-title="" className={className}>
      {children}
    </BaseDrawer.Title>
  );
}

export function DrawerClose({ className, children }: DrawerCloseProps) {
  return (
    <BaseDrawer.Close data-ui-drawer-close="" className={className}>
      {children}
    </BaseDrawer.Close>
  );
}
