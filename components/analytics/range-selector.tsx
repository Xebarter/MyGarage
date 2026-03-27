'use client';

type Option<T extends string> = {
  value: T;
  label: string;
};

interface RangeSelectorProps<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
  ariaLabel?: string;
}

export function RangeSelector<T extends string>({
  value,
  options,
  onChange,
  ariaLabel = 'Select chart range',
}: RangeSelectorProps<T>) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      aria-label={ariaLabel}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
