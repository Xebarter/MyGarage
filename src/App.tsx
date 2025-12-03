import { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { Search, Filter, CheckCircle2, Star, Package, ArrowUpDown, Calendar, Clock, Car, ArrowLeft, CreditCard } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase, Category, Part, CartItem } from './lib/supabase';
import { Header } from './components/general-public/Header';
import { CategoryCard } from './components/general-public/CategoryCard';
import { ProductCard } from './components/general-public/ProductCard';
import { Cart } from './components/general-public/Cart';
import { ProductDetail } from './components/general-public/ProductDetail';
import { RepairShopLocator } from './components/general-public/RepairShopLocator';
import { VehicleManagement } from './components/general-public/VehicleManagement';
import { DocumentsAndInsurance } from './components/general-public/DocumentsAndInsurance';
import { ProfileAndSecurity } from './components/general-public/ProfileAndSecurity';
import { ServiceHistory } from './components/general-public/ServiceHistory';
import { ProfileDashboard } from './components/general-public/ProfileDashboard';
import { Appointments } from './components/general-public/Appointments';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';

const Payments = lazy(() => import('./app/profile/payments/page'));
const SuperAdminPage = SuperAdminDashboard;

function App() {
  const location = useLocation();
  const [currentView, setCurrentView] = useState<'shop' | 'mechanics' | 'vehicles' | 'profile'>('shop');
  const [selectedProfileView, setSelectedProfileView] = useState<string | null>(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [filteredParts, setFilteredParts] = useState<Part[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Part[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<string>('default');

  useEffect(() => {
    // Set the current view based on the route
    if (location.pathname === '/profile') {
      setCurrentView('profile');
      setSelectedProfileView(null);
    } else if (location.pathname === '/vehicles') {
      setCurrentView('vehicles');
    } else if (location.pathname === '/mechanics') {
      setCurrentView('mechanics');
    }
  }, [location.pathname]);

  useEffect(() => {
    // Handle hash-based routing
    const handleHashChange = () => {
      if (window.location.hash === '#/superadmin') {
        // We'll handle this in the render logic
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

    // Apply sorting based on sort option
    switch (sortOption) {
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'featured':
        filtered.sort((a, b) => (b.featured === a.featured) ? 0 : b.featured ? 1 : -1);
        break;
      default:
        // Default sorting (featured first, then by name)
        filtered.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return a.name.localeCompare(b.name);
        });
    }

    setFilteredParts(filtered);
  }

  function getSuggestions(query: string) {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const queryText = query.toLowerCase();
    const matchedParts = parts.filter(
      (part) =>
        part.name.toLowerCase().includes(queryText) ||
        part.brand.toLowerCase().includes(queryText)
    );

    // Sort by relevance - prioritize name matches over brand matches
    const sortedParts = matchedParts.sort((a, b) => {
      const aHasNameMatch = a.name.toLowerCase().includes(queryText);
      const bHasNameMatch = b.name.toLowerCase().includes(queryText);

      if (aHasNameMatch && !bHasNameMatch) return -1;
      if (!aHasNameMatch && bHasNameMatch) return 1;

      return a.name.localeCompare(b.name);
    });

    // Limit to 5 suggestions
    setSuggestions(sortedParts.slice(0, 5));
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    getSuggestions(value);
    setShowSuggestions(true);
  }

  function handleSearchFocus() {
    if (searchQuery) {
      getSuggestions(searchQuery);
      setShowSuggestions(true);
    }
  }

  function handleSearchBlur() {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 150);
  }

  function selectSuggestion(part: Part) {
    setSearchQuery(part.name);
    setSuggestions([]);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;

      case 'Enter':
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
          selectSuggestion(suggestions[activeSuggestionIndex]);
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
        break;
    }
  }

  // Reset active suggestion index when suggestions change
  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [suggestions]);

  // Scroll active suggestion into view
  useEffect(() => {
    if (activeSuggestionIndex >= 0 && suggestionsRef.current) {
      const activeElement = suggestionsRef.current.children[activeSuggestionIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeSuggestionIndex]);

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

  // Appointment form state
  const [appointmentForm, setAppointmentForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    appointment_date: '',
    appointment_time: '',
    service_type: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    notes: ''
  });

  const [appointmentSubmitted, setAppointmentSubmitted] = useState(false);
  const [appointmentError, setAppointmentError] = useState('');

  const handleAppointmentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAppointmentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppointmentError('');

    try {
      // Combine date and time
      const appointmentDateTime = new Date(`${appointmentForm.appointment_date}T${appointmentForm.appointment_time}`);

      const { error } = await supabase
        .from('appointments')
        .insert([
          {
            customer_name: appointmentForm.customer_name,
            customer_email: appointmentForm.customer_email,
            customer_phone: appointmentForm.customer_phone,
            appointment_date: appointmentDateTime.toISOString(),
            service_type: appointmentForm.service_type,
            vehicle_make: appointmentForm.vehicle_make,
            vehicle_model: appointmentForm.vehicle_model,
            vehicle_year: parseInt(appointmentForm.vehicle_year),
            notes: appointmentForm.notes
          }
        ]);

      if (error) throw error;

      setAppointmentSubmitted(true);
      setAppointmentForm({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        appointment_date: '',
        appointment_time: '',
        service_type: '',
        vehicle_make: '',
        vehicle_model: '',
        vehicle_year: '',
        notes: ''
      });

      // Hide success message after 5 seconds
      setTimeout(() => {
        setAppointmentSubmitted(false);
        setShowAppointmentForm(false);
      }, 5000);
    } catch (error: any) {
      console.error('Error scheduling appointment:', error);
      setAppointmentError(error.message || 'Failed to schedule appointment. Please try again.');
    }
  };

  const toggleSidebar = () => {
    // This function is no longer needed since we moved to a hamburger menu
  };

  const renderProfileContent = () => {
    if (selectedProfileView === null) {
      return (
        <ProfileDashboard
          onSelectView={(optionId) => {
            if (optionId === 'service_history') {
              window.location.hash = '#/service-history';
            } else if (optionId === 'documents_storage') {
              window.location.hash = '#/documents-insurance';
            } else {
              setSelectedProfileView(optionId);
            }
          }}
        />
      );
    }

    switch (selectedProfileView) {
      case 'profile-and-security':
        return <ProfileAndSecurity onBack={() => setSelectedProfileView(null)} />;
      case 'service_history':
        return <ServiceHistory onBack={() => setSelectedProfileView(null)} />;
      case 'documents_storage':
        return <DocumentsAndInsurance onBack={() => setSelectedProfileView(null)} />;
      case 'appointments':
        return <Appointments />;
      case 'payments':
        return <Payments />;
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Section Not Available</h2>
            <p className="text-gray-600">This section is currently under development.</p>
            <button
              onClick={() => setSelectedProfileView(null)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to Profile
            </button>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden ml-0">
        <Header
          cartItems={cartItems}
          onCartClick={() => setIsCartOpen(true)}
          currentView={currentView}
          onViewChange={setCurrentView}
          onShowAppointmentForm={() => setShowAppointmentForm(true)}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          onProfileOptionSelect={setSelectedProfileView}
        />

        {showOrderSuccess && (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Order placed successfully!</span>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {currentView === 'mechanics' ? (
            <RepairShopLocator />
          ) : currentView === 'vehicles' ? (
            <VehicleManagement />
          ) : currentView === 'profile' ? (
            renderProfileContent()
          ) : location.hash === '#/superadmin' ? (
            <Suspense fallback={
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              </div>
            }>
              <SuperAdminPage />
            </Suspense>
          ) : location.pathname.startsWith('/admin') ? (
            <AdminDashboard />
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
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search parts..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onFocus={handleSearchFocus}
                        onBlur={handleSearchBlur}
                        onKeyDown={handleKeyDown}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent w-full md:w-64"
                      />

                      {showSuggestions && suggestions.length > 0 && (
                        <ul
                          ref={suggestionsRef}
                          className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        >
                          {suggestions.map((part, index) => (
                            <li
                              key={part.id}
                              onMouseDown={() => selectSuggestion(part)}
                              className={`px-4 py-3 cursor-pointer flex items-center ${index === activeSuggestionIndex
                                ? 'bg-orange-50 text-orange-700'
                                : 'hover:bg-slate-50'
                                }`}
                            >
                              <img
                                src={part.image_url || 'https://placehold.co/40x40/e2e8f0/64748b?text=IMG'}
                                alt={part.name}
                                className="w-10 h-10 object-cover rounded mr-3"
                              />
                              <div>
                                <div className="font-medium">{part.name}</div>
                                <div className="text-sm text-slate-500">{part.brand}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="relative">
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="appearance-none pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent w-full bg-white"
                      >
                        <option value="default">Sort by: Default</option>
                        <option value="name-asc">Name: A-Z</option>
                        <option value="name-desc">Name: Z-A</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="featured">Featured First</option>
                      </select>
                      <ArrowUpDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
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

      {/* Profile Views */}
      {showAppointmentForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            // Close the form when clicking on the backdrop (outside the form)
            if (e.target === e.currentTarget) {
              setShowAppointmentForm(false);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md my-8">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Schedule Appointment</h2>
                <button
                  onClick={() => setShowAppointmentForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              {appointmentSubmitted ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Appointment Scheduled!</h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Thank you for scheduling your appointment. We'll contact you shortly to confirm.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAppointmentSubmit} className="space-y-4">
                  {appointmentError && (
                    <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
                      {appointmentError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      name="customer_name"
                      value={appointmentForm.customer_name}
                      onChange={handleAppointmentChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        name="customer_email"
                        value={appointmentForm.customer_email}
                        onChange={handleAppointmentChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        name="customer_phone"
                        value={appointmentForm.customer_phone}
                        onChange={handleAppointmentChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                    <select
                      name="service_type"
                      value={appointmentForm.service_type}
                      onChange={handleAppointmentChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    >
                      <option value="">Select a service</option>
                      <option value="Oil Change">Oil Change</option>
                      <option value="Brake Service">Brake Service</option>
                      <option value="Engine Diagnostic">Engine Diagnostic</option>
                      <option value="Tire Rotation">Tire Rotation</option>
                      <option value="Battery Replacement">Battery Replacement</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Make</label>
                      <input
                        type="text"
                        name="vehicle_make"
                        value={appointmentForm.vehicle_make}
                        onChange={handleAppointmentChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                        placeholder="e.g., Toyota"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model</label>
                      <input
                        type="text"
                        name="vehicle_model"
                        value={appointmentForm.vehicle_model}
                        onChange={handleAppointmentChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                        placeholder="e.g., Camry"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Year</label>
                    <input
                      type="number"
                      name="vehicle_year"
                      value={appointmentForm.vehicle_year}
                      onChange={handleAppointmentChange}
                      required
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      placeholder="e.g., 2020"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        name="appointment_date"
                        value={appointmentForm.appointment_date}
                        onChange={handleAppointmentChange}
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                      <input
                        type="time"
                        name="appointment_time"
                        value={appointmentForm.appointment_time}
                        onChange={handleAppointmentChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <textarea
                      name="notes"
                      value={appointmentForm.notes}
                      onChange={handleAppointmentChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      placeholder="Any additional information..."
                    ></textarea>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAppointmentForm(false)}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    >
                      Schedule Appointment
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;