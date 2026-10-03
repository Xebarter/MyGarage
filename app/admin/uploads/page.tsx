'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileArchive,
  Loader2,
  RefreshCw,
  Store,
  Trash2,
  Truck,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  MOBILE_APP_AUDIENCES,
  MOBILE_APP_BUCKET,
  MOBILE_APP_COPY,
  MOBILE_APP_MAX_BYTES,
  MOBILE_APP_PLATFORMS,
  appContentType,
  appFileExtension,
  formatFileSize,
  startAppDownload,
  validateAppUpload,
  type MobileAppAudience,
  type MobileAppPlatform,
} from '@/lib/mobile-apps';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type AdminRelease = {
  audience: MobileAppAudience;
  platform: MobileAppPlatform;
  fileName: string;
  fileSize: number;
  versionLabel: string;
  notes: string;
  updatedAt: string;
  downloadUrl: string | null;
};

type AudienceSlots = Record<MobileAppPlatform, AdminRelease | null>;
type ReleaseMap = Record<MobileAppAudience, AudienceSlots>;

const EMPTY_SLOTS: AudienceSlots = { android: null, ios: null };
const EMPTY_RELEASES: ReleaseMap = {
  public: { ...EMPTY_SLOTS },
  vendor: { ...EMPTY_SLOTS },
  services: { ...EMPTY_SLOTS },
};

const AUDIENCE_PRESENTATION: Record<
  MobileAppAudience,
  { kicker: string; bar: string; iconWrap: string; Icon: typeof Store }
> = {
  public: {
    kicker: 'Buyers',
    bar: 'from-primary via-emerald-400/80 to-transparent',
    iconWrap: 'bg-primary/10 text-primary ring-1 ring-primary/15',
    Icon: Store,
  },
  vendor: {
    kicker: 'Suppliers',
    bar: 'from-amber-500 via-accent to-transparent',
    iconWrap: 'bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200',
    Icon: Truck,
  },
  services: {
    kicker: 'Providers',
    bar: 'from-sky-600 via-sky-400/70 to-transparent',
    iconWrap: 'bg-sky-500/10 text-sky-800 ring-1 ring-sky-500/15 dark:text-sky-200',
    Icon: Wrench,
  },
};

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return formatUpdated(iso);
}

export default function AdminUploadsPage() {
  const [releases, setReleases] = useState<ReleaseMap>(EMPTY_RELEASES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/mobile-apps', { cache: 'no-store' });
      const body = (await res.json().catch(() => null)) as { error?: string; releases?: ReleaseMap } | null;
      if (!res.ok || !body?.releases) {
        throw new Error(body?.error || 'Could not load app uploads.');
      }
      setReleases({
        public: { android: body.releases.public?.android ?? null, ios: body.releases.public?.ios ?? null },
        vendor: { android: body.releases.vendor?.android ?? null, ios: body.releases.vendor?.ios ?? null },
        services: { android: body.releases.services?.android ?? null, ios: body.releases.services?.ios ?? null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load app uploads.';
      setLoadError(message);
      if (silent) toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const published = useMemo(
    () =>
      MOBILE_APP_AUDIENCES.reduce(
        (count, audience) => count + MOBILE_APP_PLATFORMS.filter((platform) => releases[audience][platform]).length,
        0,
      ),
    [releases],
  );
  const latest = useMemo(() => {
    const stamps = MOBILE_APP_AUDIENCES.flatMap((audience) =>
      MOBILE_APP_PLATFORMS.map((platform) => releases[audience][platform]?.updatedAt),
    ).filter((value): value is string => Boolean(value));
    if (!stamps.length) return '';
    return stamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? '';
  }, [releases]);

  return (
    <div className="min-h-full bg-muted/25">
      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 md:px-8 md:py-10">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Distribution</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">App uploads</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Publish Android and iOS builds for buyers, suppliers, and service providers. A missing build shows as coming soon.
            </p>
          </div>
          <Button type="button" variant="outline" className="self-start lg:self-auto" onClick={() => void load(true)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <SummaryTile label="Published" value={loading ? '—' : `${published} of 6`} hint="Android and iOS builds" />
          <SummaryTile
            label="Last release"
            value={latest ? formatRelative(latest) : loading ? '—' : 'None yet'}
            hint={latest ? formatUpdated(latest) : 'No files uploaded'}
          />
          <SummaryTile label="File limit" value="75 MB" hint="APK or IPA · signed download links" />
        </section>

        {loadError ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-3">
          {MOBILE_APP_AUDIENCES.map((audience) => (
            <AppReleaseCard
              key={audience}
              audience={audience}
              slots={releases[audience]}
              loading={loading}
              onChanged={() => void load(true)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/90 px-4 py-4 shadow-[0_8px_24px_rgba(24,40,28,0.04)] ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function AppReleaseCard({
  audience,
  slots,
  loading,
  onChanged,
}: {
  audience: MobileAppAudience;
  slots: AudienceSlots;
  loading: boolean;
  onChanged: () => void;
}) {
  const copy = MOBILE_APP_COPY[audience];
  const presentation = AUDIENCE_PRESENTATION[audience];
  const Icon = presentation.Icon;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState<MobileAppPlatform>('android');
  const release = slots[platform];
  const platformLabel = platform === 'ios' ? 'iOS' : 'Android';
  const fileInputRefKey = `${audience}-${platform}`;
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [versionLabel, setVersionLabel] = useState(release?.versionLabel ?? '');
  const [notes, setNotes] = useState(release?.notes ?? '');
  const [busy, setBusy] = useState<'prepare' | 'upload' | 'confirm' | 'remove' | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    setVersionLabel(release?.versionLabel ?? '');
    setNotes(release?.notes ?? '');
    setFile(null);
    setFileError('');
    setConfirmRemove(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [platform, release?.updatedAt, release?.versionLabel, release?.notes]);

  function chooseFile(next: File | null) {
    setConfirmRemove(false);
    if (!next) {
      setFile(null);
      setFileError('');
      return;
    }
    const invalid = validateAppUpload(platform, next.name, next.type, next.size);
    setFile(next);
    setFileError(invalid ?? '');
  }

  async function upload() {
    if (!file) {
      toast.error(platform === 'ios' ? 'Choose an IPA file.' : 'Choose an APK file.');
      return;
    }
    const invalid = validateAppUpload(platform, file.name, file.type, file.size);
    if (invalid) {
      setFileError(invalid);
      toast.error(invalid);
      return;
    }

    setBusy('prepare');
    try {
      const contentType = appContentType(platform, file.type);
      const prepRes = await fetch('/api/admin/mobile-apps/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience,
          platform,
          fileName: file.name,
          fileSize: file.size,
          contentType,
        }),
      });
      const prep = (await prepRes.json().catch(() => null)) as {
        error?: string;
        path?: string;
        token?: string;
        contentType?: string;
      } | null;
      if (!prepRes.ok || !prep?.path || !prep.token) {
        throw new Error(prep?.error || 'Could not start the upload.');
      }

      setBusy('upload');
      const uploadType = prep.contentType || contentType;
      const apkFile = file.type === uploadType ? file : new File([file], file.name, { type: uploadType });
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(MOBILE_APP_BUCKET)
        .uploadToSignedUrl(prep.path, prep.token, apkFile, {
          contentType: uploadType,
        });
      if (uploadError) {
        const detail = uploadError.message || 'Upload failed.';
        if (/maximum allowed size|payload too large|entity too large/i.test(detail)) {
          throw new Error(
            'This file is over the storage size cap. In Supabase, open Storage settings and set the global file size limit to 75 MB, then try again.',
          );
        }
        throw new Error(detail);
      }

      setBusy('confirm');
      const confirmRes = await fetch('/api/admin/mobile-apps/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience,
          platform,
          storagePath: prep.path,
          fileName: file.name,
          fileSize: file.size,
          versionLabel,
          notes,
        }),
      });
      const confirmed = (await confirmRes.json().catch(() => null)) as { error?: string } | null;
      if (!confirmRes.ok) {
        throw new Error(confirmed?.error || 'Could not save the upload.');
      }

      setFile(null);
      setFileError('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(`${copy.adminTitle} ${platformLabel} updated.`);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!release) return;
    setBusy('remove');
    try {
      const res = await fetch(`/api/admin/mobile-apps/${audience}?platform=${platform}`, { method: 'DELETE' });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error || 'Could not remove the app.');
      setFile(null);
      setFileError('');
      setConfirmRemove(false);
      toast.success(`${copy.adminTitle} ${platformLabel} removed.`);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove the app.');
    } finally {
      setBusy(null);
    }
  }

  const busyLabel =
    busy === 'prepare' ? 'Preparing upload…' : busy === 'upload' ? `Uploading ${platformLabel}…` : busy === 'confirm' ? 'Publishing release…' : '';

  return (
    <section className="relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_12px_32px_rgba(24,40,28,0.05)] ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
      <div className={cn('absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r', presentation.bar)} aria-hidden />

      <div className="flex items-start gap-3 px-5 pt-5">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', presentation.iconWrap)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{presentation.kicker}</p>
          <h2 className="mt-0.5 text-lg font-semibold tracking-tight">{copy.adminTitle}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.description}</p>
        </div>
      </div>

      <div className="mx-5 mt-4 grid grid-cols-2 gap-2">
        {MOBILE_APP_PLATFORMS.map((item) => {
          const live = Boolean(slots[item]);
          const selected = platform === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setPlatform(item)}
              className={cn(
                'rounded-xl border px-3 py-2 text-left transition-colors',
                selected ? 'border-primary bg-primary/5' : 'border-border/70 bg-background hover:bg-muted/40',
              )}
            >
              <span className="block text-sm font-semibold text-foreground">{item === 'ios' ? 'iOS' : 'Android'}</span>
              <span className={cn('mt-0.5 block text-[11px] font-medium', live ? 'text-primary' : 'text-muted-foreground')}>
                {live ? 'Live' : 'Not published'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mx-5 mt-4">
        {loading && !release ? (
          <div className="animate-pulse space-y-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-4">
            <div className="h-3 w-16 rounded-full bg-muted" />
            <div className="h-4 w-3/4 rounded-full bg-muted" />
            <div className="h-3 w-1/2 rounded-full bg-muted" />
          </div>
        ) : release ? (
          <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Live
              </span>
              {release.versionLabel ? (
                <span className="rounded-full border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                  v{release.versionLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-3 truncate text-sm font-medium text-foreground" title={release.fileName}>
              {release.fileName}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatFileSize(release.fileSize)}
              {release.updatedAt ? ` · Updated ${formatRelative(release.updatedAt)}` : ''}
            </p>
            {release.notes ? (
              <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{release.notes}</p>
            ) : null}
            {release.downloadUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => startAppDownload(release.downloadUrl!)}
              >
                <Download className="h-4 w-4" />
                Download build
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-4">
            <p className="text-sm font-medium text-foreground">No build published</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {platformLabel} will show as coming soon until you publish a file.
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-1 flex-col gap-4 border-t border-border/60 px-5 py-5">
        <div className="space-y-2">
          <Label htmlFor={fileInputRefKey}>New {platformLabel} file</Label>
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              if (busy === null) setDragOver(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (busy === null) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              if (busy !== null) return;
              chooseFile(event.dataTransfer.files?.[0] ?? null);
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border border-dashed px-3 py-3 text-left transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-border bg-background',
              fileError ? 'border-destructive/50' : '',
              busy !== null ? 'opacity-60' : '',
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {file ? <FileArchive className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy !== null}
              className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
            >
              <span className="block truncate text-sm font-medium text-foreground">
                {file ? file.name : `Drop a ${platform === 'ios' ? 'IPA' : 'APK'} here, or browse`}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {file ? formatFileSize(file.size) : `${appFileExtension(platform).toUpperCase()} · up to ${formatFileSize(MOBILE_APP_MAX_BYTES)}`}
              </span>
            </button>
            {file ? (
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear selected file"
                disabled={busy !== null}
                onClick={() => {
                  chooseFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            id={fileInputRefKey}
            key={fileInputRefKey}
            type="file"
            accept={platform === 'ios' ? '.ipa,application/octet-stream' : '.apk,application/vnd.android.package-archive'}
            className="sr-only"
            disabled={busy !== null}
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
          {fileError ? <p className="text-xs text-destructive">{fileError}</p> : null}
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${audience}-version`}>Version</Label>
            <Input
              id={`${audience}-version`}
              value={versionLabel}
              maxLength={80}
              placeholder="1.0.0"
              disabled={busy !== null}
              onChange={(event) => setVersionLabel(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${audience}-notes`}>Release notes</Label>
            <Textarea
              id={`${audience}-notes`}
              value={notes}
              maxLength={1000}
              rows={3}
              placeholder="What changed in this build"
              disabled={busy !== null}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        {busy && busy !== 'remove' ? (
          <div className="space-y-2">
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
            </div>
            <p className="text-xs text-muted-foreground">{busyLabel}</p>
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Button type="button" onClick={() => void upload()} disabled={busy !== null || !file || Boolean(fileError)}>
            {busy && busy !== 'remove' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {release ? `Replace ${platformLabel}` : `Publish ${platformLabel}`}
          </Button>
          {release && !confirmRemove ? (
            <Button type="button" variant="ghost" onClick={() => setConfirmRemove(true)} disabled={busy !== null}>
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          ) : null}
          {release && confirmRemove ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-2 py-1.5">
              <span className="px-1 text-xs text-destructive">Remove the live build?</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmRemove(false)} disabled={busy !== null}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => void remove()} disabled={busy !== null}>
                {busy === 'remove' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
