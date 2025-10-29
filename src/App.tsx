import { useEffect, useState } from 'react';
import { Search, Filter, CheckCircle2, Star, Package } from 'lucide-react';
import { supabase, Category, Part, CartItem } from './lib/supabase';
import { Header } from './components/Header';
import { CategoryCard } from './components/CategoryCard';
import { ProductCard } from './components/ProductCard';
import { Cart } from './components/Cart';
import { ProductDetail } from './components/ProductDetail';
import { RepairShopLocator } from './components/RepairShopLocator';
import { Sidebar } from './components/Sidebar';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'shop' | 'mechanics'>('shop');
  const [categories, setCategories] = useState<Category[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [filteredParts, setFilteredParts] = useState<Part[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchParts();
  }, []);

  useEffect(() => {
    filterParts();
  }, [parts, selectedCategory, searchQuery, showFeaturedOnly]);

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
    } else {
      setCategories(data || []);
    }
  }

  async function fetchParts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .order('featured', { ascending: false })
      .order('name');

    if (error) {
      console.error('Error fetching parts:', error);
    } else {
      setParts(data || []);
    }
    setLoading(false);
  }

  function filterParts() {
    let filtered = [...parts];

    if (selectedCategory) {
      filtered = filtered.filter((part) => part.category_id === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (part) =>
          part.name.toLowerCase().includes(query) ||
          part.description.toLowerCase().includes(query) ||
          part.brand.toLowerCase().includes(query) ||
          part.compatible_models.toLowerCase().includes(query)
      );
    }

    if (showFeaturedOnly) {
      filtered = filtered.filter((part) => part.featured);
    }

    setFilteredParts(filtered);
  }

  function handleCategorySelect(categoryId: string) {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  }

  function handleAddToCart(part: Part) {
    setCartItems((items) => {
      const existingItem = items.find((item) => item.part.id === part.id);
      if (existingItem) {
        if (existingItem.quantity < part.stock_quantity) {
          return items.map((item) =>
            item.part.id === part.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return items;
      }
      return [...items, { part, quantity: 1 }];
    });
  }

  function handleUpdateQuantity(partId: string, quantity: number) {
    if (quantity < 1) return;

    setCartItems((items) => {
      return items.map((item) => {
        if (item.part.id === partId) {
          const part = parts.find((p) => p.id === partId);
          if (part && quantity <= part.stock_quantity) {
            return { ...item, quantity };
          }
        }
        return item;
      });
    });
  }

  function handleRemoveItem(partId: string) {
    setCartItems((items) => items.filter((item) => item.part.id !== partId));
  }

  async function handleCheckout(customerInfo: {
    name: string;
    email: string;
    phone: string
  }) {
    const total = cartItems.reduce((sum, item) => sum + item.part.price * item.quantity, 0);

    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          total_amount: total,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      return;
    }

    const orderId = data.id;

    // Create order items
    const orderItems = cartItems.map((item) => ({
      order_id: orderId,
      part_id: item.part.id,
      quantity: item.quantity,
      price: item.part.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      return;
    }

    // Update stock quantities
    for (const item of cartItems) {
      await supabase
        .from('parts')
        .update({
          stock_quantity: item.part.stock_quantity - item.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.part.id);
    }

    // Clear cart
    setCartItems([]);
    setIsCartOpen(false);
    setShowOrderSuccess(true);

    setTimeout(() => {
      setShowOrderSuccess(false);
    }, 3000);
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        currentView={currentView}
        setCurrentView={setCurrentView}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        showFeaturedOnly={showFeaturedOnly}
        setShowFeaturedOnly={setShowFeaturedOnly}
        categories={categories}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          cartItems={cartItems}
          onCartClick={() => setIsCartOpen(true)}
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        {showOrderSuccess && (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Order placed successfully!</span>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
          {currentView === 'mechanics' ? (
            <RepairShopLocator />
          ) : (
            <>
              <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">Auto Parts Shop</h2>
                    <p className="text-slate-600 mt-1">Find the perfect parts for your vehicle</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search parts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent w-full md:w-64"
                      />
                    </div>

                    <button
                      onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFeaturedOnly
                          ? 'bg-orange-50 border-orange-200 text-orange-700'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <Star className="w-4 h-4" />
                      Featured
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`p-4 rounded-xl border transition-all ${!selectedCategory
                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-orange-300'
                      }`}
                  >
                    <Package className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-medium">All</span>
                  </button>

                  {categories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      isSelected={selectedCategory === category.id}
                      onSelect={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
                    />
                  ))}
                </div>

                {selectedCategory && (
                  <div className="mt-4">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Clear category filter
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-slate-900">
                    {selectedCategory
                      ? categories.find((c) => c.id === selectedCategory)?.name || 'Products'
                      : 'All Products'}
                  </h3>
                  <div className="text-slate-600">
                    {filteredParts.length} {filteredParts.length === 1 ? 'product' : 'products'}
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-16">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                    <p className="mt-4 text-slate-600">Loading products...</p>
                  </div>
                ) : filteredParts.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl shadow-md">
                    <p className="text-xl text-slate-600">No products found</p>
                    <p className="text-slate-500 mt-2">Try adjusting your filters or search query</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredParts.map((part) => (
                      <ProductCard
                        key={part.id}
                        part={part}
                        onAddToCart={handleAddToCart}
                        onViewDetails={setSelectedPart}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        <Cart
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onCheckout={handleCheckout}
        />

        {selectedPart && (
          <ProductDetail
            part={selectedPart}
            onClose={() => setSelectedPart(null)}
            onAddToCart={handleAddToCart}
          />
        )}
      </div>
    </div>
  );
}

export default App;