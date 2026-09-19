'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DocumentType } from '@/lib/buyer-control-center';

import type { GarageVehicleDocument } from './types';
import { formatGarageDate } from './utils';

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'logbook', label: 'Logbook' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'registration', label: 'Registration' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'other', label: 'Other' },
];

export function VehicleDocumentsPanel({
  customerId,
  vehicleId,
}: {
  customerId: string;
  vehicleId: string;
}) {
  const [docs, setDocs] = useState<GarageVehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('insurance');
  const [expiresAt, setExpiresAt] = useState('');

  const load = useCallback(async () => {
    if (!customerId || !vehicleId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/buyer/vehicle-documents?customerId=${encodeURIComponent(customerId)}&vehicleId=${encodeURIComponent(vehicleId)}`,
      );
      if (!res.ok) {
        setDocs([]);
        return;
      }
      const data = (await res.json()) as GarageVehicleDocument[];
      setDocs(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [customerId, vehicleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/buyer/vehicle-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          vehicleId,
          documentType,
          name: name.trim(),
          fileUrl: fileUrl.trim() || null,
          expiresAt: expiresAt || null,
        }),
      });
      if (res.ok) {
        setName('');
        setFileUrl('');
        setExpiresAt('');
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : docs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 text-sm text-muted-foreground">
          No documents yet. Add a logbook, insurance, or inspection record for this vehicle.
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="truncate">{doc.name}</span>
                </p>
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {doc.documentType}
                  {doc.expiresAt ? ` · Expires ${formatGarageDate(doc.expiresAt)}` : ''}
                </p>
              </div>
              {doc.fileUrl ? (
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-primary hover:underline">
                  Open
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Document name</Label>
          <Input className="h-11 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} placeholder="Comprehensive insurance" />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>File URL (optional)</Label>
          <Input className="h-11 rounded-xl" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div className="space-y-1.5">
          <Label>Expires</Label>
          <Input className="h-11 rounded-xl" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
      </div>
      <Button className="rounded-xl" onClick={() => void add()} disabled={saving || !name.trim()}>
        <Plus className="h-4 w-4" />
        {saving ? 'Saving…' : 'Add document'}
      </Button>
    </div>
  );
}
