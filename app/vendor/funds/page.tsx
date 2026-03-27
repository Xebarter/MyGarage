'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type FundsData = {
  vendorId: string;
  vendorName: string;
  summary: {
    productGross: number;
    serviceGross: number;
    totalGross: number;
    estimatedFees: number;
    netEarnings: number;
    paidOut: number;
    pendingDisbursement: number;
    availableBalance: number;
  };
  paymentHistory: Array<{
    id: string;
    checkoutType: 'product' | 'service';
    amount: number;
    status: string;
    providerReference: string;
    createdAt: string;
  }>;
  disbursements: Array<{
    id: string;
    sourceType: 'product_checkout' | 'service_payment';
    netAmount: number;
    status: string;
    createdAt: string;
  }>;
  preference: null | {
    payoutMethod: 'mobile_money' | 'bank_account';
    payoutAccountName: string;
    payoutAccountNumber: string;
    network: string;
    frequency: 'instant' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
    minimumPayoutAmount: number;
    autoDisburseEnabled: boolean;
    nextPayoutDate: string | null;
  };
};

export default function VendorFundsPage() {
  const [vendorId, setVendorId] = useState('');
  const [data, setData] = useState<FundsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [frequency, setFrequency] = useState<'instant' | 'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [payoutMethod, setPayoutMethod] = useState<'mobile_money' | 'bank_account'>('mobile_money');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [minimumPayoutAmount, setMinimumPayoutAmount] = useState(50000);
  const [autoDisburseEnabled, setAutoDisburseEnabled] = useState(true);
  const [nextPayoutDate, setNextPayoutDate] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('currentVendorId') || '';
    setVendorId(id);
    if (id) void loadFunds(id);
  }, []);

  const hydratePreference = (pref: FundsData['preference']) => {
    if (!pref) return;
    setFrequency(pref.frequency);
    setPayoutMethod(pref.payoutMethod);
    setAccountName(pref.payoutAccountName);
    setAccountNumber(pref.payoutAccountNumber);
    setNetwork(pref.network);
    setMinimumPayoutAmount(pref.minimumPayoutAmount);
    setAutoDisburseEnabled(pref.autoDisburseEnabled);
    setNextPayoutDate(pref.nextPayoutDate ? pref.nextPayoutDate.slice(0, 10) : '');
  };

  const loadFunds = async (id: string) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/vendor/funds?vendorId=${id}`);
      if (!res.ok) throw new Error();
      const payload = await res.json();
      setData(payload);
      hydratePreference(payload.preference);
    } catch {
      setMessage('Failed to load funds data.');
    } finally {
      setLoading(false);
    }
  };

  const savePreference = async () => {
    if (!vendorId) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/vendor/payout-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          payoutMethod,
          payoutAccountName: accountName,
          payoutAccountNumber: accountNumber,
          network,
          frequency,
          minimumPayoutAmount,
          autoDisburseEnabled,
          nextPayoutDate: nextPayoutDate || null,
        }),
      });
      if (!res.ok) throw new Error();
      setMessage('Payout preference updated successfully.');
      await loadFunds(vendorId);
    } catch {
      setMessage('Failed to update payout preference.');
    } finally {
      setSaving(false);
    }
  };

  const upcomingDisbursements = useMemo(
    () =>
      (data?.disbursements ?? []).filter((d) =>
        ['pending_approval', 'approved', 'processing'].includes(d.status),
      ),
    [data],
  );

  if (loading) return <div className="p-8">Loading funds dashboard...</div>;
  if (!data) return <div className="p-8">Unable to load funds dashboard.</div>;

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Funds & Payouts</h1>
        <p className="text-muted-foreground">
          Track your earnings, payout pipeline, and configure how often you receive your money.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total Gross</p><p className="text-2xl font-bold">UGX {data.summary.totalGross.toFixed(0)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Net Earnings</p><p className="text-2xl font-bold">UGX {data.summary.netEarnings.toFixed(0)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Pending Disbursement</p><p className="text-2xl font-bold">UGX {data.summary.pendingDisbursement.toFixed(0)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Available Balance</p><p className="text-2xl font-bold">UGX {data.summary.availableBalance.toFixed(0)}</p></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="space-y-4 p-5 xl:col-span-7">
          <h2 className="text-lg font-semibold">Payout Preferences</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Preferred frequency</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
                <option value="instant">Instant</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <Label>Payout method</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as any)}>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_account">Bank Account</option>
              </select>
            </div>
            <div><Label>Account name</Label><Input value={accountName} onChange={(e) => setAccountName(e.target.value)} /></div>
            <div><Label>Account number</Label><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></div>
            <div><Label>Network / Bank</Label><Input value={network} onChange={(e) => setNetwork(e.target.value)} /></div>
            <div><Label>Minimum payout amount (UGX)</Label><Input type="number" value={minimumPayoutAmount} onChange={(e) => setMinimumPayoutAmount(Number(e.target.value || 0))} /></div>
            <div><Label>Next payout date</Label><Input type="date" value={nextPayoutDate} onChange={(e) => setNextPayoutDate(e.target.value)} /></div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={autoDisburseEnabled} onCheckedChange={setAutoDisburseEnabled} />
              <Label>Enable automatic disbursement</Label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => void savePreference()} disabled={saving}>{saving ? 'Saving...' : 'Save payout preferences'}</Button>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>
        </Card>

        <Card className="space-y-4 p-5 xl:col-span-5">
          <h2 className="text-lg font-semibold">Upcoming Disbursements</h2>
          <div className="space-y-2">
            {upcomingDisbursements.map((d) => (
              <div key={d.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{d.id}</p>
                  <Badge variant="outline">{d.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{d.sourceType}</p>
                <p className="text-sm font-semibold">UGX {d.netAmount.toFixed(0)}</p>
              </div>
            ))}
            {upcomingDisbursements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending disbursements right now.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
