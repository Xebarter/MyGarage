'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Product, Vendor } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';

export default function VendorProductsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        const [vendorRes, productRes] = await Promise.all([
          fetch(`/api/vendors/${id}`),
          fetch(`/api/vendor/products?vendorId=${id}`),
        ]);
        if (!vendorRes.ok || !productRes.ok) {
          throw new Error('Failed to fetch vendor products');
        }
        setVendor(await vendorRes.json());
        const productData = await productRes.json();
        setProducts(Array.isArray(productData) ? productData : []);
      } catch (error) {
        console.error('Failed to fetch vendor products:', error);
        setError('Could not load vendor products.');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return <div className="p-2">Loading products...</div>;

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">{vendor?.name ?? 'Vendor'} Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">All products currently assigned to this vendor.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full table-fixed">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="w-[32%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</th>
              <th className="w-[14%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">SKU</th>
              <th className="w-[14%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</th>
              <th className="w-[16%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Price</th>
              <th className="w-[24%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Featured</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center text-sm text-muted-foreground">
                  This vendor does not have products yet.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="transition hover:bg-accent/30">
                  <td className="truncate px-4 py-4 text-sm font-medium text-foreground" title={product.name}>{product.name}</td>
                  <td className="truncate px-4 py-4 text-sm text-muted-foreground" title={product.sku}>{product.sku}</td>
                  <td className="truncate px-4 py-4 text-sm text-muted-foreground" title={product.category}>{product.category}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-foreground">
                    {formatProductPriceLabel(product)}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${product.featured ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {product.featured ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
