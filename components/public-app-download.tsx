'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  MOBILE_APP_COPY,
  fetchMobileAppDownload,
  formatFileSize,
  startApkDownload,
  type MobileAppDownloadInfo,
} from '@/lib/mobile-apps';

export function PublicAppDownload() {
  const [info, setInfo] = useState<MobileAppDownloadInfo | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchMobileAppDownload('public').then((result) => {
      if (cancelled) return;
      if (result.status === 'ready') {
        setInfo(result.info);
        setPhase('ready');
        return;
      }
      if (result.status === 'empty') {
        setPhase('empty');
        return;
      }
      setMessage(result.status === 'error' ? result.message : 'Could not load the app download.');
      setPhase('error');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function download() {
    setDownloading(true);
    setMessage('');
    const result = await fetchMobileAppDownload('public');
    setDownloading(false);
    if (result.status !== 'ready') {
      setMessage(result.status === 'empty' ? 'The Android app is not available yet.' : 'Could not start the download.');
      if (result.status === 'empty') setPhase('empty');
      return;
    }
    setInfo(result.info);
    startApkDownload(result.info.downloadUrl);
  }

  const copy = MOBILE_APP_COPY.public;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Smartphone className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{copy.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">{copy.description}</p>
        </div>
      </div>

      {phase === 'loading' ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Checking for the latest app…
        </p>
      ) : null}

      {phase === 'empty' ? (
        <p className="mt-6 text-sm leading-6 text-muted-foreground">
          The Android app is not available for download yet. Check back soon.
        </p>
      ) : null}

      {phase === 'error' ? <p className="mt-6 text-sm text-destructive">{message}</p> : null}

      {phase === 'ready' && info ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {info.versionLabel ? `Version ${info.versionLabel} · ` : ''}
            {formatFileSize(info.fileSize)} · Android APK
          </p>
          {info.notes ? <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{info.notes}</p> : null}
          <p className="text-sm leading-6 text-muted-foreground">
            After the file downloads, open it on your Android phone. If Android asks, allow installation from your
            browser.
          </p>
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <Button type="button" size="lg" onClick={() => void download()} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download the app
          </Button>
        </div>
      ) : null}
    </section>
  );
}
