'use client';

import { useEffect, useState } from 'react';
import { Customer } from '@/lib/db';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      setError(null);
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setError('Could not load customers.');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8">Loading customers...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">Customers</h1>
      {error && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-accent/50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{customer.name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{customer.email}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{customer.phone}</td>
                  <td className="px-6 py-4 text-sm text-foreground font-medium">{customer.totalOrders}</td>
                  <td className="px-6 py-4 text-sm text-foreground font-medium">UGX {customer.totalSpent.toFixed(0)}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
