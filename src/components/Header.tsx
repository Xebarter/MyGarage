import { useState } from 'react';
import {
  ShoppingCart,
  Camera,
  Menu as MenuIcon,
  X,
  Wrench,
  MapPin,
  ScanLine
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  cartItems: any[];
  onCartClick: () => void;
  currentView: 'shop' | 'mechanics';
  onViewChange: (view: 'shop' | 'mechanics') => void;
  onToggleSidebar: () => void; // Add this new prop
}

export function Header({ cartItems, onCartClick, currentView, onViewChange, onToggleSidebar }: HeaderProps) {
  const itemCount = cartItems.reduce((total, item) => total + (item.quantity || 0), 0);

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="bg-orange-600 text-white p-2.5 rounded-xl group-hover:bg-orange-700 transition-colors">
                <Wrench className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-slate-900 tracking-tight">MyGarage</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-10">
            <button
              onClick={() => onViewChange('shop')}
              className={`flex items-center gap-2 text-sm font-semibold transition-all ${currentView === 'shop'
                  ? 'text-orange-600'
                  : 'text-slate-700 hover:text-orange-600'
                }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Shop Parts
            </button>

            <button
              onClick={() => onViewChange('mechanics')}
              className={`flex items-center gap-2 text-sm font-semibold transition-all ${currentView === 'mechanics'
                  ? 'text-orange-600'
                  : 'text-slate-700 hover:text-orange-600'
                }`}
            >
              <MapPin className="w-4 h-4" />
              Find Mechanics
            </button>

            <Link
              to="/part-identifier"
              className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-orange-600 transition-all"
            >
              <ScanLine className="w-4.5 h-4.5" />
              Part Identifier
            </Link>
          </nav>

          {/* Right Side: Cart + Hamburger */}
          <div className="flex items-center gap-4">

            {/* Cart Button */}
            <button
              onClick={onCartClick}
              className="relative p-2.5 rounded-lg hover:bg-orange-50 text-slate-700 hover:text-orange-600 transition-all group"
              aria-label={`Shopping cart with ${itemCount} items`}
            >
              <ShoppingCart className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
              <span className="sr-only">Open cart</span>
            </button>

            {/* Hamburger Menu Button */}
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2.5 rounded-lg hover:bg-slate-100 text-slate-700"
              aria-label="Toggle sidebar"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}