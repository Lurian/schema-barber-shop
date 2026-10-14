'use client';

import { type ReactNode, useState } from 'react';
import { useHoursDraft } from './hours-draft';

export type AddHoursProps = {
  className?: string;
  children?: ReactNode;
};

export function AddHours({ className, children = 'Add hours' }: AddHoursProps) {
  const { add } = useHoursDraft();
  const [error, setError] = useState<string | null>(null);

  return (
    <div data-ui-add-hours="" className={className}>
      <button type="button" onClick={() => setError(add())} data-ui-add-hours-control="">
        {children}
      </button>
      {error ? <p data-ui-add-hours-error="">{error}</p> : null}
    </div>
  );
}
