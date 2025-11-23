import { useState } from 'react';
import {
  ShoppingCart,
  Menu as MenuIcon,
  X,
  Wrench,
  MapPin,
  ScanLine,
  Calendar,
  ChevronDown,
  Package,
  Car,
  Gauge,
  Battery,
  Snowflake,
  Shield,
  Zap,
  User,
  ShoppingBag,
  Settings,
  LogOut,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  cartItems: any[];
  onCartClick: () => void;
  currentView: 'shop' | 'mechanics';
  onViewChange: (view: 'shop' | 'mechanics') => void;
  onShowAppointmentForm?: () => void;
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

const CATEGORIES = [
  { id: 'engine', name: 'Engine System', icon: <Car className="w-5 h-5" />, subs: ['Engine Blocks', 'Gaskets & Seals', 'Belts & Hoses', 'Fuel System', 'Ignition', 'Intake & Exhaust', 'Cooling', 'Oil System'] },
  { id: 'transmission', name: 'Transmission & Drivetrain', icon: <Gauge className="w-5 h-5" />, subs: ['Clutch Kits', 'Automatic Transmission', 'CVT/DCT', 'Driveshafts & Axles'] },
  { id: 'suspension', name: 'Suspension & Steering', icon: <Wrench className="w-5 h-5" />, subs: ['Shocks & Struts', 'Control Arms', 'Steering Racks', 'Bushings'] },
  { id: 'brakes', name: 'Braking System', icon: <div className="w-5 h-5 rounded-full border-2 border-red-600" />, subs: ['Brake Pads', 'Rotors', 'Calipers', 'Brake Lines'] },
  { id: 'wheels', name: 'Wheels & Tyres', icon: <div className="w-5 h-5 rounded-full bg-black" />, subs: ['Alloy Wheels', 'Tyres', 'TPMS Sensors', 'Lug Nuts'] },
  { id: 'electrical', name: 'Electrical Systems', icon: <Battery className="w-5 h-5" />, subs: ['Alternators', 'Starters', 'Sensors', 'ECUs', 'Lighting'] },
  { id: 'hvac', name: 'Climate & HVAC', icon: <Snowflake className="w-5 h-5" />, subs: ['A/C Compressors', 'Heater Cores', 'Blower Motors', 'Cabin Filters'] },
  { id: 'safety', name: 'Safety & ADAS', icon: <Shield className="w-5 h-5" />, subs: ['Airbags', 'ABS Modules', 'Cameras & Radar', 'Seatbelts'] },
  { id: 'service', name: 'Service & Maintenance', icon: <Zap className="w-5 h-5" />, subs: ['Oils & Fluids', 'Filters', 'Spark Plugs', 'Wipers', 'Batteries'] },
  { id: 'performance', name: 'Performance Upgrades', icon: <Zap className="w-5 h-5 text-orange-600" />, subs: ['ECU Tuning', 'Intakes', 'Exhausts', 'Suspension Kits', 'Big Brakes'] },
];

export function Header({
  cartItems,
  onCartClick,
  currentView,
  onViewChange,
  onShowAppointmentForm = () => {},
  selectedCategory,
  onCategorySelect,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>([]);

  const itemCount = cartItems.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);

  const toggleCat = (id: string) => {
    setExpandedCats(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCatClick = (id: string | null) => {
    onCategorySelect(id);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Main Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="bg-orange-600 text-white p-2.5 rounded-xl group-hover:bg-orange-700 transition">
                <Wrench className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-slate-900 tracking-tight">MyGarage</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center space-x-8">
              <button onClick={() => onViewChange('shop')} className={`font-medium ${currentView === 'shop' ? 'text-orange-600' : 'text-slate-700 hover:text-orange-600'}`}>
                Shop Parts
              </button>
              <button onClick={() => onViewChange('mechanics')} className={`font-medium ${currentView === 'mechanics' ? 'text-orange-600' : 'text-slate-700 hover:text-orange-600'}`}>
                Find Mechanics
              </button>
              <Link to="/part-identifier" className="font-medium text-slate-700 hover:text-orange-600 flex items-center gap-2">
                <ScanLine className="w-4 h-4" /> Part Identifier
              </Link>
              <Link to="/repairshop" className="font-medium text-slate-700 hover:text-orange-600 flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Mechanic Dashboard
              </Link>
              <button onClick={onShowAppointmentForm} className="font-medium text-slate-700 hover:text-orange-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Book Service
              </button>
            </nav>

            {/* Right: Cart + Always-Visible Hamburger */}
            <div className="flex items-center gap-4">
              <button
                onClick={onCartClick}
                className="relative p-2.5 rounded-lg hover:bg-orange-50 text-slate-700 hover:text-orange-600 transition"
                aria-label={`Cart (${itemCount})`}
              >
                <ShoppingCart className="h-6 w-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </button>

              {/* Hamburger — visible on ALL screens */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-2.5 rounded-lg hover:bg-slate-100 transition"
                aria-label="Open menu"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Side Drawer Menu — no longer full-screen */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50" 
            onClick={() => setIsMenuOpen(false)} 
          />

          {/* Menu Panel - Right-aligned drawer with max width */}
          <div className="absolute right-0 top-0 h-full w-[90vw] sm:w-[80vw] md:w-[600px] max-w-md bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Menu</h2>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-3 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Quick Links */}
              <div>
                <h3 className="font-bold text-slate-900 mb-4">Quick Links</h3>
                <div className="space-y-2">
                  {[
                    { icon: Package, label: 'Shop Parts', onClick: () => onViewChange('shop') },
                    { icon: MapPin, label: 'Find Mechanics', onClick: () => onViewChange('mechanics') },
                    { icon: ScanLine, label: 'Part Identifier', to: '/part-identifier' },
                    { icon: Wrench, label: 'Mechanic Dashboard', to: '/repairshop' },
                    { icon: Calendar, label: 'Book Service', onClick: onShowAppointmentForm },
                  ].map((item, i) => (
                    <Link 
                      key={i} 
                      to={item.to || '#'}
                      onClick={() => {
                        if (item.onClick) item.onClick();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition"
                    >
                      <item.icon className="w-5 h-5 text-slate-600" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="font-bold text-slate-900 mb-4">Categories</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => handleCatClick(null)}
                    className={`w-full text-left p-4 rounded-xl transition ${
                      selectedCategory === null 
                        ? 'bg-orange-50 text-orange-600' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium">All Categories</div>
                  </button>

                  {CATEGORIES.map(cat => (
                    <div key={cat.id} className="border-b border-slate-100 last:border-0">
                      <button
                        onClick={() => toggleCat(cat.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          {cat.icon}
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <ChevronDown className={`w-5 h-5 transition-transform ${expandedCats.includes(cat.id) ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedCats.includes(cat.id) && (
                        <div className="pb-3 px-4">
                          {cat.subs.map((sub, i) => (
                            <button
                              key={i}
                              onClick={() => handleCatClick(cat.id)}
                              className="block w-full text-left py-2.5 px-6 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition text-sm"
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Account */}
              <div className="border-t pt-6">
                <h3 className="font-bold text-slate-900 mb-4">Account</h3>
                <div className="space-y-2">
                  {[
                    { icon: User, label: 'Profile' },
                    { icon: ShoppingBag, label: 'My Orders' },
                    { icon: Settings, label: 'Settings' },
                    { icon: LogOut, label: 'Logout', color: 'text-red-600' },
                  ].map((item, i) => (
                    <button 
                      key={i} 
                      className={`w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition ${item.color || ''}`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}