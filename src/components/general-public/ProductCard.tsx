import { ShoppingCart, CarFront } from 'lucide-react'
import type { Part } from '../../lib/supabase'

interface ProductCardProps {
  part: Part
  onAddToCart: (part: Part) => void
  onViewDetails: (part: Part) => void
}

export function ProductCard({ part, onAddToCart, onViewDetails }: ProductCardProps) {
  const inStock = part.stock_quantity > 0;

  return (
    <article 
      className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200 overflow-hidden group cursor-pointer"
      onClick={() => inStock && onViewDetails(part)}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${part.name}`}
      aria-disabled={!inStock}
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        <img
          src={part.image_url || 'https://via.placeholder.com/300x300/6B7280/FFFFFF?text=No+Image'}
          alt={`${part.name} - ${part.brand}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {part.featured && (
          <span className="absolute top-3 right-3 bg-orange-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            Featured
          </span>
        )}
        {!inStock && (
          <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center">
            <span className="bg-red-600 text-white font-semibold px-3 py-1.5 text-sm rounded-md">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-3">
          <span className="inline-block bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-md uppercase tracking-wide">
            {part.brand}
          </span>
        </div>

        <h3 className="font-semibold text-base mb-2 text-slate-900 leading-tight line-clamp-2 min-h-[2.75rem]">
          {part.name}
        </h3>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="text-xl font-bold text-slate-900">
            UGX {part.price.toLocaleString()}
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(part);
          }}
          disabled={!inStock}
          className="w-full mt-3 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
          aria-label={`Add ${part.name} to cart`}
        >
          <ShoppingCart className="w-4 h-4" />
          {inStock ? 'Add to Cart' : 'Sold Out'}
        </button>
      </div>
    </article>
  );
}
