'use client';

import { useMemo, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  cancelReasonsForStage,
  MAX_CANCEL_NOTE_LENGTH,
  OTHER_CANCEL_REASON_ID,
  type ServiceCancelStage,
} from '@/lib/service-cancellation';
import { cn } from '@/lib/utils';

type BuyerServiceCancelDialogProps = {
  open: boolean;
  stage: ServiceCancelStage;
  service: string;
  location?: string | null;
  submitting?: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { reasonId: string; note?: string }) => void;
};

export function BuyerServiceCancelDialog({
  open,
  stage,
  service,
  location,
  submitting,
  error,
  onOpenChange,
  onConfirm,
}: BuyerServiceCancelDialogProps) {
  const [reasonId, setReasonId] = useState<string>('');
  const [note, setNote] = useState('');
  const reasons = useMemo(() => cancelReasonsForStage(stage), [stage]);
  const searching = stage === 'searching';
  const other = reasonId === OTHER_CANCEL_REASON_ID;
  const trimmedNote = note.trim();
  const canSubmit = Boolean(reasonId) && (!other || trimmedNote.length >= 3) && !submitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        if (!next) {
          setReasonId('');
          setNote('');
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={!submitting}
        className={cn(
          'flex max-h-[min(92dvh,720px)] w-[min(100vw-1.5rem,28rem)] flex-col gap-0 overflow-hidden rounded-[1.35rem] border-border/70 p-0 sm:max-w-md',
          'bg-background shadow-[0_24px_60px_rgba(18,36,28,0.22)]',
        )}
      >
        <div className="border-b border-border/60 px-5 pb-4 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            {searching ? 'Cancel search' : 'Cancel request'}
          </p>
          <DialogTitle className="mt-1 text-left text-[1.35rem] font-semibold tracking-tight text-foreground">
            {searching ? 'Why are you stopping this search?' : 'Why are you cancelling before they arrive?'}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {searching
              ? 'We will stop notifying providers. You can request again anytime.'
              : 'The assigned provider will be released. You can book again if you still need help.'}
          </DialogDescription>
          <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-foreground">{service}</p>
            {location ? (
              <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                <span className="line-clamp-2">{location}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {reasons.map((reason) => {
            const selected = reasonId === reason.id;
            return (
              <button
                key={reason.id}
                type="button"
                onClick={() => setReasonId(reason.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition',
                  selected
                    ? 'border-primary/40 bg-primary/[0.08] shadow-sm'
                    : 'border-border/70 bg-muted/25 hover:border-primary/25 hover:bg-muted/40',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                  )}
                  aria-hidden
                >
                  {selected ? <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{reason.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{reason.detail}</span>
                </span>
              </button>
            );
          })}
          {other ? (
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, MAX_CANCEL_NOTE_LENGTH))}
              placeholder="Tell us what happened"
              className="min-h-[88px] rounded-xl"
              maxLength={MAX_CANCEL_NOTE_LENGTH}
            />
          ) : null}
          {error ? <p className="px-1 text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="border-t border-border/60 px-4 py-3">
          <Button
            type="button"
            className="h-11 w-full rounded-xl font-semibold"
            disabled={!canSubmit}
            onClick={() => onConfirm({ reasonId, note: other ? trimmedNote : undefined })}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cancelling
              </>
            ) : (
              'Confirm cancellation'
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="mt-1 h-10 w-full rounded-xl"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Keep this request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
