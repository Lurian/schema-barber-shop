'use client';

/** Shared markup for the pickers. `hook` is the owning component's `data-ui-*` name, e.g. `client-picker`. */
export function ChoiceList({
  hook,
  label,
  options,
  value,
  onChange,
  className,
}: {
  hook: string;
  label: string;
  options: Array<{ id: string; label: string; detail?: string }>;
  value: string | null;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <fieldset {...{ [`data-ui-${hook}`]: '' }} className={className}>
      <legend {...{ [`data-ui-${hook}-legend`]: '' }}>{label}</legend>
      <ul {...{ [`data-ui-${hook}-list`]: '' }}>
        {options.map((option) => (
          <li key={option.id} {...{ [`data-ui-${hook}-item`]: '' }}>
            <button
              type="button"
              aria-pressed={option.id === value}
              onClick={() => onChange(option.id)}
              {...{ [`data-ui-${hook}-option`]: '' }}
            >
              <span {...{ [`data-ui-${hook}-option-label`]: '' }}>{option.label}</span>
              {option.detail ? <span {...{ [`data-ui-${hook}-option-detail`]: '' }}>{option.detail}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
