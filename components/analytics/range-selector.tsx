'use client';

import { cn } from '@/lib/utils';

type Option<T extends string> = {
  value: T;
  label: string;
};

interface RangeSelectorProps<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function RangeSelector<T extends string>({
  value,
  options,
  onChange,
  ariaLabel = 'Select chart range',
  className,
}: RangeSelectorProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-fit max-w-full flex-wrap gap-0.5 rounded-full border border-border/70 bg-muted/50 p-1 shadow-inner',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-8 flex-1 rounded-full px-3 text-[12px] font-semibold tracking-wide whitespace-nowrap transition-all sm:flex-none',
              selected
                ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(24,40,28,0.1)] ring-1 ring-black/[0.04] dark:ring-white/10'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
