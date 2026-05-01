import Link from 'next/link';
import { Product } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { ProductWishlistButton } from '@/components/product-wishlist-button';
import { ProductImage } from '@/components/product-image';

interface ProductCardProps {
  product: Product;
  customerId?: string | null;
  wishlistItemId?: string | null;
  onWishlistChange?: (next: { productId: string; wishlistItemId: string | null }) => void;
  /** High fetch priority for above-the-fold tiles (LCP helpers) */
  imagePriority?: boolean;
}

export function ProductCard({
  product,
  customerId = null,
  wishlistItemId = null,
  onWishlistChange,
  imagePriority = false,
}: ProductCardProps) {
  return (
    <div className="relative h-full overflow-hidden rounded-lg border border-border bg-card transition hover:shadow-lg">
      {onWishlistChange ? (
        <ProductWishlistButton
          product={product}
          customerId={customerId}
          savedWishlistItemId={wishlistItemId}
          onUpdate={onWishlistChange}
          className="absolute right-2 top-2 z-10"
        />
      ) : null}
      <Link href={`/products/${product.id}`} className="block h-full">
        <div className="flex h-full flex-col">
          <div className="relative aspect-square shrink-0 overflow-hidden bg-muted">
            <ProductImage
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
              priority={imagePriority}
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.category}</p>
            <h3 className="mt-1 line-clamp-2 font-semibold text-foreground">{product.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
            <div className="mt-auto flex items-center justify-between pt-4">
              <span className="text-xl font-bold text-foreground">{formatProductPriceLabel(product)}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
