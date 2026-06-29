'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Search, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  type CatalogPick,
  decodeCatalogPick,
  encodeCatalogPick,
  getCatalogPicksForDepartment,
  getDepartmentTitles,
} from '@/data/sidebar-categories';
import { findBestCatalogPick, searchCatalogPicks } from '@/lib/catalog-part-match';

const selectTriggerClass = cn(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none',
  'focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
);

type CatalogPartPickerProps = {
  department: string;
  pickValue: string;
  searchQuery: string;
  category: string;
  subcategory: string;
  productName?: string;
  onDepartmentChange: (department: string) => void;
  onPickChange: (pick: CatalogPick, encoded: string) => void;
  onClearPick: () => void;
  onSearchQueryChange: (query: string) => void;
  onCatalogTouched?: () => void;
};

export function CatalogPartPicker({
  department,
  pickValue,
  searchQuery,
  category,
  subcategory,
  productName = '',
  onDepartmentChange,
  onPickChange,
  onClearPick,
  onSearchQueryChange,
  onCatalogTouched,
}: CatalogPartPickerProps) {
  const departmentTitles = useMemo(() => getDepartmentTitles(), []);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const departmentPicks = useMemo(
    () => (department ? getCatalogPicksForDepartment(department) : []),
    [department],
  );

  const rankedSuggestions = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    return searchCatalogPicks(q, { department: department || undefined, limit: 10 });
  }, [department, searchQuery]);

  const filteredDepartmentPicks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return departmentPicks;
    return departmentPicks.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q),
    );
  }, [department, departmentPicks, searchQuery]);

  const selectedPick = useMemo(() => {
    const decoded = decodeCatalogPick(pickValue);
    if (!decoded) return null;
    return (
      departmentPicks.find(
        (p) => p.category === decoded.category && p.subcategory === decoded.subcategory,
      ) ??
      rankedSuggestions.find(
        (p) => p.category === decoded.category && p.subcategory === decoded.subcategory,
      ) ??
      null
    );
  }, [departmentPicks, pickValue, rankedSuggestions]);

  const applyPick = (pick: CatalogPick, fromUser = true) => {
    if (fromUser) onCatalogTouched?.();
    onDepartmentChange(pick.department);
    onPickChange(pick, encodeCatalogPick(pick));
    onSearchQueryChange(pick.label);
    setSuggestionsOpen(false);
  };

  useEffect(() => {
    setHighlightIndex(0);
  }, [searchQuery, rankedSuggestions.length]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const handleSearchChange = (value: string) => {
    onSearchQueryChange(value);
    setSuggestionsOpen(value.trim().length > 0);

    const best = findBestCatalogPick(value, {
      department: department || undefined,
      minScore: 72,
      minLead: 10,
    });
    if (best && value.trim().length >= 3) {
      applyPick(best, false);
    }
  };

  const showGlobalSuggestions = searchQuery.trim().length > 0 && rankedSuggestions.length > 0;

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative space-y-2">
        <Label htmlFor="part-type-search" className="flex items-center gap-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          Narrow the list
        </Label>
        <Input
          ref={inputRef}
          id="part-type-search"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim()) setSuggestionsOpen(true);
          }}
          onKeyDown={(e) => {
            if (!showGlobalSuggestions || !suggestionsOpen) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlightIndex((i) => Math.min(i + 1, rankedSuggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlightIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && rankedSuggestions[highlightIndex]) {
              e.preventDefault();
              applyPick(rankedSuggestions[highlightIndex]);
            } else if (e.key === 'Escape') {
              setSuggestionsOpen(false);
            }
          }}
          placeholder={
            productName.trim()
              ? `Try "${productName.trim()}" or type a part name…`
              : 'Type product or part name (e.g. oil filter, brake pads)…'
          }
          aria-describedby="part-type-search-hint"
          aria-autocomplete="list"
          aria-expanded={suggestionsOpen && showGlobalSuggestions}
          role="combobox"
        />
        <p id="part-type-search-hint" className="text-xs text-muted-foreground">
          Search the full parts catalog — we&apos;ll set the department and part type automatically when there&apos;s a
          strong match.
        </p>

        {suggestionsOpen && showGlobalSuggestions ? (
          <ul
            className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover py-1 shadow-lg"
            role="listbox"
          >
            {rankedSuggestions.map((pick, index) => (
              <li key={`${pick.department}-${encodeCatalogPick(pick)}`} role="option" aria-selected={index === highlightIndex}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-accent',
                    index === highlightIndex && 'bg-accent',
                  )}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => applyPick(pick)}
                >
                  <span className="font-medium text-foreground">{pick.category}</span>
                  <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    <span>{pick.department}</span>
                    <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />
                    <span className="line-clamp-1">{pick.label}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="product-department">1. Department</Label>
          <select
            id="product-department"
            required
            value={department}
            onChange={(e) => {
              onCatalogTouched?.();
              onDepartmentChange(e.target.value);
              onClearPick();
              onSearchQueryChange('');
            }}
            className={selectTriggerClass}
          >
            <option value="">Choose an area…</option>
            {departmentTitles.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-part-type">2. Part type</Label>
          <select
            id="product-part-type"
            required
            value={pickValue}
            disabled={!department}
            onChange={(e) => {
              onCatalogTouched?.();
              const raw = e.target.value;
              if (!raw) {
                onClearPick();
                return;
              }
              const decoded = decodeCatalogPick(raw);
              if (!decoded) return;
              const pick =
                departmentPicks.find(
                  (p) => p.category === decoded.category && p.subcategory === decoded.subcategory,
                ) ?? null;
              if (pick) {
                onPickChange(pick, raw);
                onSearchQueryChange(pick.label);
              }
            }}
            className={selectTriggerClass}
          >
            <option value="">
              {department ? 'Choose the closest catalog match…' : 'Select a department first'}
            </option>
            {filteredDepartmentPicks.map((p) => (
              <option key={`${p.department}-${encodeCatalogPick(p)}`} value={encodeCatalogPick(p)}>
                {p.label}
              </option>
            ))}
          </select>
          {department && filteredDepartmentPicks.length === 0 && searchQuery.trim() ? (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              No part types in this department match that search. Pick a suggestion above or choose another department.
            </p>
          ) : null}
        </div>
      </div>

      {selectedPick ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-foreground">{selectedPick.label}</p>
            <p className="text-xs text-muted-foreground">{selectedPick.department}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 font-normal">
            <Check className="mr-1 h-3 w-3" aria-hidden />
            Matched
          </Badge>
        </div>
      ) : null}

      {category ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Listing category:</span> {category}
          {subcategory ? (
            <>
              {' '}
              · <span className="font-medium text-foreground">Sub-area:</span> {subcategory}
            </>
          ) : null}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Matches the public parts menu so buyers find your product when browsing categories or search results.
        </p>
      )}
    </div>
  );
}
