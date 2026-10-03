'use client';

import { Download, Loader2 } from 'lucide-react';

import { formatFileSize, type MobileAppPlatform, type MobileAppPlatformDownload } from '@/lib/mobile-apps';
import { cn } from '@/lib/utils';

function PlatformMark({ platform }: { platform: MobileAppPlatform }) {
  if (platform === 'ios') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="currentColor"
          d="M16.4 12.7c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.3-.1-2.6.8-3.3.8s-1.7-.8-2.8-.8c-1.5 0-2.8.9-3.6 2.2-1.5 2.7-.4 6.6 1.1 8.8.7 1.1 1.6 2.3 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7 1.9-1.1 2.6-2.2c.8-1.2 1.1-2.3 1.2-2.4-.1 0-2.2-.8-2.2-3.5zM14.7 6.4c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.6-1.1 1.7-.9 2.6 1 .1 1.9-.5 2.5-1.2z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="currentColor"
        d="M7.2 8.2h9.6v7.2H7.2V8.2zm-1.4 1.5v4.6c0 .4.3.7.7.7h.3v1.1c0 .4.3.7.7.7s.7-.3.7-.7v-1.1h6.8v1.1c0 .4.3.7.7.7s.7-.3.7-.7v-1.1h.3c.4 0 .7-.3.7-.7V9.7c0-.4-.3-.7-.7-.7h-.3V7.9c0-.4-.3-.7-.7-.7s-.7.3-.7.7v1.1H8.2V7.9c0-.4-.3-.7-.7-.7s-.7.3-.7.7v1.1h-.3c-.4 0-.7.3-.7.7z"
      />
    </svg>
  );
}

export function AppPlatformChoices({
  android,
  ios,
  downloading,
  onDownload,
}: {
  android: MobileAppPlatformDownload | null;
  ios: MobileAppPlatformDownload | null;
  downloading: MobileAppPlatform | null;
  onDownload: (platform: MobileAppPlatform, info: MobileAppPlatformDownload) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <PlatformChoice platform="android" info={android} busy={downloading === 'android'} onDownload={onDownload} />
      <PlatformChoice platform="ios" info={ios} busy={downloading === 'ios'} onDownload={onDownload} />
    </div>
  );
}

function PlatformChoice({
  platform,
  info,
  busy,
  onDownload,
}: {
  platform: MobileAppPlatform;
  info: MobileAppPlatformDownload | null;
  busy: boolean;
  onDownload: (platform: MobileAppPlatform, info: MobileAppPlatformDownload) => void;
}) {
  const label = platform === 'ios' ? 'iOS' : 'Android';
  const ready = Boolean(info);

  if (!ready || !info) {
    return (
      <div className="flex min-h-[148px] flex-col justify-between rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-muted-foreground">
          <PlatformMark platform={platform} />
        </span>
        <span>
          <span className="block text-base font-semibold text-foreground">{label}</span>
          <span className="mt-1 block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Coming soon</span>
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onDownload(platform, info)}
      className={cn(
        'flex min-h-[148px] flex-col justify-between rounded-2xl border border-border/80 bg-card px-4 py-4 text-left shadow-[0_10px_28px_rgba(24,40,28,0.06)] ring-1 ring-black/[0.03] transition hover:-translate-y-0.5 hover:border-primary/40 disabled:opacity-70 dark:ring-white/[0.05]',
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlatformMark platform={platform} />}
      </span>
      <span>
        <span className="block text-base font-semibold text-foreground">{label}</span>
        <span className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
          <Download className="h-3.5 w-3.5" aria-hidden />
          {info.versionLabel ? `v${info.versionLabel}` : 'Download'}
          <span className="text-muted-foreground">· {formatFileSize(info.fileSize)}</span>
        </span>
      </span>
    </button>
  );
}
