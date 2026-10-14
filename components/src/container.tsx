import type { ReactNode } from 'react';

export type ContainerProps = {
  className?: string;
  children?: ReactNode;
};

export function Container({ className, children }: ContainerProps) {
  return (
    <div data-ui-container="" className={className}>
      {children}
    </div>
  );
}
