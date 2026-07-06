'use client';

import { useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  email: string;
  phone: string;
  saving?: boolean;
  onSavePhone: (phone: string) => Promise<void>;
};

export function ProfileContactPanel({ email, phone, saving, onSavePhone }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(phone);
  const [error, setError] = useState<string | null>(null);

  const openEditor = () => {
    setDraft(phone);
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed.length < 9) {
      setError('Enter a valid phone number.');
      return;
    }
    setError(null);
    await onSavePhone(trimmed);
    setOpen(false);
  };

  return (
    <>
      <div className="space-y-2">
        <p className="ml-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Contact</p>
        <Card className="overflow-hidden">
          <ContactRow icon={Mail} label="Email" value={email} />
          <div className="ml-14 h-px bg-border" />
          <ContactRow
            icon={Phone}
            label="Phone"
            value={phone?.trim() || 'Not set'}
            muted={!phone?.trim()}
            actionLabel={phone?.trim() ? 'Edit' : 'Add'}
            onAction={openEditor}
          />
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phone number</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Used for checkout, service updates, and provider contact.
          </p>
          <div className="space-y-2">
            <Label htmlFor="phone-edit">Phone</Label>
            <Input
              id="phone-edit"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. +256 700 000000"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save phone number'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  muted,
  actionLabel,
  onAction,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  muted?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-primary/10">
        <Icon className="h-[17px] w-[17px] text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={muted ? 'text-muted-foreground' : 'font-semibold'}>{value}</p>
      </div>
      {actionLabel && onAction ? (
        <Button variant="ghost" size="sm" className="rounded-full bg-primary/10 text-primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
