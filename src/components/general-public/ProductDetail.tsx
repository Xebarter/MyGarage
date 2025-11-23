import { X, ShoppingCart, Package, Tag, Calendar, Star, Truck, Shield } from 'lucide-react'
import type { Part } from '../lib/supabase'

interface ProductDetailProps {
  part: Part
  onClose: () => void
  onAddToCart: (part: Part) => void
}

export function ProductDetail({ part, onClose, onAddToCart }: ProductDetailProps) {
  const inStock = part.stock_quantity > 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Product Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 shadow-lg">
                <img
                  src={part.image_url || 'https://placehold.co/600x600?text=No+Image'}
                  alt={part.name}
                  className="w-full h-full object-contain"
                />
                {part.featured && (
                  <span className="absolute top-4 right-4 bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                    Featured
                  </span>
                )}
              </div>
              
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-slate-100 rounded-lg aspect-square overflow-hidden">
                  <img 
                    src={part.image_url || 'https://placehold.co/200x200?text=No+Image'} 
                    alt={part.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="bg-slate-100 rounded-lg aspect-square overflow-hidden">
                  <img 
                    src={part.image_url || 'https://placehold.co/200x200?text=No+Image'} 
                    alt={part.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="bg-slate-100 rounded-lg aspect-square overflow-hidden">
                  <img 
                    src={part.image_url || 'https://placehold.co/200x200?text=No+Image'} 
                    alt={part.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-sm font-semibold text-orange-600 uppercase tracking-wide">
                  {part.brand}
                </span>
                <h3 className="text-3xl font-bold text-slate-900 mt-2 mb-4">
                  {part.name}
                </h3>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-slate-600 text-sm">(0 reviews)</span>
                </div>
                
                <div className="text-4xl font-bold text-orange-600 mb-6">
                  UGX {part.price.toLocaleString()}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-slate-600 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Stock Status</div>
                    <div className={`text-sm ${inStock ? 'text-green-600' : 'text-red-600'}`}>
                      {inStock ? `${part.stock_quantity} units available` : 'Out of stock'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Tag className="w-5 h-5 text-slate-600 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">SKU</div>
                    <div className="text-sm text-slate-600">{part.sku}</div>
                  </div>
                </div>

                {part.compatible_models && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-slate-600 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">Compatible Models</div>
                      <div className="text-sm text-slate-600">{part.compatible_models}</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-slate-600 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Delivery</div>
                    <div className="text-sm text-slate-600">Free delivery available</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-slate-600 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Warranty</div>
                    <div className="text-sm text-slate-600">2 years warranty included</div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <h4 className="font-bold text-slate-900 mb-3">Description</h4>
                <p className="text-slate-700 leading-relaxed">{part.description || 'No description available for this product.'}</p>
              </div>
              
              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-bold text-slate-900 mb-3">Specifications</h4>
                <ul className="text-slate-700 space-y-2">
                  <li className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Brand</span>
                    <span>{part.brand}</span>
                  </li>
                  <li className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">SKU</span>
                    <span>{part.sku}</span>
                  </li>
                  {part.compatible_models && (
                    <li className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-600">Compatible Models</span>
                      <span>{part.compatible_models}</span>
                    </li>
                  )}
                  <li className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">In Stock</span>
                    <span>{inStock ? 'Yes' : 'No'}</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  onAddToCart(part);
                  onClose();
                }}
                disabled={!inStock}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-all duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
              >
                <ShoppingCart className="w-6 h-6" />
                {inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Customer Reviews</h3>
            
            <div className="text-center py-12 bg-slate-50 rounded-xl">
              <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-slate-600 mb-2">No reviews yet</h4>
              <p className="text-slate-500 mb-6">Be the first to review this product</p>
              <button className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors">
                Write a Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}