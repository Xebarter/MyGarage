'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { SERVICE_HISTORY_STATUS_LABELS, SERVICE_HISTORY_TYPE_LABELS } from '@/lib/garage';

import type { GarageServiceHistoryEntry } from './types';
import { formatGarageDate } from './utils';

export function ServiceLogCard({ entry }: { entry: GarageServiceHistoryEntry }) {
  const photos = entry.photoUrls?.filter(Boolean) ?? [];
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{entry.serviceName}</p>
          <p className="text-xs text-muted-foreground">
            {SERVICE_HISTORY_TYPE_LABELS[entry.serviceType]} · {formatGarageDate(entry.serviceDate)}
            {entry.odometerKm != null ? ` · ${entry.odometerKm.toLocaleString()} km` : ''}
          </p>
        </div>
        <Badge variant="outline">{SERVICE_HISTORY_STATUS_LABELS[entry.status]}</Badge>
      </div>
      <p className="mt-2 text-sm">
        <span className="text-muted-foreground">Provider:</span> {entry.providerName || '—'}
      </p>
      {entry.notes ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{entry.notes}</p>
      ) : null}
      {entry.findings ? (
        <p className="mt-2 text-sm">
          <span className="font-medium text-foreground">Findings: </span>
          <span className="whitespace-pre-wrap text-muted-foreground">{entry.findings}</span>
        </p>
      ) : null}
      {entry.partsUsed ? (
        <p className="mt-2 text-sm">
          <span className="font-medium text-foreground">Parts: </span>
          <span className="text-muted-foreground">{entry.partsUsed}</span>
        </p>
      ) : null}
      {entry.recommendations ? (
        <p className="mt-2 text-sm">
          <span className="font-medium text-foreground">Recommendations: </span>
          <span className="whitespace-pre-wrap text-muted-foreground">{entry.recommendations}</span>
        </p>
      ) : null}
      {photos.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {photos.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="relative h-16 w-20 overflow-hidden rounded-lg border border-border/70">
              <Image src={url} alt="" fill className="object-cover" unoptimized />
            </a>
          ))}
        </div>
      ) : null}
      {entry.linkedRequest?.id ? (
        <Link
          href={`/buyer/services/track/${encodeURIComponent(entry.linkedRequest.id)}`}
          className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
        >
          View original request
        </Link>
      ) : null}
    </div>
  );
}
