import Link from 'next/link';
import { Product } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`}>
      <div className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition">
        <div className="aspect-square bg-muted overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition"
          />
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{product.category}</p>
          <h3 className="font-semibold text-foreground mt-1">{product.name}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
          <div className="flex items-center justify-between mt-4">
            <span className="text-xl font-bold text-foreground">{formatProductPriceLabel(product)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
