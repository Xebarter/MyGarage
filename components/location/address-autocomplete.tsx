'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

import { cn } from '@/lib/utils';

export type AddressPlace = {
  label: string;
  lat?: number;
  lng?: number;
  placeId?: string;
};

type Suggestion = {
  id: string;
  title: string;
  subtitle: string;
  label: string;
  placeId?: string;
  lat?: number;
  lng?: number;
};

function newSessionToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: AddressPlace) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  autoComplete?: string;
};

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  id,
  name,
  placeholder = 'Search an area or landmark…',
  required,
  disabled,
  className,
  inputClassName,
  autoComplete = 'off',
}: AddressAutocompleteProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-list`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef(newSessionToken());
  const originRef = useRef<{ lat: number; lng: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipQueryRef = useRef(false);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        originRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 2500, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    if (skipQueryRef.current) {
      skipQueryRef.current = false;
      abortRef.current?.abort();
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    const q = value.trim();
    if (q.length < 2) {
      abortRef.current?.abort();
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q,
          limit: '7',
          sessionToken: sessionRef.current,
        });
        const origin = originRef.current;
        if (origin) {
          params.set('lat', String(origin.lat));
          params.set('lng', String(origin.lng));
        }
        const response = await fetch(`/api/geocode/suggestions?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = (await response.json()) as { suggestions?: Suggestion[] };
        const rows = Array.isArray(json.suggestions) ? json.suggestions : [];
        setSuggestions(rows.filter((row) => row.label));
        setActiveIndex(-1);
        setOpen(rows.length > 0);
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  const selectSuggestion = useCallback(
    async (row: Suggestion) => {
      skipQueryRef.current = true;
      onChange(row.label);
      setOpen(false);
      setSuggestions([]);
      setActiveIndex(-1);

      let lat = typeof row.lat === 'number' ? row.lat : undefined;
      let lng = typeof row.lng === 'number' ? row.lng : undefined;
      let label = row.label;

      if ((lat == null || lng == null) && row.placeId) {
        try {
          const params = new URLSearchParams({
            placeId: row.placeId,
            sessionToken: sessionRef.current,
          });
          const response = await fetch(`/api/geocode/place?${params.toString()}`);
          if (response.ok) {
            const place = (await response.json()) as AddressPlace;
            if (place.label) label = place.label;
            if (typeof place.lat === 'number') lat = place.lat;
            if (typeof place.lng === 'number') lng = place.lng;
            skipQueryRef.current = true;
            onChange(label);
          }
        } catch {
          /* keep autocomplete label */
        }
      }

      sessionRef.current = newSessionToken();
      onPlaceSelect?.({
        label,
        lat,
        lng,
        placeId: row.placeId,
      });
    },
    [onChange, onPlaceSelect],
  );

  const showMenu = open && suggestions.length > 0;

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={showMenu}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (!open || suggestions.length === 0) {
              if (event.key === 'Escape') setOpen(false);
              return;
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((i) => (i + 1) % suggestions.length);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
            } else if (event.key === 'Enter' && activeIndex >= 0) {
              event.preventDefault();
              void selectSuggestion(suggestions[activeIndex]);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
            }
          }}
          className={cn(
            'h-11 w-full rounded-xl border border-border bg-background py-3 pr-10 pl-9 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/70 md:text-sm',
            inputClassName,
          )}
        />
        {loading ? (
          <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
      </div>

      {showMenu ? (
        <ul
          ref={menuRef}
          id={listId}
          role="listbox"
          className="relative z-50 mt-1.5 max-h-72 overflow-auto rounded-2xl border border-border bg-card py-1 shadow-[0_16px_40px_rgba(18,32,28,0.14)]"
        >
          {suggestions.map((row, index) => (
            <li key={row.id || `${row.label}-${index}`} role="option" aria-selected={index === activeIndex} id={`${listId}-${index}`}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-start gap-3 px-3 py-2.5 text-left transition',
                  index === activeIndex ? 'bg-primary/8' : 'hover:bg-muted/70',
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void selectSuggestion(row)}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{row.title || row.label}</span>
                  {row.subtitle ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{row.subtitle}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
