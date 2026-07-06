'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VEHICLE_STATUSES, VEHICLE_STATUS_LABELS, type VehicleStatus } from '@/lib/garage';

export type GarageCompletionPayload = {
  vehicleStatus: VehicleStatus;
  nextServiceDate: string | null;
  notes: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: GarageCompletionPayload) => void | Promise<void>;
  saving?: boolean;
  vehicleLabel?: string;
};

export function ProviderGarageCompletionDialog({
  open,
  onOpenChange,
  onConfirm,
  saving,
  vehicleLabel,
}: Props) {
  const [vehicleStatus, setVehicleStatus] = useState<VehicleStatus>('no_active_issues');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    void onConfirm({
      vehicleStatus,
      nextServiceDate: nextServiceDate.trim() ? nextServiceDate.trim() : null,
      notes: notes.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update vehicle garage status</DialogTitle>
          <DialogDescription>
            {vehicleLabel
              ? `Set the current status and next service date for ${vehicleLabel}. This updates the buyer's My Garage view.`
              : 'Set the vehicle status and next recommended service date for the buyer.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">Vehicle status</label>
            <Select value={vehicleStatus} onValueChange={(v) => setVehicleStatus(v as VehicleStatus)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {VEHICLE_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Next recommended service date</label>
            <Input
              className="mt-2"
              type="date"
              value={nextServiceDate}
              onChange={(e) => setNextServiceDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Service notes (optional)</label>
            <Textarea
              className="mt-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, parts replaced, follow-up recommendations…"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? 'Saving…' : 'Complete & update garage'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
