'use client';

export default function InventoryPage() {
  return (
    <div className="p-8">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Inventory Monitoring Removed</h1>
      <p className="text-muted-foreground">
        This application no longer tracks product stock levels. Use the Products page to manage listings and pricing.
      </p>
      <div className="mt-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        No stock alerts, stock edits, or stock-based availability checks are active.
      </div>
    </div>
  );
}
