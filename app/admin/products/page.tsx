'use client';

import { useEffect, useMemo, useState } from 'react';
import { Product } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { Trash2, Edit, Plus, Search, Package, Star } from 'lucide-react';
import { ProductFormDialog } from '@/components/admin/product-form';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'regular'>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setError(null);
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setError('Could not load products.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setProducts(products.filter(p => p.id !== id));
      } else {
        alert('Failed to delete product.');
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product.');
    }
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setShowForm(true);
  }

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        q.length === 0 ||
        product.name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q) ||
        product.vendorId.toLowerCase().includes(q);

      const matchesFeatured =
        featuredFilter === 'all' ||
        (featuredFilter === 'featured' && product.featured) ||
        (featuredFilter === 'regular' && !product.featured);

      return matchesSearch && matchesFeatured;
    });
  }, [products, searchQuery, featuredFilter]);

  if (loading) {
    return <div className="p-8">Loading products...</div>;
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card to-card/60 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Products</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage pricing and featured products in one place.</p>
          </div>
          <button
            onClick={() => {
              setEditingProduct(null);
              setShowForm(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus className="h-5 w-5" />
            Add Product
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total products</p>
          <div className="mt-1 flex items-center gap-1">
            <Package className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">{filteredProducts.length}</p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Featured</p>
          <div className="mt-1 flex items-center gap-1">
            <Star className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">
              {filteredProducts.filter((product) => product.featured).length}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        {error && (
          <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-6">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, SKU, or vendor..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="lg:col-span-6">
            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value as 'all' | 'featured' | 'regular')}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All products</option>
              <option value="featured">Featured only</option>
              <option value="regular">Regular only</option>
            </select>
          </div>
        </div>
      </div>

      <ProductFormDialog
        open={showForm}
        onOpenChange={(next) => {
          setShowForm(next);
          if (!next) setEditingProduct(null);
        }}
        product={editingProduct}
        onSuccess={() => void fetchProducts()}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div>
          <table className="w-full table-fixed">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="w-[26%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Prod.</th>
                <th className="w-[18%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Vend.</th>
                <th className="w-[16%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">UGX</th>
                <th className="w-[16%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">SKU</th>
                <th className="w-[12%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Feat.</th>
                <th className="w-[12%] px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Act.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <div className="mx-auto max-w-sm">
                      <p className="text-base font-medium text-foreground">No products match your filters</p>
                      <p className="mt-1 text-sm text-muted-foreground">Try changing the search terms or reset the filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="transition hover:bg-accent/40">
                    <td className="px-4 py-4 text-sm font-medium text-foreground">
                      <div className="truncate" title={product.name}>{product.name}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      <div className="truncate" title={product.vendorId}>{product.vendorId}</div>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-foreground">
                      <div className="truncate" title={formatProductPriceLabel(product)}>
                        {formatProductPriceLabel(product)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      <div className="truncate" title={product.sku}>{product.sku}</div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          product.featured ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}
                        title={product.featured ? 'Featured' : 'Not featured'}
                      >
                        {product.featured ? 'Y' : 'N'}
                      </span>
                      {!product.featured && product.featuredRequestPending && (
                        <p className="mt-1 truncate text-xs text-amber-600" title="Featured request pending">Req.</p>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(product)}
                          className="rounded-md border border-border p-1.5 text-primary transition hover:bg-primary/10"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="rounded-md border border-border p-1.5 text-destructive transition hover:bg-destructive/10"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
