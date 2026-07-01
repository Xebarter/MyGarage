'use client';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function formatCategoryLabel(category: string): string {
  if (category === 'all') return 'All';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function MarketplaceActionStrip({
  chipCategories,
  categoryCatalog,
  selectedCategory,
  onSelectCategory,
  showCategoryBrowser,
}: {
  chipCategories: string[];
  categoryCatalog: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  showCategoryBrowser: boolean;
}) {
  const visiblePills = chipCategories.filter((c) => c !== 'all').slice(0, 14);
  const overflowCount = Math.max(0, categoryCatalog.length - visiblePills.length);

  return (
    <section
      id="browse-categories"
      className="sticky top-0 z-20 border-b border-border/70 bg-background/95 py-3 shadow-sm backdrop-blur-md md:top-16"
    >
      <div className="mx-auto w-full max-w-[1500px] px-2 sm:px-2.5 md:px-3">
        <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition',
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border/80 bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              All
            </button>

            <div className="relative min-w-0 flex-1">
              <div
                className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 bg-gradient-to-r from-background/95 to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 bg-gradient-to-l from-background/95 to-transparent"
                aria-hidden
              />
              <div className="flex flex-nowrap items-center gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {visiblePills.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => onSelectCategory(category)}
                    className={cn(
                      'shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition',
                      selectedCategory === category
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'border border-border/80 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
                    )}
                  >
                    {formatCategoryLabel(category)}
                  </button>
                ))}
              </div>
            </div>

            {showCategoryBrowser ? (
              <CategoryOverflowMenu
                categoryCatalog={categoryCatalog}
                overflowCount={overflowCount}
                onSelectCategory={onSelectCategory}
              />
            ) : null}
        </div>
      </div>
    </section>
  );
}

function CategoryOverflowMenu({
  categoryCatalog,
  overflowCount,
  onSelectCategory,
}: {
  categoryCatalog: string[];
  overflowCount: number;
  onSelectCategory: (category: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1.5 rounded-full border-dashed px-3 text-xs font-semibold"
        >
          {overflowCount > 0 ? `+${overflowCount}` : 'More'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(calc(100vw-2rem),22rem)] p-0">
        <Command className="rounded-lg border-0 shadow-none">
          <CommandInput placeholder="Search categories…" className="h-10" />
          <CommandList className="max-h-[min(50vh,280px)]">
            <CommandEmpty>No matching category.</CommandEmpty>
            <CommandGroup heading="Browse">
              <CommandItem value="all everything browse" onSelect={() => onSelectCategory('all')}>
                All products
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading={`Categories (${categoryCatalog.length})`}>
              {categoryCatalog.map((category) => (
                <CommandItem
                  key={category}
                  value={`${category} ${category.toLowerCase()}`}
                  onSelect={() => onSelectCategory(category)}
                >
                  {formatCategoryLabel(category)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
