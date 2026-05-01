import Link from 'next/link';
import { Product } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`} className="block h-full">
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:shadow-lg">
        <div className="aspect-square shrink-0 overflow-hidden bg-muted">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition hover:scale-105"
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
  );
}
