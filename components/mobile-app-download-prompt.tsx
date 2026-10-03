'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { AppPlatformChoices } from '@/components/app-platform-choices';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MOBILE_APP_COPY,
  appDownloadDismissKey,
  catalogStamp,
  fetchMobileAppDownload,
  startAppDownload,
  type MobileAppAudience,
  type MobileAppCatalog,
  type MobileAppPlatform,
  type MobileAppPlatformDownload,
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
  const [catalog, setCatalog] = useState<MobileAppCatalog | null>(null);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<MobileAppPlatform | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (pending) {
      setCatalog(null);
      setOpen(false);
      return;
    }

    let cancelled = false;
    void fetchMobileAppDownload(audience).then((result) => {
      if (cancelled || result.status === 'forbidden' || result.status === 'error') return;
      if (result.status === 'empty') {
        setCatalog(result.catalog);
        setOpen(false);
        return;
      }
      const seen = window.localStorage.getItem(appDownloadDismissKey(audience));
      setCatalog(result.catalog);
      setOpen(seen !== catalogStamp(result.catalog));
    });

    return () => {
      cancelled = true;
    };
  }, [audience, pending]);

  function rememberSeen() {
    if (!catalog) return;
    window.localStorage.setItem(appDownloadDismissKey(audience), catalogStamp(catalog));
    setOpen(false);
  }

  async function download(platform: MobileAppPlatform, info: MobileAppPlatformDownload) {
    setDownloading(platform);
    setError('');
    const fresh = await fetchMobileAppDownload(audience);
    setDownloading(null);
    if (fresh.status !== 'ready') {
      setError('Could not start the download.');
      return;
    }
    const next = platform === 'ios' ? fresh.catalog.ios : fresh.catalog.android;
    if (!next) {
      setCatalog(fresh.catalog);
      return;
    }
    setCatalog(fresh.catalog);
    startAppDownload(next.downloadUrl || info.downloadUrl);
    window.localStorage.setItem(appDownloadDismissKey(audience), catalogStamp(fresh.catalog));
    setOpen(false);
  }

  if (!catalog || (!catalog.android && !catalog.ios)) return null;

  const copy = MOBILE_APP_COPY[audience];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) rememberSeen();
        else setOpen(true);
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[420px]">
        <div className="bg-gradient-to-b from-primary/10 to-transparent px-6 pt-6 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">MyGarage</p>
          <DialogTitle className="mt-2 text-2xl tracking-tight">{copy.title}</DialogTitle>
          <DialogDescription className="mt-1">Choose your phone.</DialogDescription>
        </div>
        <div className="px-6 pb-6">
          <AppPlatformChoices
            android={catalog.android}
            ios={catalog.ios}
            downloading={downloading}
            onDownload={(platform, info) => void download(platform, info)}
          />
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          <button
            type="button"
            onClick={rememberSeen}
            className="mt-4 w-full text-center text-sm text-muted-foreground transition hover:text-foreground"
          >
            Not now
          </button>
        </div>
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
  const [catalog, setCatalog] = useState<MobileAppCatalog | null>(null);
  const [downloading, setDownloading] = useState<MobileAppPlatform | null>(null);

  useEffect(() => {
    if (pending) {
      setCatalog(null);
      return;
    }
    let cancelled = false;
    void fetchMobileAppDownload(audience).then((result) => {
      if (cancelled || result.status === 'forbidden' || result.status === 'error') return;
      setCatalog(result.catalog);
    });
    return () => {
      cancelled = true;
    };
  }, [audience, pending]);

  if (!catalog || (!catalog.android && !catalog.ios)) return null;

  function start(platform: MobileAppPlatform) {
    const current = platform === 'ios' ? catalog?.ios : catalog?.android;
    if (!current) return;
    onNavigate?.();
    setDownloading(platform);
    void fetchMobileAppDownload(audience).then((result) => {
      setDownloading(null);
      if (result.status !== 'ready') return;
      const next = platform === 'ios' ? result.catalog.ios : result.catalog.android;
      if (next) startAppDownload(next.downloadUrl);
    });
  }

  return (
    <div className="mt-4">
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">App</p>
      <SidebarPlatform
        label="Android"
        ready={Boolean(catalog.android)}
        busy={downloading === 'android'}
        onClick={() => start('android')}
      />
      <SidebarPlatform
        label="iOS"
        ready={Boolean(catalog.ios)}
        busy={downloading === 'ios'}
        onClick={() => start('ios')}
      />
    </div>
  );
}

function SidebarPlatform({
  label,
  ready,
  busy,
  onClick,
}: {
  label: string;
  ready: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!ready || busy}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm',
        ready ? 'text-foreground/90 hover:bg-accent/80' : 'cursor-default text-muted-foreground',
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="text-[11px] uppercase tracking-wide">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : ready ? 'Download' : 'Coming soon'}
      </span>
    </button>
  );
}
