'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Megaphone } from 'lucide-react';
import { ProductFormDialog } from '@/components/admin/product-form';
import type { Product } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';

export default function VendorProductsPage() {
  const [vendorId, setVendorId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adApplying, setAdApplying] = useState<string | null>(null);

  useEffect(() => {
    const currentVendorId = localStorage.getItem('currentVendorId');
    if (currentVendorId) {
      setVendorId(currentVendorId);
      fetchProducts(currentVendorId);
    }
  }, []);

  const fetchProducts = async (vendorId: string) => {
    try {
      const response = await fetch(`/api/vendor/products?vendorId=${vendorId}`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleProductSaved = () => {
    void fetchProducts(vendorId);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await fetch(`/api/vendor/products/${productId}?vendorId=${vendorId}`, { method: 'DELETE' });
        fetchProducts(vendorId);
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
  };

  const applyForAd = async (scope: 'single' | 'all', product?: Product) => {
    if (!vendorId) return;
    const message = window.prompt('Optional: add a note for the admin review');

    try {
      setAdApplying(scope === 'all' ? 'all' : product?.id || null);
      const response = await fetch('/api/ad-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          scope,
          productId: scope === 'single' ? product?.id : undefined,
          productName: scope === 'single' ? product?.name : undefined,
          message: message || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      window.alert(
        scope === 'all'
          ? 'Your ad request for all products was submitted.'
          : `Your ad request for "${product?.name}" was submitted.`
      );
    } catch (error) {
      console.error('Failed to submit ad request:', error);
      window.alert('Could not submit ad request. Please try again.');
    } finally {
      setAdApplying(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading products...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Products</h1>
          <p className="text-muted-foreground">Manage your product listings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => applyForAd('all')}
            className="gap-2"
            disabled={adApplying === 'all'}
          >
            <Megaphone className="h-4 w-4" />
            {adApplying === 'all' ? 'Submitting...' : 'Apply Ads (All Products)'}
          </Button>
          <Button onClick={handleAddProduct} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Products List */}
      <div className="space-y-4">
        {products.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">No products yet. Start by adding your first product!</p>
          </div>
        ) : (
          products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="relative h-40 w-full bg-muted/30 md:h-auto md:w-56 md:shrink-0">
                  {product.image && product.image !== "/products/default.jpg" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt=""
                      className="h-full w-full object-cover md:min-h-[160px]"
                    />
                  ) : (
                    <div className="flex h-full min-h-[160px] items-center justify-center bg-gradient-to-br from-primary/15 to-accent/20 text-sm text-muted-foreground">
                      No photo
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-4 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {product.featured ? (
                          <Badge className="bg-primary/10 text-primary">Featured</Badge>
                        ) : product.featuredRequestPending ? (
                          <Badge variant="outline">Featured request pending</Badge>
                        ) : (
                          <Badge variant="secondary">Regular listing</Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 text-left md:min-w-48 md:text-right">
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="font-semibold">{formatProductPriceLabel(product)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyForAd('single', product)}
                      className="gap-2"
                      disabled={adApplying === product.id}
                    >
                      <Megaphone className="h-4 w-4" />
                      {adApplying === product.id ? 'Submitting...' : 'Apply Ads'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProduct(product)}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProduct(product.id)}
                      className="gap-2 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={showForm}
        onOpenChange={(next) => {
          setShowForm(next);
          if (!next) setEditingProduct(null);
        }}
        product={editingProduct}
        onSuccess={handleProductSaved}
        vendorId={vendorId}
      />
    </div>
  );
}
