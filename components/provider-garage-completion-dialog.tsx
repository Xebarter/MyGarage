'use client';

import { useEffect, useState } from 'react';
import { Car, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  findings: string;
  recommendations: string;
  partsUsed: string;
  odometerKm: number | null;
  photoUrls: string[];
  laborHours: number | null;
  attachVehicleId: string | null;
};

type CustomerVehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string | null;
  nickname: string | null;
};

function vehicleLabel(v: CustomerVehicle) {
  return v.nickname?.trim() || `${v.year} ${v.make} ${v.model}`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: GarageCompletionPayload) => void | Promise<void>;
  saving?: boolean;
  vehicleLabel?: string;
  requestId?: string;
  vendorId?: string;
};

export function ProviderGarageCompletionDialog({
  open,
  onOpenChange,
  onConfirm,
  saving,
  vehicleLabel: vehicleHint,
  requestId,
  vendorId,
}: Props) {
  const [vehicleStatus, setVehicleStatus] = useState<VehicleStatus>('no_active_issues');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [notes, setNotes] = useState('');
  const [findings, setFindings] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [odometerKm, setOdometerKm] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [attachVehicleId, setAttachVehicleId] = useState('');
  const [creating, setCreating] = useState(false);
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [newPlate, setNewPlate] = useState('');

  useEffect(() => {
    if (!open || !requestId || !vendorId) return;
    let cancelled = false;
    void fetch(`/api/vendor/service-requests/${encodeURIComponent(requestId)}/vehicles?vendorId=${encodeURIComponent(vendorId)}`)
      .then(async (res) => (res.ok ? ((await res.json()) as { vehicles?: CustomerVehicle[]; linkedVehicle?: CustomerVehicle | null }) : null))
      .then((json) => {
        if (cancelled || !json) return;
        const list = json.vehicles ?? [];
        setVehicles(list);
        const linked = json.linkedVehicle?.id || list.find((v) => v)?.id || '';
        setAttachVehicleId(linked);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, requestId, vendorId]);

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads/service-photo', { method: 'POST', body: fd });
      const body = (await res.json().catch(() => ({}))) as { url?: string };
      if (res.ok && body.url) setPhotoUrls((prev) => [...prev, body.url!].slice(0, 8));
    } finally {
      setUploading(false);
    }
  };

  const createVehicle = async () => {
    if (!requestId || !vendorId || !newMake.trim() || !newModel.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/vendor/service-requests/${encodeURIComponent(requestId)}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          make: newMake.trim(),
          model: newModel.trim(),
          year: Number(newYear),
          licensePlate: newPlate.trim() || null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { vehicle?: CustomerVehicle };
      if (res.ok && body.vehicle) {
        setVehicles((prev) => [body.vehicle!, ...prev]);
        setAttachVehicleId(body.vehicle.id);
        setNewMake('');
        setNewModel('');
        setNewPlate('');
      }
    } finally {
      setCreating(false);
    }
  };

  const canComplete = notes.trim().length > 0 && Boolean(attachVehicleId);

  const handleConfirm = () => {
    if (!canComplete) return;
    void onConfirm({
      vehicleStatus,
      nextServiceDate: nextServiceDate.trim() ? nextServiceDate.trim() : null,
      notes: notes.trim(),
      findings: findings.trim(),
      recommendations: recommendations.trim(),
      partsUsed: partsUsed.trim(),
      odometerKm: odometerKm.trim() ? Number(odometerKm) : null,
      photoUrls,
      laborHours: laborHours.trim() ? Number(laborHours) : null,
      attachVehicleId: attachVehicleId || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete job & update garage</DialogTitle>
          <DialogDescription>
            {vehicleHint
              ? `Write the service log for ${vehicleHint}. Notes and a vehicle are required so the buyer sees this visit in My Garage.`
              : 'Work notes and a vehicle are required so this visit appears in the buyer’s My Garage.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">Buyer vehicle</label>
            {vehicles.length > 0 ? (
              <Select value={attachVehicleId} onValueChange={setAttachVehicleId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {vehicleLabel(v)}
                      {v.licensePlate ? ` · ${v.licensePlate}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">This buyer has no garage vehicles yet. Add one below.</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-dashed border-border/80 p-3">
              <Input placeholder="Make" value={newMake} onChange={(e) => setNewMake(e.target.value)} />
              <Input placeholder="Model" value={newModel} onChange={(e) => setNewModel(e.target.value)} />
              <Input placeholder="Year" type="number" value={newYear} onChange={(e) => setNewYear(e.target.value)} />
              <Input placeholder="Plate" value={newPlate} onChange={(e) => setNewPlate(e.target.value)} />
              <Button
                type="button"
                variant="outline"
                className="col-span-2"
                disabled={creating || !newMake.trim() || !newModel.trim()}
                onClick={() => void createVehicle()}
              >
                <Plus className="h-4 w-4" />
                {creating ? 'Adding…' : 'Add vehicle for this buyer'}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Work notes (required)</label>
            <Textarea
              className="mt-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What you did on this visit…"
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Findings</label>
            <Textarea className="mt-2" value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="What was inspected or found wrong" rows={2} />
          </div>
          <div>
            <label className="text-sm font-medium">Parts used</label>
            <Input className="mt-2" value={partsUsed} onChange={(e) => setPartsUsed(e.target.value)} placeholder="Oil filter, pads…" />
          </div>
          <div>
            <label className="text-sm font-medium">Recommendations</label>
            <Textarea className="mt-2" value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="Follow-up for the buyer" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Odometer (km)</label>
              <Input className="mt-2" type="number" value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Labor hours</label>
              <Input className="mt-2" type="number" step="0.5" value={laborHours} onChange={(e) => setLaborHours(e.target.value)} />
            </div>
          </div>

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
            <Input className="mt-2" type="date" value={nextServiceDate} onChange={(e) => setNextServiceDate(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium">Photos</label>
            <Input
              className="mt-2"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={uploading || photoUrls.length >= 8}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadPhoto(file);
                e.target.value = '';
              }}
            />
            {photoUrls.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">{photoUrls.length} photo{photoUrls.length === 1 ? '' : 's'} attached</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !canComplete}>
            <Car className="h-4 w-4" />
            {saving ? 'Saving…' : 'Complete & update garage'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
