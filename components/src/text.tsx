import type { ReactNode } from 'react';

export type TextProps = {
  as?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  children?: ReactNode;
};

export function Text({ as: Tag = 'p', className, children }: TextProps) {
  return (
    <Tag data-ui-text="" className={className}>
      {children}
    </Tag>
  );
}
