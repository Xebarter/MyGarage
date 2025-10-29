import { useState } from 'react';
import { ShoppingCart, Wrench, MapPin, Package, Shield, Menu, X, Search } from 'lucide-react';
import { CartItem } from '../lib/supabase';
import { Link } from 'react-router-dom';

type HeaderProps = {
  cartItems: CartItem[];
  onCartClick: () => void;
  currentView: 'shop' | 'mechanics';
  onViewChange: (view: 'shop' | 'mechanics') => void;
};

export function Header({ cartItems, onCartClick, currentView, onViewChange }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl sticky top-0 z-50 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="p-2 bg-orange-500/10 rounded-xl">
              <Wrench className="w-6 h-6 text-orange-400" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                MyGarage
              </h1>
              <p className="text-xs text-slate-400">Premium Auto Parts</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-xl font-bold">MyGarage</h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <div className="flex bg-slate-800/50 backdrop-blur-sm rounded-xl p-1 border border-slate-700/50">
              <button
                onClick={() => onViewChange('shop')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm relative group ${
                  currentView === 'shop'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                aria-label="Shop Parts"
              >
                <Package className="w-4 h-4" />
                <span>Shop Parts</span>
                {currentView === 'shop' && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-orange-600 border-l-transparent border-r-transparent" />
                )}
              </button>
              <button
                onClick={() => onViewChange('mechanics')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm relative group ${
                  currentView === 'mechanics'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                aria-label="Find Mechanics"
              >
                <MapPin className="w-4 h-4" />
                <span>Find Mechanics</span>
                {currentView === 'mechanics' && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-orange-600 border-l-transparent border-r-transparent" />
                )}
              </button>
            </div>

            {/* Admin Link - Desktop */}
            <Link
              to="/admin"
              className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 px-4 py-2.5 rounded-xl transition-all duration-200 border border-slate-700/50 hover:border-slate-600 font-medium text-sm hidden lg:inline-flex"
              aria-label="Admin Panel"
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={onCartClick}
              className="group relative flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 px-4 py-2.5 md:px-6 md:py-3 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm md:text-base"
              aria-label={`View cart with ${cartItemCount} items`}
            >
              <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Cart</span>
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-slate-700/50 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  onViewChange('shop');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left ${
                  currentView === 'shop'
                    ? 'bg-orange-600/20 text-orange-300 border border-orange-500/30'
                    : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <Package className="w-5 h-5" />
                <span className="font-medium">Shop Parts</span>
              </button>
              <button
                onClick={() => {
                  onViewChange('mechanics');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left ${
                  currentView === 'mechanics'
                    ? 'bg-orange-600/20 text-orange-300 border border-orange-500/30'
                    : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <MapPin className="w-5 h-5" />
                <span className="font-medium">Find Mechanics</span>
              </button>
              <Link
                to="/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800/50 transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Shield className="w-5 h-5" />
                Admin
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}