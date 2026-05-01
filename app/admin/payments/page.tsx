'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Ban,
  CircleDollarSign,
  Clock3,
  Landmark,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Store,
  TrendingUp,
  User,
  Wallet,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type PaymentBuyer = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type PaymentLineItem = {
  id: string;
  lineType: 'product' | 'service';
  title: string;
  quantity: number;
  unitAmountUgx: number;
  lineTotalUgx: number;
  productId: string | null;
  productName: string | null;
  sku: string | null;
  vendorId: string | null;
  vendorName: string;
  vendorEmail: string | null;
  vendorPhone: string | null;
  serviceRequestId: string | null;
  serviceRequest: {
    id: string;
    category: string;
    service: string;
    location: string;
  } | null;
};

type PaymentServiceDetail = {
  servicePaymentId: string;
  requestId: string;
  category: string;
  serviceName: string;
  location: string;
  providerId: string | null;
  providerName: string;
  providerEmail: string | null;
  providerPhone: string | null;
  paymentStatus: string;
};

type PaymentCheckoutSummary = {
  id: string;
  sessionType: string;
  sessionStatus: string;
  sessionTotalUgx: number;
};

type PaymentRecord = {
  id: string;
  flow: 'product_checkout' | 'service_payment';
  checkoutType: 'product' | 'service';
  customerName: string;
  vendorName: string;
  buyer: PaymentBuyer | null;
  checkout: PaymentCheckoutSummary | null;
  lineItems: PaymentLineItem[];
  service: PaymentServiceDetail | null;
  amount: number;
  currency: 'UGX';
  provider: 'paytota';
  providerReference: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  createdAt: string;
  searchBlob: string;
};

type DisbursementRecord = {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string | null;
  sourceType: 'product_checkout' | 'service_payment' | 'manual_adjustment';
  sourceReference: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  status:
    | 'pending_approval'
    | 'approved'
    | 'processing'
    | 'paid'
    | 'failed'
    | 'rejected'
    | 'reversed';
  payoutReference?: string;
  scheduledFor?: string;
  paidOutAt?: string;
  failedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
  payoutAccountConfigured: boolean;
  payoutAccount: {
    type: string;
    network: string | null;
    accountName: string | null;
    accountNumberMasked: string;
  } | null;
  paytotaPayout: {
    status: string;
    providerStatus: string | null;
    providerReference: string | null;
    lastEventAt: string;
  } | null;
};

type DisbursementStatusFilter =
  | 'all'
  | 'needs_review'
  | 'pending_approval'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'rejected'
  | 'reversed';

function formatUgx(amount: number) {
  return `UGX ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatListDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '';
  }
}

function paymentStatusClass(status: PaymentRecord['status']) {
  switch (status) {
    case 'succeeded':
      return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300';
    case 'pending':
    case 'processing':
      return 'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200';
    case 'failed':
      return 'border-destructive/40 bg-destructive/10 text-destructive';
    case 'cancelled':
      return 'border-muted-foreground/30 bg-muted/50 text-muted-foreground';
    default:
      return '';
  }
}

function disbursementStatusClass(status: DisbursementRecord['status']) {
  switch (status) {
    case 'paid':
      return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300';
    case 'pending_approval':
      return 'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200';
    case 'approved':
    case 'processing':
      return 'border-sky-500/35 bg-sky-500/10 text-sky-900 dark:text-sky-200';
    case 'failed':
    case 'rejected':
      return 'border-destructive/40 bg-destructive/10 text-destructive';
    case 'reversed':
      return 'border-muted-foreground/30 bg-muted/50 text-muted-foreground';
    default:
      return '';
  }
}

function flowLabel(flow: PaymentRecord['flow']) {
  return flow === 'service_payment' ? 'Service payment' : 'Product checkout';
}

function sourceLabel(type: DisbursementRecord['sourceType']) {
  if (type === 'product_checkout') return 'Product checkout';
  if (type === 'service_payment') return 'Service payment';
  return 'Manual adjustment';
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline sm:gap-x-4">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90 sm:text-[11px]">
        {label}
      </dt>
      <dd className="min-w-0 text-sm leading-snug text-foreground">{children}</dd>
    </div>
  );
}

function PanelSection({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-linear-to-b from-background to-muted/20 p-3.5 shadow-sm sm:p-4',
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function statusAccentClass(status: PaymentRecord['status']) {
  switch (status) {
    case 'succeeded':
      return 'from-emerald-500/80';
    case 'pending':
    case 'processing':
      return 'from-amber-500/80';
    case 'failed':
      return 'from-destructive/80';
    default:
      return 'from-muted-foreground/50';
  }
}

function PaymentCollectionCard({ p }: { p: PaymentRecord }) {
  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-200',
        'hover:border-border hover:shadow-md',
      )}
    >
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1 bg-linear-to-b to-transparent opacity-90',
          statusAccentClass(p.status),
        )}
        aria-hidden
      />
      <div className="flex flex-col gap-4 p-4 pl-5 sm:gap-5 sm:p-5 sm:pl-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="font-mono text-[11px] font-medium text-muted-foreground">
              <span className="text-muted-foreground/80">Transaction</span>{' '}
              <span className="text-foreground/90">{p.id}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
                {p.flow === 'service_payment' ? (
                  <Wrench className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <Package className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
                {flowLabel(p.flow)}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5 opacity-80" />
                {formatListDate(p.createdAt)}
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn('shrink-0 px-2.5 py-0.5 text-xs capitalize shadow-sm', paymentStatusClass(p.status))}
          >
            {p.status.replace('_', ' ')}
          </Badge>
        </header>

        <PanelSection
          title="Buyer (pays this amount)"
          icon={<User className="h-3.5 w-3.5" strokeWidth={2} />}
        >
          {p.buyer ? (
            <dl className="space-y-2">
              <MetaRow label="Name">
                <span className="font-medium">{p.buyer.name}</span>
              </MetaRow>
              {p.buyer.email ? (
                <MetaRow label="Email">
                  <a
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href={`mailto:${p.buyer.email}`}
                  >
                    {p.buyer.email}
                  </a>
                </MetaRow>
              ) : null}
              {p.buyer.phone ? (
                <MetaRow label="Phone">
                  <span className="tabular-nums">{p.buyer.phone}</span>
                </MetaRow>
              ) : null}
              <MetaRow label="Customer ID">
                <span className="break-all font-mono text-xs text-muted-foreground">{p.buyer.id}</span>
              </MetaRow>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No buyer record linked to this transaction.</p>
          )}
        </PanelSection>

        {p.flow === 'product_checkout' && !p.checkout && p.lineItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-3.5 text-sm text-muted-foreground">
            No product checkout is linked to this Paytota transaction.
          </div>
        ) : null}

        {p.flow === 'product_checkout' && p.checkout ? (
          <PanelSection title="Checkout & line items" icon={<Package className="h-3.5 w-3.5" strokeWidth={2} />}>
            <dl className="mb-4 space-y-2">
              <MetaRow label="Checkout ID">
                <span className="break-all font-mono text-xs">{p.checkout.id}</span>
              </MetaRow>
              <MetaRow label="Session type">{p.checkout.sessionType}</MetaRow>
              <MetaRow label="Session status">{p.checkout.sessionStatus}</MetaRow>
              {p.checkout.sessionTotalUgx > 0 ? (
                <MetaRow label="Session total">{formatUgx(p.checkout.sessionTotalUgx)}</MetaRow>
              ) : null}
            </dl>
            {p.checkout.sessionType === 'unavailable' ? (
              <p className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
                Checkout session metadata is missing (session may have been removed). The checkout ID above
                is kept for audit.
              </p>
            ) : null}
            {p.lineItems.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Line items & sellers
                </p>
                <ul className="space-y-3">
                  {p.lineItems.map((li) => (
                    <li
                      key={li.id}
                      className="rounded-xl border border-border/50 bg-background/90 p-3 shadow-sm sm:p-3.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold leading-snug text-foreground">{li.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {li.lineType === 'product' ? 'Product' : 'Service'} line · Qty {li.quantity} ·{' '}
                            {formatUgx(li.unitAmountUgx)} unit
                          </p>
                          {li.productName ? (
                            <p className="mt-2 text-xs">
                              <span className="font-medium text-muted-foreground">Catalog: </span>
                              {li.productName}
                              {li.sku ? (
                                <span className="text-muted-foreground"> · SKU {li.sku}</span>
                              ) : null}
                            </p>
                          ) : null}
                          {li.serviceRequest ? (
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                              <span className="font-medium text-foreground/80">Request: </span>
                              {li.serviceRequest.service}{' '}
                              <span className="text-muted-foreground">({li.serviceRequest.category})</span>
                              <br />
                              {li.serviceRequest.location}
                            </p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                          {formatUgx(li.lineTotalUgx)}
                        </p>
                      </div>
                      <div className="mt-3 flex items-start gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                          <Store className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 text-xs leading-relaxed">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Vendor / seller
                          </p>
                          <p className="mt-0.5 font-semibold text-foreground">{li.vendorName}</p>
                          {li.vendorEmail ? (
                            <p className="text-muted-foreground">{li.vendorEmail}</p>
                          ) : null}
                          {li.vendorPhone ? (
                            <p className="tabular-nums text-muted-foreground">{li.vendorPhone}</p>
                          ) : null}
                          {li.vendorId ? (
                            <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                              {li.vendorId}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No line items found for this checkout.</p>
            )}
          </PanelSection>
        ) : null}

        {p.flow === 'service_payment' && !p.service ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-3.5 text-sm text-muted-foreground">
            Service payment details could not be loaded (record missing or not yet synced).
          </div>
        ) : null}

        {p.flow === 'service_payment' && p.service ? (
          <PanelSection title="Service & provider" icon={<Wrench className="h-3.5 w-3.5" strokeWidth={2} />}>
            <dl className="mb-4 space-y-2">
              <MetaRow label="Service payment ID">
                <span className="break-all font-mono text-xs">{p.service.servicePaymentId}</span>
              </MetaRow>
              <MetaRow label="Request ID">
                <span className="break-all font-mono text-xs">{p.service.requestId}</span>
              </MetaRow>
              <MetaRow label="Service">{p.service.serviceName || '—'}</MetaRow>
              <MetaRow label="Category">{p.service.category || '—'}</MetaRow>
              <MetaRow label="Location">{p.service.location || '—'}</MetaRow>
              <MetaRow label="Payment status">{p.service.paymentStatus}</MetaRow>
            </dl>
            <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/90 p-3 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Store className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 text-xs leading-relaxed">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Service provider
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{p.service.providerName}</p>
                {p.service.providerEmail ? (
                  <p className="text-muted-foreground">{p.service.providerEmail}</p>
                ) : null}
                {p.service.providerPhone ? (
                  <p className="tabular-nums text-muted-foreground">{p.service.providerPhone}</p>
                ) : null}
                {p.service.providerId ? (
                  <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                    {p.service.providerId}
                  </p>
                ) : null}
              </div>
            </div>
          </PanelSection>
        ) : null}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
          <span className="inline-flex max-w-full items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <CircleDollarSign className="h-4 w-4 shrink-0 opacity-80" />
            <span className="truncate">
              Paytota <span className="text-muted-foreground/70">ref</span>{' '}
              <span className="text-foreground/80">{p.providerReference || '—'}</span>
            </span>
          </span>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Collected</p>
            <p className="text-lg font-bold tabular-nums tracking-tight text-foreground sm:text-xl">
              {formatUgx(p.amount)}
            </p>
          </div>
        </footer>
      </div>
    </article>
  );
}

function PaymentsLoadingSkeleton() {
  return (
    <div className="min-h-full bg-muted/20">
      <div className="mx-auto max-w-[1600px] animate-pulse space-y-8 px-4 py-8 md:px-8 md:py-10">
        <div className="h-36 rounded-2xl border border-border/50 bg-card/80 shadow-sm" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-border/50 bg-card/60 shadow-sm" />
          ))}
        </div>
        <div className="h-16 rounded-xl border border-border/50 bg-card/60" />
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-[480px] rounded-xl border border-border/50 bg-card/50 shadow-sm" />
          <div className="h-[480px] rounded-xl border border-border/50 bg-card/50 shadow-sm" />
        </div>
      </div>
    </div>
  );
}

type StatTileProps = {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  className?: string;
};

function vendorInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function DisbursementCard({
  d,
  savingDisbursementId,
  onApprove,
  onExecute,
  onMarkPaid,
  onMarkFailed,
  onReject,
  canApprove,
  canProcess,
  canMarkPaid,
  canMarkFailed,
  canReject,
}: {
  d: DisbursementRecord;
  savingDisbursementId: string | null;
  onApprove: () => void;
  onExecute: () => void;
  onMarkPaid: () => void;
  onMarkFailed: () => void;
  onReject: () => void;
  canApprove: boolean;
  canProcess: boolean;
  canMarkPaid: boolean;
  canMarkFailed: boolean;
  canReject: boolean;
}) {
  const busy = savingDisbursementId === d.id;
  const needsPayoutAccount =
    !d.payoutAccountConfigured && ['pending_approval', 'approved'].includes(d.status);

  return (
    <article className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:border-border hover:shadow-md">
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1 bg-linear-to-b to-transparent',
          d.status === 'paid' && 'from-emerald-500/80',
          ['pending_approval', 'approved', 'processing'].includes(d.status) && 'from-sky-500/75',
          ['failed', 'rejected'].includes(d.status) && 'from-destructive/75',
          d.status === 'reversed' && 'from-muted-foreground/40',
        )}
        aria-hidden
      />
      <div className="space-y-4 p-4 pl-5 sm:p-5 sm:pl-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary shadow-sm">
              {vendorInitials(d.vendorName)}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="font-mono text-[11px] text-muted-foreground">{d.id}</p>
              <p className="text-base font-semibold leading-tight text-foreground">{d.vendorName}</p>
              {d.vendorEmail ? (
                <p className="text-xs text-muted-foreground">{d.vendorEmail}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{sourceLabel(d.sourceType)}</span>
                <span className="mx-1.5 text-border">·</span>
                <span className="font-mono">{d.sourceReference || '—'}</span>
              </p>
              {d.vendorId ? (
                <Link
                  href={`/admin/vendors/${encodeURIComponent(d.vendorId)}`}
                  className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open vendor workspace
                </Link>
              ) : null}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 px-2.5 py-0.5 text-xs capitalize shadow-sm',
              disbursementStatusClass(d.status),
            )}
          >
            {d.status.replace('_', ' ')}
          </Badge>
        </header>

        {needsPayoutAccount ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
            This vendor has no default payout account on file. They must add bank or mobile money details
            before you can execute a Paytota payout.
          </div>
        ) : null}

        <PanelSection title="Payout destination" icon={<Landmark className="h-3.5 w-3.5" strokeWidth={2} />}>
          {d.payoutAccount ? (
            <dl className="space-y-2">
              <MetaRow label="Type">
                <span className="capitalize">{d.payoutAccount.type.replace(/_/g, ' ')}</span>
              </MetaRow>
              {d.payoutAccount.network ? (
                <MetaRow label="Network / bank">{d.payoutAccount.network}</MetaRow>
              ) : null}
              {d.payoutAccount.accountName ? (
                <MetaRow label="Account name">{d.payoutAccount.accountName}</MetaRow>
              ) : null}
              <MetaRow label="Number">
                <span className="font-mono tabular-nums">{d.payoutAccount.accountNumberMasked}</span>
              </MetaRow>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No payout account linked to this disbursement.</p>
          )}
        </PanelSection>

        <div className="grid gap-3 rounded-xl border border-border/50 bg-muted/25 p-3 sm:grid-cols-3 sm:p-4">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Gross</p>
            <p className="text-sm font-semibold tabular-nums">{formatUgx(d.grossAmount)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Platform fee
            </p>
            <p className="text-sm font-semibold tabular-nums">{formatUgx(d.feeAmount)}</p>
          </div>
          <div className="space-y-0.5 sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Net payout
            </p>
            <p className="text-base font-bold tabular-nums text-foreground">{formatUgx(d.netAmount)}</p>
          </div>
        </div>

        {d.paytotaPayout ? (
          <PanelSection
            title="Paytota payout (outbound)"
            icon={<Wallet className="h-3.5 w-3.5" strokeWidth={2} />}
          >
            <dl className="space-y-2">
              <MetaRow label="Ledger status">{d.paytotaPayout.status}</MetaRow>
              {d.paytotaPayout.providerStatus ? (
                <MetaRow label="Provider status">{d.paytotaPayout.providerStatus}</MetaRow>
              ) : null}
              {d.paytotaPayout.providerReference ? (
                <MetaRow label="Provider ref">
                  <span className="break-all font-mono text-xs">{d.paytotaPayout.providerReference}</span>
                </MetaRow>
              ) : null}
              <MetaRow label="Last update">{formatListDate(d.paytotaPayout.lastEventAt)}</MetaRow>
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Final status is applied when Paytota calls your webhook; use Mark paid / failed only for manual
              reconciliation if needed.
            </p>
          </PanelSection>
        ) : null}

        {d.rejectedReason ? (
          <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <span className="font-semibold">Rejected: </span>
            {d.rejectedReason}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-lg px-3 text-xs font-medium shadow-sm"
            disabled={!canApprove || busy}
            onClick={onApprove}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-2 rounded-lg px-3 text-xs font-medium shadow-sm"
            disabled={!canProcess || busy || needsPayoutAccount}
            onClick={onExecute}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : null}
            Execute via Paytota
          </Button>
          <Button
            size="sm"
            className="h-9 rounded-lg px-3 text-xs font-medium shadow-sm"
            disabled={!canMarkPaid || busy}
            onClick={onMarkPaid}
          >
            Mark paid
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-9 rounded-lg px-3 text-xs font-medium shadow-sm"
            disabled={!canMarkFailed || busy}
            onClick={onMarkFailed}
          >
            Mark failed
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 rounded-lg border-destructive/40 px-3 text-xs font-medium text-destructive shadow-sm hover:bg-destructive/10"
            disabled={!canReject || busy}
            onClick={onReject}
          >
            <Ban className="h-3.5 w-3.5 shrink-0" />
            Reject
          </Button>
        </div>

        {(d.payoutReference || d.scheduledFor || d.paidOutAt || d.failedAt) && (
          <div className="space-y-1.5 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {d.payoutReference ? (
              <p className="inline-flex flex-wrap items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="font-medium text-foreground/80">Payout ref</span>
                <span className="font-mono text-foreground">{d.payoutReference}</span>
              </p>
            ) : null}
            {d.scheduledFor ? (
              <p>
                <span className="font-medium text-foreground/80">Scheduled </span>
                {formatListDate(d.scheduledFor)}
              </p>
            ) : null}
            {d.paidOutAt ? (
              <p>
                <span className="font-medium text-foreground/80">Paid out </span>
                {formatListDate(d.paidOutAt)}
              </p>
            ) : null}
            {d.failedAt ? (
              <p>
                <span className="font-medium text-foreground/80">Failed at </span>
                {formatListDate(d.failedAt)}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

function StatTile({ label, value, hint, icon, className }: StatTileProps) {
  return (
    <Card
      className={cn(
        'group overflow-hidden border-border/60 bg-linear-to-b from-card to-muted/15 shadow-sm ring-1 ring-black/3 transition-all duration-200 hover:border-border hover:shadow-md dark:ring-white/4',
        className,
      )}
    >
      <CardContent className="flex gap-3.5 p-4 sm:gap-4 sm:p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-sm transition-transform duration-200 group-hover:scale-105 sm:h-11 sm:w-11 [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5">
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-semibold uppercase leading-snug tracking-wider text-muted-foreground sm:text-[11px]">
            {label}
          </p>
          <p className="wrap-break-word text-sm font-bold tabular-nums leading-tight tracking-tight text-foreground sm:text-base md:text-lg">
            {value}
          </p>
          {hint ? (
            <p className="text-[10px] leading-snug text-muted-foreground sm:text-xs">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

const DISBURSEMENT_STATUSES: DisbursementRecord['status'][] = [
  'pending_approval',
  'approved',
  'processing',
  'paid',
  'failed',
  'rejected',
  'reversed',
];

function normalizeDisbursementRow(x: Record<string, unknown>): DisbursementRecord {
  const id = String(x.id ?? '');
  const st = x.source_type ?? x.sourceType;
  const sourceType: DisbursementRecord['sourceType'] =
    st === 'service_payment'
      ? 'service_payment'
      : st === 'manual_adjustment'
        ? 'manual_adjustment'
        : 'product_checkout';
  const rawStatus = String(x.status ?? 'pending_approval');
  const status: DisbursementRecord['status'] = DISBURSEMENT_STATUSES.includes(
    rawStatus as DisbursementRecord['status'],
  )
    ? (rawStatus as DisbursementRecord['status'])
    : 'pending_approval';
  const payoutAccountRaw = x.payoutAccount as DisbursementRecord['payoutAccount'] | undefined;
  const paytotaRaw = x.paytotaPayout as DisbursementRecord['paytotaPayout'] | undefined;

  return {
    id,
    vendorId: String(x.vendorId ?? x.vendor_id ?? ''),
    vendorName: String(x.vendorName ?? x.vendor_name ?? 'Vendor'),
    vendorEmail: (x.vendorEmail ?? x.vendor_email) != null ? String(x.vendorEmail ?? x.vendor_email) : null,
    sourceType,
    sourceReference: String(x.sourceReference ?? x.source_reference ?? ''),
    grossAmount: Number(x.grossAmount ?? x.gross_amount ?? 0),
    feeAmount: Number(x.feeAmount ?? x.fee_amount ?? 0),
    netAmount: Number(x.netAmount ?? x.net_amount ?? 0),
    status,
    payoutReference:
      x.payoutReference != null || x.payout_reference != null
        ? String(x.payoutReference ?? x.payout_reference)
        : undefined,
    scheduledFor:
      x.scheduledFor != null || x.scheduled_for != null
        ? String(x.scheduledFor ?? x.scheduled_for)
        : undefined,
    paidOutAt:
      x.paidOutAt != null || x.paid_out_at != null ? String(x.paidOutAt ?? x.paid_out_at) : undefined,
    failedAt: x.failedAt != null || x.failed_at != null ? String(x.failedAt ?? x.failed_at) : undefined,
    rejectedReason:
      x.rejectedReason != null || x.rejected_reason != null
        ? String(x.rejectedReason ?? x.rejected_reason)
        : undefined,
    createdAt: String(x.createdAt ?? x.created_at ?? ''),
    updatedAt: String(x.updatedAt ?? x.updated_at ?? x.createdAt ?? x.created_at ?? ''),
    payoutAccountConfigured: Boolean(
      x.payoutAccountConfigured ?? (x.payout_account_id != null && String(x.payout_account_id).length > 0),
    ),
    payoutAccount: payoutAccountRaw ?? null,
    paytotaPayout: paytotaRaw ?? null,
  };
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [disbursements, setDisbursements] = useState<DisbursementRecord[]>([]);
  const [query, setQuery] = useState('');
  const [disbStatusFilter, setDisbStatusFilter] = useState<DisbursementStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingDisbursementId, setSavingDisbursementId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DisbursementRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = useCallback(async (opts?: { quiet?: boolean; skipSuccessToast?: boolean }) => {
    const quiet = opts?.quiet ?? false;
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/payments');
      if (!res.ok) throw new Error('Failed to fetch payment operations data');
      const data = await res.json();
      const rawPayments = Array.isArray(data.payments) ? data.payments : [];
      setPayments(
        rawPayments.map((x: Record<string, unknown>) => {
          const id = String(x.id ?? '');
          const customerName = String(x.customerName ?? 'Unknown buyer');
          const vendorName = String(x.vendorName ?? '—');
          const providerReference = String(x.providerReference ?? '');
          const searchBlob =
            typeof x.searchBlob === 'string'
              ? x.searchBlob
              : [id, customerName, vendorName, providerReference].filter(Boolean).join(' ').toLowerCase();
          const checkoutType = x.checkoutType === 'service' ? 'service' : 'product';
          return {
            id,
            flow:
              x.flow === 'service_payment' || checkoutType === 'service'
                ? 'service_payment'
                : 'product_checkout',
            checkoutType,
            customerName,
            vendorName,
            buyer: (x.buyer as PaymentBuyer | null | undefined) ?? null,
            checkout: (x.checkout as PaymentCheckoutSummary | null | undefined) ?? null,
            lineItems: Array.isArray(x.lineItems) ? (x.lineItems as PaymentLineItem[]) : [],
            service: (x.service as PaymentServiceDetail | null | undefined) ?? null,
            amount: Number(x.amount ?? 0),
            currency: 'UGX' as const,
            provider: 'paytota' as const,
            providerReference,
            status: x.status as PaymentRecord['status'],
            createdAt: String(x.createdAt ?? ''),
            searchBlob,
          };
        }),
      );
      setDisbursements(
        Array.isArray(data.disbursements)
          ? (data.disbursements as Record<string, unknown>[]).map(normalizeDisbursementRow)
          : [],
      );
      if (quiet && !opts?.skipSuccessToast) toast.success('Payments data refreshed');
    } catch {
      setError('Unable to load payments and disbursements right now.');
      if (quiet) toast.error('Could not refresh payments data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateDisbursement = async (
    disbursementId: string,
    status: DisbursementRecord['status'],
    opts?: { rejectedReason?: string },
  ): Promise<boolean> => {
    setSavingDisbursementId(disbursementId);
    try {
      const payload: Record<string, unknown> = { disbursementId, status };
      if (opts?.rejectedReason?.trim()) payload.rejectedReason = opts.rejectedReason.trim();
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof json?.error === 'string' ? json.error : 'Update failed. Please try again.';
        toast.error(msg);
        return false;
      }
      toast.success('Disbursement updated');
      await loadData({ quiet: true, skipSuccessToast: true });
      return true;
    } catch {
      toast.error('Network error while updating disbursement');
      return false;
    } finally {
      setSavingDisbursementId(null);
    }
  };

  const canApprove = (status: DisbursementRecord['status']) => status === 'pending_approval';
  const canProcess = (status: DisbursementRecord['status']) =>
    status === 'approved' || status === 'failed';
  const canMarkPaid = (status: DisbursementRecord['status']) => status === 'processing';
  const canMarkFailed = (status: DisbursementRecord['status']) => status === 'processing';
  const canReject = (status: DisbursementRecord['status']) =>
    status === 'pending_approval' || status === 'approved';

  const filteredPayments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => p.searchBlob.includes(q));
  }, [payments, query]);

  const filteredDisbursements = useMemo(() => {
    let list = disbursements;
    if (disbStatusFilter === 'needs_review') {
      list = list.filter((d) => d.status === 'pending_approval' || d.status === 'approved');
    } else if (disbStatusFilter !== 'all') {
      list = list.filter((d) => d.status === disbStatusFilter);
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) => {
      const blob = [
        d.id,
        d.vendorId,
        d.vendorName,
        d.vendorEmail ?? '',
        d.sourceReference,
        d.payoutReference ?? '',
        d.rejectedReason ?? '',
        d.paytotaPayout?.providerReference ?? '',
        d.payoutAccount?.accountName ?? '',
        d.payoutAccount?.network ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [disbursements, query, disbStatusFilter]);

  const stats = useMemo(() => {
    const totalCollected = payments
      .filter((p) => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);
    const attemptedVolume = payments.reduce((sum, p) => sum + p.amount, 0);
    const succeededCount = payments.filter((p) => p.status === 'succeeded').length;
    const pendingDisbursements = disbursements
      .filter((d) => ['pending_approval', 'approved', 'processing'].includes(d.status))
      .reduce((sum, d) => sum + d.netAmount, 0);
    const pendingDisbCount = disbursements.filter((d) =>
      ['pending_approval', 'approved', 'processing'].includes(d.status),
    ).length;
    const paidOut = disbursements
      .filter((d) => d.status === 'paid')
      .reduce((sum, d) => sum + d.netAmount, 0);
    const paidCount = disbursements.filter((d) => d.status === 'paid').length;
    const successRate =
      payments.length > 0 ? Math.round((succeededCount / payments.length) * 100) : 0;
    return {
      totalCollected,
      attemptedVolume,
      succeededCount,
      paymentCount: payments.length,
      pendingDisbursements,
      pendingDisbCount,
      paidOut,
      paidCount,
      disbCount: disbursements.length,
      successRate,
    };
  }, [payments, disbursements]);

  if (loading) return <PaymentsLoadingSkeleton />;

  const listPanelClass =
    'max-h-[min(70vh,640px)] overflow-y-auto border-t border-border/50 bg-linear-to-b from-muted/20 via-muted/10 to-transparent md:max-h-[min(78vh,760px)]';

  const collectionsList = (
    <div className={listPanelClass}>
      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        {filteredPayments.map((p) => (
          <PaymentCollectionCard key={p.id} p={p} />
        ))}
        {filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-sm ring-4 ring-muted/40">
              <ArrowDownLeft className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No collections match</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Try another search, or refresh if you expect new Paytota activity.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const disbursementsToolbar = (
    <div className="flex flex-col gap-2 border-b border-border/50 bg-muted/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <Label htmlFor="disb-filter" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Queue filter
      </Label>
      <Select
        value={disbStatusFilter}
        onValueChange={(v) => setDisbStatusFilter(v as DisbursementStatusFilter)}
      >
        <SelectTrigger id="disb-filter" className="h-10 w-full rounded-lg sm:w-[220px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="needs_review">Needs review (pending / approved)</SelectItem>
          <SelectItem value="pending_approval">Pending approval</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="processing">Processing</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="reversed">Reversed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const disbursementsList = (
    <div className={listPanelClass}>
      {disbursementsToolbar}
      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        {filteredDisbursements.map((d) => (
          <DisbursementCard
            key={d.id}
            d={d}
            savingDisbursementId={savingDisbursementId}
            canApprove={canApprove(d.status)}
            canProcess={canProcess(d.status)}
            canMarkPaid={canMarkPaid(d.status)}
            canMarkFailed={canMarkFailed(d.status)}
            canReject={canReject(d.status)}
            onApprove={() => void updateDisbursement(d.id, 'approved')}
            onExecute={() => void updateDisbursement(d.id, 'processing')}
            onMarkPaid={() => void updateDisbursement(d.id, 'paid')}
            onMarkFailed={() => void updateDisbursement(d.id, 'failed')}
            onReject={() => {
              setRejectReason('');
              setRejectTarget(d);
            }}
          />
        ))}
        {filteredDisbursements.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-sm ring-4 ring-muted/40">
              <ArrowUpRight className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No disbursements match</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Adjust your search or refresh after vendors receive new settlements.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-muted/25">
      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 md:px-8 md:py-10">
        <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/3 dark:ring-white/4">
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/6 via-transparent to-transparent" />
          <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-primary/7 blur-3xl" />
          <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-start md:justify-between md:p-8">
            <div className="flex gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary/15 to-primary/5 text-primary shadow-sm ring-1 ring-primary/10">
                <Wallet className="h-8 w-8" strokeWidth={1.75} />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Operations</p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  Payments & disbursements
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                  Reconcile Paytota collections, review buyer and seller context, and run the vendor payout
                  queue from one workspace.
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total collected"
          value={formatUgx(stats.totalCollected)}
          hint={
            stats.succeededCount
              ? `${stats.succeededCount} successful payment${stats.succeededCount === 1 ? '' : 's'}`
              : 'No successful payments in this sample'
          }
          icon={<Banknote />}
        />
        <StatTile
          label="Attempted volume"
          value={formatUgx(stats.attemptedVolume)}
          hint={
            stats.paymentCount
              ? `All statuses · ${stats.successRate}% succeeded`
              : undefined
          }
          icon={<TrendingUp />}
        />
        <StatTile
          label="Pending payouts"
          value={formatUgx(stats.pendingDisbursements)}
          hint={
            stats.pendingDisbCount
              ? `${stats.pendingDisbCount} item${stats.pendingDisbCount === 1 ? '' : 's'} in flight`
              : 'Queue is clear'
          }
          icon={<Clock3 />}
        />
        <StatTile
          label="Paid out"
          value={formatUgx(stats.paidOut)}
          hint={
            stats.paidCount
              ? `${stats.paidCount} completed payout${stats.paidCount === 1 ? '' : 's'}`
              : undefined
          }
          icon={<Landmark />}
        />
        </div>

        <Card className="border-border/60 shadow-sm ring-1 ring-black/3 dark:ring-white/4">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-11 rounded-xl border-border/70 bg-background/80 pl-10 pr-4 shadow-sm transition-shadow focus-visible:ring-primary/20"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search buyer, vendor, product, service, checkout, or Paytota ref"
                  aria-label="Filter payments and disbursements"
                />
              </div>
              <Button
                variant="outline"
                className="h-11 shrink-0 gap-2 rounded-xl border-border/70 px-5 font-medium shadow-sm"
                disabled={refreshing}
                onClick={() => void loadData({ quiet: true })}
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh data
              </Button>
            </div>
            {error ? (
              <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="hidden xl:grid xl:grid-cols-2 xl:gap-6">
          <Card className="overflow-hidden border-border/60 shadow-md ring-1 ring-black/3 dark:ring-white/4">
            <CardHeader className="space-y-1 border-b border-border/50 bg-linear-to-r from-muted/50 to-muted/20 pb-5 pt-6">
              <CardTitle className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ArrowDownLeft className="h-5 w-5" />
                </span>
                Paytota collections
              </CardTitle>
              <CardDescription className="max-w-lg text-sm leading-relaxed">
                Each entry shows the buyer, what was purchased, and the vendor or provider who earns the
                settlement.
              </CardDescription>
            </CardHeader>
            {collectionsList}
          </Card>
          <Card className="overflow-hidden border-border/60 shadow-md ring-1 ring-black/3 dark:ring-white/4">
            <CardHeader className="space-y-1 border-b border-border/50 bg-linear-to-r from-muted/50 to-muted/20 pb-5 pt-6">
              <CardTitle className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ArrowUpRight className="h-5 w-5" />
                </span>
                Disbursement queue
              </CardTitle>
              <CardDescription className="max-w-lg text-sm leading-relaxed">
                Approve payouts, execute via Paytota, and mark items paid or failed.
              </CardDescription>
            </CardHeader>
            {disbursementsList}
          </Card>
        </div>

        <div className="xl:hidden">
          <Tabs defaultValue="collections" className="w-full">
            <TabsList className="grid h-12 w-full grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/40 p-1 shadow-sm">
              <TabsTrigger
                value="collections"
                className="rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Collections
                <Badge variant="secondary" className="ml-2 hidden px-1.5 sm:inline-flex">
                  {filteredPayments.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="disbursements"
                className="rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Disbursements
                <Badge variant="secondary" className="ml-2 hidden px-1.5 sm:inline-flex">
                  {filteredDisbursements.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="collections" className="mt-5 outline-none">
              <Card className="overflow-hidden border-border/60 shadow-md ring-1 ring-black/3 dark:ring-white/4">
                <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
                  <CardTitle className="text-base font-semibold">Paytota collections</CardTitle>
                  <CardDescription className="text-sm">Inbound payments and full buyer/seller context.</CardDescription>
                </CardHeader>
                {collectionsList}
              </Card>
            </TabsContent>
            <TabsContent value="disbursements" className="mt-5 outline-none">
              <Card className="overflow-hidden border-border/60 shadow-md ring-1 ring-black/3 dark:ring-white/4">
                <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
                  <CardTitle className="text-base font-semibold">Disbursement queue</CardTitle>
                  <CardDescription className="text-sm">Payout workflow for vendors.</CardDescription>
                </CardHeader>
                {disbursementsList}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog
        open={rejectTarget != null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject disbursement</DialogTitle>
            <DialogDescription>
              {rejectTarget ? (
                <>
                  This will mark <span className="font-medium text-foreground">{rejectTarget.vendorName}</span>’s
                  payout as rejected. Add an internal note for audit (optional).
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Invalid tax documentation, duplicate payout request…"
              className="min-h-[88px] resize-none"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectTarget || savingDisbursementId === rejectTarget.id}
              onClick={() => {
                if (!rejectTarget) return;
                void (async () => {
                  const ok = await updateDisbursement(rejectTarget.id, 'rejected', {
                    rejectedReason: rejectReason,
                  });
                  if (ok) {
                    setRejectTarget(null);
                    setRejectReason('');
                  }
                })();
              }}
            >
              {rejectTarget && savingDisbursementId === rejectTarget.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
