'use client';

import { ChoiceList } from './choice-list';
import { useClientScope } from './scope';
import { useShop } from './shop-context';

export type ClientPickerProps = {
  className?: string;
};

export function ClientPicker({ className }: ClientPickerProps) {
  const { clients } = useShop();
  const { client, selectClient } = useClientScope();

  return (
    <ChoiceList
      hook="client-picker"
      label="Client"
      value={client?.id ?? null}
      onChange={selectClient}
      options={clients.map((candidate) => ({ id: candidate.id, label: candidate.name, detail: candidate.email }))}
      className={className}
    />
  );
}
