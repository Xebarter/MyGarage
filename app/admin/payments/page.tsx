'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Wallet, Landmark, CircleDollarSign, RefreshCw } from 'lucide-react';

type PaymentRecord = {
  id: string;
  checkoutType: 'product' | 'service';
  customerName: string;
  vendorName: string;
  amount: number;
  currency: 'UGX';
  provider: 'paytota';
  providerReference: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  createdAt: string;
};

type DisbursementRecord = {
  id: string;
  vendorName: string;
  sourceType: 'product_checkout' | 'service_payment';
  sourceReference: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  status: 'pending_approval' | 'approved' | 'processing' | 'paid' | 'failed' | 'rejected' | 'reversed';
  payoutReference?: string;
  scheduledFor?: string;
  updatedAt: string;
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [disbursements, setDisbursements] = useState<DisbursementRecord[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingDisbursementId, setSavingDisbursementId] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/payments');
      if (!res.ok) throw new Error('Failed to fetch payment operations data');
      const data = await res.json();
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setDisbursements(Array.isArray(data.disbursements) ? data.disbursements : []);
    } catch (e) {
      setError('Unable to load payments/disbursements right now.');
    } finally {
      setLoading(false);
    }
  };

  const updateDisbursement = async (
    disbursementId: string,
    status: DisbursementRecord['status'],
  ) => {
    setSavingDisbursementId(disbursementId);
    const payoutReference =
      status === 'paid' ? `PT-DISB-${Date.now().toString().slice(-6)}` : undefined;
    try {
      await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disbursementId, status, payoutReference }),
      });
      await loadData();
    } finally {
      setSavingDisbursementId(null);
    }
  };

  const canApprove = (status: DisbursementRecord['status']) => status === 'pending_approval';
  const canProcess = (status: DisbursementRecord['status']) => status === 'approved' || status === 'failed';
  const canMarkPaid = (status: DisbursementRecord['status']) => status === 'processing';
  const canMarkFailed = (status: DisbursementRecord['status']) => status === 'processing';

  const filteredPayments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        p.vendorName.toLowerCase().includes(q) ||
        p.providerReference.toLowerCase().includes(q),
    );
  }, [payments, query]);

  const filteredDisbursements = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return disbursements;
    return disbursements.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.vendorName.toLowerCase().includes(q) ||
        d.sourceReference.toLowerCase().includes(q),
    );
  }, [disbursements, query]);

  const stats = useMemo(() => {
    const totalCollections = payments.reduce((sum, p) => sum + p.amount, 0);
    const successfulCollections = payments
      .filter((p) => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingDisbursements = disbursements
      .filter((d) => ['pending_approval', 'approved', 'processing'].includes(d.status))
      .reduce((sum, d) => sum + d.netAmount, 0);
    const paidOut = disbursements
      .filter((d) => d.status === 'paid')
      .reduce((sum, d) => sum + d.netAmount, 0);
    return { totalCollections, successfulCollections, pendingDisbursements, paidOut };
  }, [payments, disbursements]);

  if (loading) return <div className="p-8">Loading payments workspace...</div>;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-3xl font-bold">Payments & Disbursements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage Paytota collections, approve payout runs, and monitor vendor/service provider settlements.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Collections</p>
          <p className="mt-1 text-2xl font-bold">UGX {stats.totalCollections.toFixed(0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Successful Collections</p>
          <p className="mt-1 text-2xl font-bold">UGX {stats.successfulCollections.toFixed(0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Disbursements</p>
          <p className="mt-1 text-2xl font-bold">UGX {stats.pendingDisbursements.toFixed(0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid Out</p>
          <p className="mt-1 text-2xl font-bold">UGX {stats.paidOut.toFixed(0)}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID, vendor, customer, or provider reference"
            />
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void loadData()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </Card>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-6">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Paytota Collections</h2>
          </div>
          <div className="divide-y">
            {filteredPayments.map((p) => (
              <div key={p.id} className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{p.id}</p>
                  <Badge variant="outline">{p.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {p.customerName} → {p.vendorName} ({p.checkoutType})
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <CircleDollarSign className="h-4 w-4" /> {p.providerReference}
                  </span>
                  <span className="font-semibold">UGX {p.amount.toFixed(0)}</span>
                </div>
              </div>
            ))}
            {filteredPayments.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No payment records match your query.</p>
            ) : null}
          </div>
        </Card>

        <Card className="xl:col-span-6">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Disbursement Queue</h2>
          </div>
          <div className="divide-y">
            {filteredDisbursements.map((d) => (
              <div key={d.id} className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{d.id}</p>
                  <Badge variant="outline">{d.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {d.vendorName} • {d.sourceType} • {d.sourceReference}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Wallet className="h-4 w-4" /> Gross {d.grossAmount.toFixed(0)} / Fee {d.feeAmount.toFixed(0)}
                  </span>
                  <span className="font-semibold">Net UGX {d.netAmount.toFixed(0)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canApprove(d.status) || savingDisbursementId === d.id}
                    onClick={() => void updateDisbursement(d.id, 'approved')}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canProcess(d.status) || savingDisbursementId === d.id}
                    onClick={() => void updateDisbursement(d.id, 'processing')}
                  >
                    Execute Payout
                  </Button>
                  <Button
                    size="sm"
                    disabled={!canMarkPaid(d.status) || savingDisbursementId === d.id}
                    onClick={() => void updateDisbursement(d.id, 'paid')}
                  >
                    Mark Paid
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!canMarkFailed(d.status) || savingDisbursementId === d.id}
                    onClick={() => void updateDisbursement(d.id, 'failed')}
                  >
                    Mark Failed
                  </Button>
                </div>
                {d.payoutReference ? (
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Landmark className="h-3.5 w-3.5" />
                    Payout ref: {d.payoutReference}
                  </p>
                ) : null}
              </div>
            ))}
            {filteredDisbursements.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No disbursement records match your query.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
