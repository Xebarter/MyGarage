'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, Loader2, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MOBILE_APP_COPY,
  appDownloadDismissKey,
  fetchMobileAppDownload,
  formatFileSize,
  startApkDownload,
  type MobileAppAudience,
  type MobileAppDownloadInfo,
} from '@/lib/mobile-apps';
import { cn } from '@/lib/utils';

function isPendingPath(audience: 'vendor' | 'services', pathname: string) {
  return audience === 'vendor'
    ? pathname === '/vendor/pending' || pathname.startsWith('/vendor/pending/')
    : pathname === '/services/pending' || pathname.startsWith('/services/pending/');
}

export function MobileAppDownloadPrompt({ audience }: { audience: 'vendor' | 'services' }) {
  const pathname = usePathname();
  const pending = isPendingPath(audience, pathname);
  const [info, setInfo] = useState<MobileAppDownloadInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (pending) {
      setInfo(null);
      setOpen(false);
      return;
    }

    let cancelled = false;
    void fetchMobileAppDownload(audience).then((result) => {
      if (cancelled) return;
      if (result.status !== 'ready') {
        setInfo(null);
        setOpen(false);
        return;
      }
      const seen = window.localStorage.getItem(appDownloadDismissKey(audience));
      setInfo(result.info);
      setOpen(seen !== result.info.updatedAt);
    });

    return () => {
      cancelled = true;
    };
  }, [audience, pending]);

  function rememberSeen() {
    if (!info) return;
    window.localStorage.setItem(appDownloadDismissKey(audience), info.updatedAt);
    setOpen(false);
  }

  async function download() {
    if (!info) return;
    setDownloading(true);
    setError('');
    const fresh = await fetchMobileAppDownload(audience);
    setDownloading(false);
    if (fresh.status !== 'ready') {
      setError(fresh.status === 'empty' ? 'This app is not available yet.' : 'Could not start the download.');
      return;
    }
    setInfo(fresh.info);
    startApkDownload(fresh.info.downloadUrl);
    window.localStorage.setItem(appDownloadDismissKey(audience), fresh.info.updatedAt);
    setOpen(false);
  }

  if (!info) return null;

  const copy = MOBILE_APP_COPY[audience];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) rememberSeen();
        else setOpen(true);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download the {copy.title.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Your account is verified. Install the Android app to keep working from your phone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{copy.description}</p>
          <p>
            {info.versionLabel ? `Version ${info.versionLabel} · ` : ''}
            {formatFileSize(info.fileSize)}
          </p>
          {info.notes ? <p className="whitespace-pre-wrap text-foreground">{info.notes}</p> : null}
          {error ? <p className="text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={rememberSeen}>
            Not now
          </Button>
          <Button type="button" onClick={() => void download()} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MobileAppSidebarDownload({
  audience,
  onNavigate,
}: {
  audience: 'vendor' | 'services';
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const pending = isPendingPath(audience, pathname);
  const [info, setInfo] = useState<MobileAppDownloadInfo | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (pending) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    void fetchMobileAppDownload(audience).then((result) => {
      if (cancelled) return;
      setInfo(result.status === 'ready' ? result.info : null);
    });
    return () => {
      cancelled = true;
    };
  }, [audience, pending]);

  if (!info) return null;

  const copy = MOBILE_APP_COPY[audience];

  return (
    <div className="mt-4">
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">App</p>
      <button
        type="button"
        disabled={downloading}
        onClick={() => {
          onNavigate?.();
          setDownloading(true);
          void fetchMobileAppDownload(audience).then((result) => {
            setDownloading(false);
            if (result.status === 'ready') startApkDownload(result.info.downloadUrl);
          });
        }}
        className={cn(
          'group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm font-medium text-foreground/90 transition-colors hover:bg-accent/80 hover:text-foreground',
          'disabled:opacity-60',
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/80 text-muted-foreground group-hover:bg-background group-hover:text-foreground">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Smartphone className="h-4 w-4" aria-hidden />}
        </span>
        <span className="truncate">{copy.sidebarLabel}</span>
      </button>
    </div>
  );
}
