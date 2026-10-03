'use client';

import { useEffect, useState } from 'react';

import { AppPlatformChoices } from '@/components/app-platform-choices';
import {
  fetchMobileAppDownload,
  startAppDownload,
  type MobileAppCatalog,
  type MobileAppPlatform,
  type MobileAppPlatformDownload,
} from '@/lib/mobile-apps';

const EMPTY: MobileAppCatalog = { audience: 'public', android: null, ios: null };

export function PublicAppDownload() {
  const [catalog, setCatalog] = useState<MobileAppCatalog>(EMPTY);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [downloading, setDownloading] = useState<MobileAppPlatform | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMobileAppDownload('public').then((result) => {
      if (cancelled) return;
      if (result.status === 'ready' || result.status === 'empty') {
        setCatalog(result.catalog);
        setPhase('ready');
        return;
      }
      setMessage(result.status === 'error' ? result.message : 'Could not load the app.');
      setPhase('error');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function download(_platform: MobileAppPlatform, info: MobileAppPlatformDownload) {
    setDownloading(info.platform);
    setMessage('');
    const result = await fetchMobileAppDownload('public');
    setDownloading(null);
    if (result.status !== 'ready' && result.status !== 'empty') {
      setMessage('Could not start the download.');
      return;
    }
    setCatalog(result.catalog);
    const next = info.platform === 'ios' ? result.catalog.ios : result.catalog.android;
    if (!next) return;
    startAppDownload(next.downloadUrl);
  }

  return (
    <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-[0_16px_40px_rgba(24,40,28,0.06)] ring-1 ring-black/[0.03] md:p-8">
      {phase === 'loading' ? <div className="h-36 animate-pulse rounded-2xl bg-muted/60" /> : null}
      {phase === 'error' ? <p className="text-sm text-destructive">{message}</p> : null}
      {phase === 'ready' ? (
        <>
          <AppPlatformChoices
            android={catalog.android}
            ios={catalog.ios}
            downloading={downloading}
            onDownload={(platform, info) => void download(platform, info)}
          />
          {message ? <p className="mt-3 text-sm text-destructive">{message}</p> : null}
        </>
      ) : null}
    </section>
  );
}
