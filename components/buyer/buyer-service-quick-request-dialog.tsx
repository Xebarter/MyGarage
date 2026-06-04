'use client';

import type { RefObject } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Navigation,
  PencilLine,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type QuickRequestUiStep = 'service' | 'location';

type LocationStatus = 'idle' | 'detecting' | 'ready' | 'error';

const dialogShellClass =
  'flex max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden border-0 p-0 shadow-2xl ' +
  'max-sm:fixed max-sm:inset-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none ' +
  'sm:max-h-[min(90dvh,720px)] sm:min-h-0 sm:max-w-lg sm:rounded-2xl sm:border sm:shadow-2xl';

const closeButtonOffsetClass =
  '[&_[data-slot=dialog-close]]:top-[max(0.75rem,env(safe-area-inset-top))] [&_[data-slot=dialog-close]]:right-3 [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:h-10 [&_[data-slot=dialog-close]]:w-10 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:border [&_[data-slot=dialog-close]]:border-white/20 [&_[data-slot=dialog-close]]:bg-background/90 [&_[data-slot=dialog-close]]:opacity-100 [&_[data-slot=dialog-close]]:shadow-md [&_[data-slot=dialog-close]]:backdrop-blur-sm';

/** Subtle left-accent hues for service rows — professional, not rainbow */
const serviceRowAccents = [
  { bar: 'bg-violet-500', icon: 'bg-violet-500/12 text-violet-700 dark:text-violet-300 ring-violet-500/25' },
  { bar: 'bg-sky-500', icon: 'bg-sky-500/12 text-sky-800 dark:text-sky-300 ring-sky-500/25' },
  { bar: 'bg-emerald-500', icon: 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-400 ring-emerald-500/25' },
  { bar: 'bg-amber-500', icon: 'bg-amber-500/12 text-amber-900 dark:text-amber-400 ring-amber-500/25' },
  { bar: 'bg-indigo-500', icon: 'bg-indigo-500/12 text-indigo-800 dark:text-indigo-300 ring-indigo-500/25' },
  { bar: 'bg-teal-500', icon: 'bg-teal-500/12 text-teal-800 dark:text-teal-300 ring-teal-500/25' },
] as const;

function StepIndicator({ step }: { step: QuickRequestUiStep }) {
  const steps = [
    { n: 1, label: 'Service', active: step === 'service', done: step === 'location' },
    { n: 2, label: 'Location', active: step === 'location', done: false },
  ] as const;

  return (
    <div className="flex items-center gap-2" role="progressbar" aria-valuenow={step === 'service' ? 1 : 2} aria-valuemin={1} aria-valuemax={2}>
      {steps.map((s, i) => (
        <div key={s.n} className="flex min-w-0 flex-1 items-center gap-2">
          <div
            className={cn(
              'flex h-8 shrink-0 items-center justify-center rounded-full px-2.5 text-xs font-bold tabular-nums transition-all',
              s.active
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                : s.done
                  ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-400'
                  : 'bg-muted/80 text-muted-foreground ring-1 ring-border/60',
            )}
          >
            {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.n}
          </div>
          <span
            className={cn(
              'hidden truncate text-xs font-semibold sm:inline',
              s.active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 ? (
            <div
              className={cn('mx-0.5 h-0.5 min-w-[1rem] flex-1 rounded-full', s.done ? 'bg-emerald-500/50' : 'bg-border')}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CategoryHeroCard({
  emoji,
  title,
  hint,
}: {
  emoji?: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm ring-1 ring-primary/10">
      <div className="flex items-start gap-3.5">
        {emoji ? (
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card text-2xl shadow-sm"
            aria-hidden
          >
            {emoji}
          </span>
        ) : null}
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" aria-hidden />
            Your category
          </p>
          <p className="mt-1.5 text-base font-bold leading-snug tracking-tight text-foreground">{title}</p>
          {hint ? (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ServiceOptionCard({
  service,
  index,
  isSelected,
  onSelect,
}: {
  service: string;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const accent = serviceRowAccents[index % serviceRowAccents.length];

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'group relative flex min-h-[58px] w-full touch-manipulation items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99]',
          isSelected
            ? 'border-primary/50 bg-primary/10 shadow-md ring-2 ring-primary/30'
            : 'border-border/70 bg-card/90 shadow-sm hover:-translate-y-px hover:border-primary/30 hover:shadow-md',
        )}
      >
        <span
          className={cn(
            'absolute bottom-2 left-0 top-2 w-1 rounded-full transition-opacity',
            accent.bar,
            isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-70',
          )}
          aria-hidden
        />
        <span
          className={cn(
            'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform group-hover:scale-105',
            isSelected ? 'bg-primary text-primary-foreground ring-primary/40 shadow-sm' : accent.icon,
          )}
          aria-hidden
        >
          {isSelected ? <CheckCircle2 className="h-5 w-5" /> : <Wrench className="h-4 w-4 opacity-90" />}
        </span>
        <span className="relative min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground sm:text-sm">
          {service}
        </span>
        <span
          className={cn(
            'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
            isSelected
              ? 'bg-primary/15 text-primary'
              : 'bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
          )}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </button>
    </li>
  );
}

export type BuyerServiceQuickRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: QuickRequestUiStep;
  onCloseReset: () => void;
  onEscapeLocation: () => void;
  selectedCategory: string;
  categoryEmoji?: string;
  categoryHint?: string;
  selectedService: string;
  services: string[];
  serviceSectionRef: RefObject<HTMLDivElement | null>;
  onSelectService: (service: string) => void;
  onBackToService: () => void;
  useDetectedLocation: boolean;
  onUseDetectedLocation: (value: boolean) => void;
  locationStatus: LocationStatus;
  locationMessage: string;
  locationAccuracyLabel: string;
  detectedLocation: string;
  manualLocation: string;
  onManualLocationChange: (value: string) => void;
  onRefreshLocation: () => void;
  canSubmit: boolean;
  canPressSubmit: boolean;
  submitError: string | null;
  identityMode: 'buyer' | 'guest';
  onSubmit: () => void;
};

export function BuyerServiceQuickRequestDialog({
  open,
  onOpenChange,
  step,
  onCloseReset,
  onEscapeLocation,
  selectedCategory,
  categoryEmoji,
  categoryHint,
  selectedService,
  services,
  serviceSectionRef,
  onSelectService,
  onBackToService,
  useDetectedLocation,
  onUseDetectedLocation,
  locationStatus,
  locationMessage,
  locationAccuracyLabel,
  detectedLocation,
  manualLocation,
  onManualLocationChange,
  onRefreshLocation,
  canSubmit,
  canPressSubmit,
  submitError,
  identityMode,
  onSubmit,
}: BuyerServiceQuickRequestDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) onCloseReset();
      }}
    >
      <DialogContent
        showCloseButton={step === 'service'}
        onEscapeKeyDown={(e) => {
          if (step === 'location') {
            e.preventDefault();
            onEscapeLocation();
          }
        }}
        className={cn(dialogShellClass, closeButtonOffsetClass, 'bg-background')}
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
          {step === 'service' ? (
            <>
              <header className="relative z-10 shrink-0 space-y-3 border-b border-border/40 bg-background/80 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] pr-14 backdrop-blur-xl sm:pr-16">
                <StepIndicator step="service" />
                <div className="space-y-1">
                  <DialogTitle className="text-left text-xl font-bold tracking-tight sm:text-2xl">
                    Choose a service
                  </DialogTitle>
                  <DialogDescription className="text-left text-sm text-muted-foreground">
                    Pick what you need — we&apos;ll pin your location next.
                  </DialogDescription>
                </div>
              </header>

              <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5">
                <CategoryHeroCard
                  emoji={categoryEmoji}
                  title={selectedCategory || 'Choose a category on the page'}
                  hint={categoryHint}
                />

                <div ref={serviceSectionRef} className="mt-5">
                  <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    <span>Services</span>
                    <span className="h-px flex-1 bg-border" />
                  </p>
                  <ul className="space-y-2.5">
                    {services.slice(0, 12).map((service, index) => (
                      <ServiceOptionCard
                        key={service}
                        service={service}
                        index={index}
                        isSelected={selectedService === service}
                        onSelect={() => onSelectService(service)}
                      />
                    ))}
                  </ul>
                  {services.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-4 py-10 text-center text-sm text-muted-foreground">
                      No services in this category. Close and pick another category.
                    </p>
                  ) : null}
                </div>
              </div>

              <footer className="relative z-10 shrink-0 border-t border-border/40 bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center">
                <p className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <ChevronRight className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Tap a service to continue
                </p>
              </footer>
            </>
          ) : null}

          {step === 'location' ? (
            <>
              <header className="relative z-10 shrink-0 border-b border-border/40 bg-background/80 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
                <StepIndicator step="location" />
                <div className="mt-3 flex items-start gap-3">
                  <button
                    type="button"
                    onClick={onBackToService}
                    className="inline-flex h-11 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-md transition active:scale-[0.97] hover:border-primary/30 hover:bg-primary/5"
                    aria-label="Back to service selection"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
                  </button>
                  <div className="min-w-0 flex-1 space-y-1">
                    <DialogTitle className="text-left text-xl font-bold leading-tight tracking-tight sm:text-2xl">
                      Confirm location
                    </DialogTitle>
                    <DialogDescription className="text-left text-sm leading-snug">
                      <span className="font-semibold text-foreground">{selectedService}</span>
                      {selectedCategory ? (
                        <>
                          <span className="text-muted-foreground/50"> · </span>
                          <span className="text-muted-foreground">{selectedCategory}</span>
                        </>
                      ) : null}
                    </DialogDescription>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground shadow-md transition hover:border-primary/30 hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5">
                <div className="mx-auto flex max-w-md flex-col gap-5">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-[1.75rem] border border-primary/20 bg-primary/10 shadow-sm">
                        <MapPin className="h-11 w-11 text-primary drop-shadow-sm" strokeWidth={1.65} aria-hidden />
                        {locationStatus === 'detecting' ? (
                          <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-card shadow-lg">
                            <Loader2 className="h-4 w-4 animate-spin text-sky-600 dark:text-sky-400" aria-hidden />
                          </span>
                        ) : locationStatus === 'ready' && useDetectedLocation ? (
                          <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-emerald-500 text-white shadow-lg">
                            <CheckCircle2 className="h-4 w-4" aria-hidden />
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <p className="text-center text-sm font-medium text-foreground/90">
                    Where should the provider meet you?
                  </p>

                  <div
                    className="grid grid-cols-2 gap-2 rounded-2xl border border-border/50 bg-muted/30 p-1.5 shadow-inner"
                    role="tablist"
                    aria-label="Location source"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={useDetectedLocation}
                      onClick={() => onUseDetectedLocation(true)}
                      className={cn(
                        'flex min-h-[52px] touch-manipulation flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-sm font-semibold transition-all active:scale-[0.99] sm:flex-row sm:gap-2',
                        useDetectedLocation
                          ? 'bg-card text-foreground shadow-sm ring-1 ring-sky-500/30'
                          : 'text-muted-foreground hover:bg-card/80 hover:text-foreground',
                      )}
                    >
                      <Navigation
                        className={cn('h-5 w-5 shrink-0', useDetectedLocation ? 'text-sky-600 dark:text-sky-400' : 'opacity-70')}
                        aria-hidden
                      />
                      <span className="truncate">Use GPS</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={!useDetectedLocation}
                      onClick={() => onUseDetectedLocation(false)}
                      className={cn(
                        'flex min-h-[52px] touch-manipulation flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-sm font-semibold transition-all active:scale-[0.99] sm:flex-row sm:gap-2',
                        !useDetectedLocation
                          ? 'bg-card text-foreground shadow-sm ring-1 ring-amber-500/25'
                          : 'text-muted-foreground hover:bg-card/80 hover:text-foreground',
                      )}
                    >
                      <PencilLine
                        className={cn(
                          'h-5 w-5 shrink-0',
                          !useDetectedLocation ? 'text-amber-700 dark:text-amber-400' : 'opacity-70',
                        )}
                        aria-hidden
                      />
                      <span className="truncate">Type address</span>
                    </button>
                  </div>

                  {useDetectedLocation ? (
                    <div className="rounded-2xl border border-sky-500/20 bg-card p-4 shadow-sm ring-1 ring-sky-500/10">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                              locationStatus === 'ready'
                                ? 'bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/25 dark:text-emerald-400'
                                : locationStatus === 'detecting'
                                  ? 'bg-sky-500/15 text-sky-800 ring-1 ring-sky-500/25 dark:text-sky-300'
                                  : locationStatus === 'error'
                                    ? 'bg-destructive/15 text-destructive ring-1 ring-destructive/20'
                                    : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {locationStatus === 'detecting' ? (
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                            ) : locationStatus === 'ready' ? (
                              <MapPin className="h-3 w-3" aria-hidden />
                            ) : null}
                            {locationStatus === 'detecting'
                              ? 'Locating…'
                              : locationStatus === 'ready'
                                ? 'Pin ready'
                                : locationStatus === 'error'
                                  ? 'Needs attention'
                                  : 'Waiting for GPS'}
                          </span>
                          {locationStatus === 'ready' && locationAccuracyLabel ? (
                            <span className="text-[11px] font-medium text-muted-foreground">{locationAccuracyLabel}</span>
                          ) : null}
                        </div>
                        <p className="break-words text-base font-medium leading-snug text-foreground sm:text-sm">
                          {locationStatus === 'ready' && detectedLocation ? detectedLocation : locationMessage}
                        </p>
                        <button
                          type="button"
                          onClick={onRefreshLocation}
                          disabled={locationStatus === 'detecting'}
                          className="flex min-h-[52px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-sky-500/25 bg-background/90 text-sm font-semibold text-foreground shadow-sm transition hover:bg-sky-500/5 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
                        >
                          {locationStatus === 'detecting' ? (
                            <Loader2 className="h-4 w-4 animate-spin text-sky-600" aria-hidden />
                          ) : (
                            <Navigation className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
                          )}
                          Refresh location
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-500/20 bg-card p-4 shadow-sm ring-1 ring-amber-500/10">
                      <div className="space-y-2">
                        <label
                          htmlFor="quick-request-manual-location"
                          className="flex items-center gap-2 text-sm font-bold text-foreground"
                        >
                          <PencilLine className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden />
                          Area or address
                        </label>
                        <input
                          id="quick-request-manual-location"
                          value={manualLocation}
                          onChange={(e) => onManualLocationChange(e.target.value)}
                          placeholder="e.g. Ntinda, near Capital Shoppers"
                          autoComplete="street-address"
                          className="min-h-[52px] w-full rounded-xl border border-amber-500/20 bg-background/95 px-4 py-3 text-base text-foreground shadow-inner placeholder:text-muted-foreground focus-visible:border-amber-500/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-amber-500/20 sm:text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <footer className="relative z-10 shrink-0 space-y-2 border-t border-border/40 bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  className={cn(
                    'inline-flex min-h-[54px] w-full touch-manipulation items-center justify-center gap-2 rounded-2xl px-4 text-base font-bold transition active:scale-[0.99] sm:min-h-12 sm:text-sm',
                    canSubmit
                      ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90'
                      : 'cursor-not-allowed bg-muted text-muted-foreground shadow-none',
                  )}
                >
                  {identityMode !== 'buyer' ? 'Continue to sign in' : 'Submit request'}
                  <ArrowRight className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
                </button>
                {!canPressSubmit ? (
                  <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                    {useDetectedLocation
                      ? 'Allow location access or refresh GPS, or switch to type your address.'
                      : 'Enter your area or address to continue.'}
                  </p>
                ) : null}
                {submitError ? (
                  <p className="text-center text-sm font-medium text-destructive" role="alert">
                    {submitError}
                  </p>
                ) : null}
                {identityMode !== 'buyer' ? (
                  <p className="text-center text-[11px] text-muted-foreground">Sign in to save and track your request.</p>
                ) : null}
              </footer>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
