import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Search, Filter, Star, Package, MapPin, User, ShoppingBag, Settings, LogOut, Sliders, DollarSign, Tag, Zap, Menu } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  currentView: 'shop' | 'mechanics';
  setCurrentView: (view: 'shop' | 'mechanics') => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  showFeaturedOnly: boolean;
  setShowFeaturedOnly: (featured: boolean) => void;
  categories: Category[];
}

export function Sidebar({ 
  isOpen, 
  toggleSidebar, 
  currentView, 
  setCurrentView, 
  selectedCategory, 
  setSelectedCategory, 
  showFeaturedOnly, 
  setShowFeaturedOnly, 
  categories 
}: SidebarProps) {
  const [hovered, setHovered] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    filters: true,
    account: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <>
      {/* Sidebar */}
      <aside 
        className={`
          h-screen bg-white shadow-xl z-10 flex flex-col transition-all duration-300
          ${isOpen ? 'w-80' : 'w-20'}
          ${isOpen ? 'flex' : 'hidden md:flex'}
        `}
      >
        {/* Mobile Close Button */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">Menu</h1>
          <button onClick={toggleSidebar} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="p-4 space-y-1 flex-shrink-0">
          <button
            onClick={() => setCurrentView('shop')}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left
              ${currentView === 'shop' 
                ? 'bg-orange-50 text-orange-700 border border-orange-200' 
                : 'text-slate-700 hover:bg-slate-50 hover:text-orange-600'
              }
            `}
          >
            <Package className="w-5 h-5" />
            {isOpen && <span className="font-medium">Shop Parts</span>}
          </button>

          <button
            onClick={() => setCurrentView('mechanics')}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left
              ${currentView === 'mechanics' 
                ? 'bg-orange-50 text-orange-700 border border-orange-200' 
                : 'text-slate-700 hover:bg-slate-50 hover:text-orange-600'
              }
            `}
          >
            <MapPin className="w-5 h-5" />
            {isOpen && <span className="font-medium">Find Mechanics</span>}
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left text-slate-700 hover:bg-slate-50 hover:text-orange-600"
          >
            <ShoppingBag className="w-5 h-5" />
            {isOpen && <span className="font-medium">My Orders</span>}
          </button>

          <div className="relative">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left text-slate-700 hover:bg-slate-50 hover:text-orange-600"
              onClick={() => toggleSection('account')}
            >
              <User className="w-5 h-5" />
              {isOpen && (
                <>
                  <span className="font-medium flex-1">Account</span>
                  <ChevronRight 
                    className={`w-4 h-4 transition-transform ${expandedSections.account ? 'rotate-90' : ''}`} 
                  />
                </>
              )}
            </button>
            {isOpen && expandedSections.account && (
              <div className="ml-8 space-y-1 mt-2">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                  Profile
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                  Settings
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Shop Filters - Only show if in shop view */}
        {currentView === 'shop' && isOpen && (
          <div className="p-4 border-t border-slate-200 flex-grow overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h3>
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, filters: !prev.filters }))}
                className="md:hidden p-1 rounded hover:bg-slate-100"
              >
                <Sliders className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {expandedSections.filters && (
              <>
                {/* Search */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Search Parts</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="e.g., Brake pads for Toyota"
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      // Connect to searchQuery state via props if needed
                    />
                  </div>
                </div>

                {/* Categories */}
                <div className="mb-6">
                  <div 
                    className="flex items-center justify-between cursor-pointer mb-3"
                    onClick={() => toggleSection('categories')}
                  >
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Categories
                    </h4>
                    <ChevronRight 
                      className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.categories ? 'rotate-90' : ''}`} 
                    />
                  </div>
                  {expandedSections.categories && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`
                          w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                          ${!selectedCategory ? 'bg-orange-50 text-orange-700' : 'text-slate-700 hover:bg-slate-50'}
                        `}
                      >
                        <Package className="w-4 h-4 flex-shrink-0" />
                        All Parts
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                          className={`
                            w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                            ${selectedCategory === category.id 
                              ? 'bg-orange-50 text-orange-700 font-medium' 
                              : 'text-slate-700 hover:bg-slate-50'
                            }
                          `}
                        >
                          <div className="w-4 h-4 flex-shrink-0" />
                          {category.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Featured Toggle */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFeaturedOnly}
                      onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-slate-700">Featured Only</span>
                    </div>
                  </label>
                </div>

                {/* Price Range Slider */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Price Range
                  </label>
                  <div className="relative">
                    {/* Simple range inputs for modern feel; can enhance with a slider lib like react-slider */}
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      defaultValue="0"
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                      // Connect to filter logic
                    />
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      defaultValue="1000"
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider mt-2"
                      // Connect to filter logic
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                      <span>$0</span>
                      <span>$1,000</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors">
                    <Zap className="w-4 h-4" />
                    Quick Order
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
                    <Settings className="w-4 h-4" />
                    Advanced Filters
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer at the bottom of the sidebar */}
        {isOpen && (
          <div className="mt-auto border-t border-slate-200 p-4 text-xs text-slate-500">
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between">
                <span>&copy; {new Date().getFullYear()} MyGarage</span>
                <span>v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>All rights reserved</span>
                <span>Powered by Supabase</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Desktop Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed left-4 top-1/2 transform -translate-y-1/2 bg-white p-3 rounded-full shadow-lg z-40 hover:shadow-xl transition-shadow hidden md:block"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {isOpen ? (
          <ChevronLeft 
            className={`w-5 h-5 text-slate-700 transition-transform ${hovered ? 'rotate-180' : ''}`} 
          />
        ) : (
          <Menu 
            className={`w-5 h-5 text-slate-700 transition-transform ${hovered ? 'rotate-180' : ''}`} 
          />
        )}
      </button>

      {/* Mobile Toggle Button */}
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed left-4 top-1/2 transform -translate-y-1/2 bg-white p-3 rounded-full shadow-lg z-40 md:hidden hover:shadow-xl transition-shadow"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Menu 
            className={`w-5 h-5 text-slate-700 transition-transform ${hovered ? 'rotate-180' : ''}`} 
          />
        </button>
      )}
    </>
  );
}