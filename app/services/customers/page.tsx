'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, Users, UserCheck, Crown, Wallet } from 'lucide-react';

interface VendorOrderItem {
  vendorId: string;
  productName: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  customerId: string;
  items: VendorOrderItem[];
  status: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  ordersCount: number;
  totalSpent: number;
  totalUnits: number;
  lastOrderDate: string;
  firstOrderDate: string;
  activeStatuses: number;
  deliveredCount: number;
  cancelledCount: number;
  serviceAddresses: string[];
  topServices: Array<{ name: string; qty: number }>;
}

type SegmentFilter = 'all' | 'new' | 'returning' | 'vip';
type SortBy = 'revenue' | 'orders' | 'recent' | 'name';

export default function ServiceCustomersPage() {
  const [vendorId, setVendorId] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('revenue');

  useEffect(() => {
    const currentVendorId = localStorage.getItem('currentVendorId');
    if (currentVendorId) {
      setVendorId(currentVendorId);
      fetchOrders(currentVendorId);
    }
  }, []);

  const fetchOrders = async (currentVendorId: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/vendor/orders?vendorId=${currentVendorId}`);
      if (!response.ok) throw new Error('Unable to fetch customer data');
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error('Failed to fetch service customer data:', fetchError);
      setError('Could not load service customer data. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getVendorItems = (order: Order) => order.items.filter((item) => item.vendorId === vendorId);

  const customerRows = useMemo(() => {
    const map = new Map<string, CustomerRow & { serviceCounts: Record<string, number> }>();

    for (const order of orders) {
      const vendorItems = getVendorItems(order);
      if (vendorItems.length === 0) continue;

      const customerKey = order.customerId || order.customerEmail || order.id;
      const orderTotal = vendorItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
      const orderUnits = vendorItems.reduce((sum, item) => sum + item.quantity, 0);

      if (!map.has(customerKey)) {
        map.set(customerKey, {
          id: customerKey,
          name: order.customerName || 'Unknown customer',
          email: order.customerEmail || 'No email',
          ordersCount: 0,
          totalSpent: 0,
          totalUnits: 0,
          lastOrderDate: order.createdAt,
          firstOrderDate: order.createdAt,
          activeStatuses: 0,
          deliveredCount: 0,
          cancelledCount: 0,
          serviceAddresses: [],
          topServices: [],
          serviceCounts: {},
        });
      }

      const row = map.get(customerKey)!;
      row.ordersCount += 1;
      row.totalSpent += orderTotal;
      row.totalUnits += orderUnits;
      if (new Date(order.createdAt) > new Date(row.lastOrderDate)) row.lastOrderDate = order.createdAt;
      if (new Date(order.createdAt) < new Date(row.firstOrderDate)) row.firstOrderDate = order.createdAt;

      if (['pending', 'processing', 'shipped'].includes(order.status)) row.activeStatuses += 1;
      if (order.status === 'delivered') row.deliveredCount += 1;
      if (order.status === 'cancelled') row.cancelledCount += 1;

      if (order.shippingAddress && !row.serviceAddresses.includes(order.shippingAddress)) {
        row.serviceAddresses.push(order.shippingAddress);
      }

      for (const item of vendorItems) {
        const name = item.productName || 'Unnamed service';
        row.serviceCounts[name] = (row.serviceCounts[name] || 0) + item.quantity;
      }
    }

    return Array.from(map.values()).map((row) => {
      const topServices = Object.entries(row.serviceCounts)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 3);

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        ordersCount: row.ordersCount,
        totalSpent: row.totalSpent,
        totalUnits: row.totalUnits,
        lastOrderDate: row.lastOrderDate,
        firstOrderDate: row.firstOrderDate,
        activeStatuses: row.activeStatuses,
        deliveredCount: row.deliveredCount,
        cancelledCount: row.cancelledCount,
        serviceAddresses: row.serviceAddresses,
        topServices,
      };
    });
  }, [orders, vendorId]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCustomers = useMemo(() => {
    const withFilters = customerRows.filter((customer) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        customer.name.toLowerCase().includes(normalizedQuery) ||
        customer.email.toLowerCase().includes(normalizedQuery);

      const matchesSegment =
        segmentFilter === 'all'
          ? true
          : segmentFilter === 'new'
          ? customer.ordersCount === 1
          : segmentFilter === 'returning'
          ? customer.ordersCount >= 2
          : customer.ordersCount >= 5;

      return matchesSearch && matchesSegment;
    });

    withFilters.sort((a, b) => {
      if (sortBy === 'revenue') return b.totalSpent - a.totalSpent;
      if (sortBy === 'orders') return b.ordersCount - a.ordersCount;
      if (sortBy === 'recent') return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
      return a.name.localeCompare(b.name);
    });

    return withFilters;
  }, [customerRows, normalizedQuery, segmentFilter, sortBy]);

  const customerStats = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const totalCustomers = customerRows.length;
    const activeLast30Days = customerRows.filter((customer) => new Date(customer.lastOrderDate).getTime() >= thirtyDaysAgo).length;
    const repeatCustomers = customerRows.filter((customer) => customer.ordersCount >= 2).length;
    const vipCustomers = customerRows.filter((customer) => customer.ordersCount >= 5).length;
    const lifetimeRevenue = customerRows.reduce((sum, customer) => sum + customer.totalSpent, 0);
    return { totalCustomers, activeLast30Days, repeatCustomers, vipCustomers, lifetimeRevenue };
  }, [customerRows]);

  if (loading) return <div className="flex items-center justify-center p-8">Loading customers...</div>;

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            Understand buyer behavior, identify repeat service customers, and prioritize high-value relationships.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => fetchOrders(vendorId)}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 justify-items-start gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="h-[96px] w-full max-w-[240px] p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Total Customers</p>
          <p className="text-xl font-bold leading-none">{customerStats.totalCustomers}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{customerStats.activeLast30Days} active in 30 days</p>
        </Card>
        <Card className="h-[96px] w-full max-w-[240px] p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Repeat Customers</p>
          <p className="text-xl font-bold leading-none">{customerStats.repeatCustomers}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Placed 2+ service orders</p>
        </Card>
        <Card className="h-[96px] w-full max-w-[240px] p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">VIP Customers</p>
          <p className="text-xl font-bold leading-none">{customerStats.vipCustomers}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Placed 5+ service orders</p>
        </Card>
        <Card className="h-[96px] w-full max-w-[240px] p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Service Revenue</p>
          <p className="text-xl font-bold leading-none">UGX {customerStats.lifetimeRevenue.toFixed(0)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Total provider service sales</p>
        </Card>
      </div>

      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by customer name or email..." className="pl-9" />
          </div>

          <select value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value as SegmentFilter)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All segments</option>
            <option value="new">New (1 order)</option>
            <option value="returning">Returning (2+ orders)</option>
            <option value="vip">VIP (5+ orders)</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="revenue">Sort: Highest revenue</option>
            <option value="orders">Sort: Most orders</option>
            <option value="recent">Sort: Most recent</option>
            <option value="name">Sort: Name A-Z</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="gap-1"><Users className="h-3.5 w-3.5" /> Total: {customerStats.totalCustomers}</Badge>
          <Badge variant="outline" className="gap-1"><UserCheck className="h-3.5 w-3.5" /> Repeat: {customerStats.repeatCustomers}</Badge>
          <Badge variant="outline" className="gap-1"><Crown className="h-3.5 w-3.5" /> VIP: {customerStats.vipCustomers}</Badge>
          <Badge variant="outline" className="gap-1"><Wallet className="h-3.5 w-3.5" /> Revenue: UGX {customerStats.lifetimeRevenue.toFixed(0)}</Badge>
        </div>
      </Card>

      <div className="space-y-4">
        {error ? (
          <Card className="p-8 text-center">
            <p className="mb-3 font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={() => fetchOrders(vendorId)}>Try again</Button>
          </Card>
        ) : filteredCustomers.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-medium">No customers found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters, or check back after new service orders are placed.</p>
          </Card>
        ) : (
          filteredCustomers.map((customer) => (
            <Card key={customer.id} className="p-6">
              <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold">{customer.name}</h3>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    First order: {new Date(customer.firstOrderDate).toLocaleDateString()} | Last order: {new Date(customer.lastOrderDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customer.ordersCount >= 5 ? (
                    <Badge className="bg-primary/10 text-primary">VIP</Badge>
                  ) : customer.ordersCount >= 2 ? (
                    <Badge className="bg-accent/20 text-accent-foreground">Returning</Badge>
                  ) : (
                    <Badge variant="outline">New</Badge>
                  )}
                  {customer.activeStatuses > 0 && <Badge variant="outline">Active Orders: {customer.activeStatuses}</Badge>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="text-lg font-semibold">{customer.ordersCount}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Service Units Booked</p>
                  <p className="text-lg font-semibold">{customer.totalUnits}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Delivered / Cancelled</p>
                  <p className="text-lg font-semibold">{customer.deliveredCount} / {customer.cancelledCount}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="text-lg font-semibold">UGX {customer.totalSpent.toFixed(0)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-md border border-border p-3">
                  <p className="mb-2 text-sm font-medium">Top Purchased Services</p>
                  {customer.topServices.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No service purchase history yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {customer.topServices.map((item) => (
                        <p key={item.name} className="text-sm text-muted-foreground">
                          {item.name} <span className="font-medium text-foreground">x {item.qty}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-md border border-border p-3">
                  <p className="mb-2 text-sm font-medium">Service Addresses</p>
                  {customer.serviceAddresses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No service addresses found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {customer.serviceAddresses.slice(0, 2).map((address) => (
                        <p key={address} className="text-sm text-muted-foreground">{address}</p>
                      ))}
                      {customer.serviceAddresses.length > 2 && (
                        <p className="text-xs text-muted-foreground">+{customer.serviceAddresses.length - 2} more saved addresses</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
