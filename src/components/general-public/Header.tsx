import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Menu as MenuIcon,
  X,
  Wrench,
  Package,
  Car,
  Gauge,
  Battery,
  Snowflake,
  Shield,
  Zap,
  User,
  FileText,
  Calendar,
  Settings,
  LogOut,
  CreditCard,
  Truck,
  ChevronDown,
  Scan,
} from 'lucide-react';

interface HeaderProps {
  cartItems: any[];
  onCartClick: () => void;
  currentView: 'shop' | 'mechanics' | 'vehicles' | 'profile';
  onViewChange: (view: 'shop' | 'mechanics' | 'vehicles') => void;
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

const CATEGORIES = [
  {
    id: 'engine',
    name: 'Engine System',
    icon: <Car className="w-5 h-5" />,
    subs: ['Engine Blocks', 'Gaskets & Seals', 'Belts & Hoses', 'Fuel System', 'Ignition', 'Intake & Exhaust', 'Cooling', 'Oil System']
  },
  {
    id: 'transmission',
    name: 'Transmission & Drivetrain',
    icon: <Gauge className="w-5 h-5" />,
    subs: ['Clutch Kits', 'Automatic Transmission', 'CVT/DCT', 'Driveshafts & Axles']
  },
  {
    id: 'suspension',
    name: 'Suspension & Steering',
    icon: <Wrench className="w-5 h-5" />,
    subs: ['Shocks & Struts', 'Control Arms', 'Steering Racks', 'Bushings']
  },
  {
    id: 'brakes',
    name: 'Braking System',
    icon: <div className="w-5 h-5 rounded-full border-2 border-red-600" />,
    subs: ['Brake Pads', 'Rotors', 'Calipers', 'Brake Lines']
  },
  {
    id: 'wheels',
    name: 'Wheels & Tyres',
    icon: <div className="w-5 h-5 rounded-full bg-black" />,
    subs: ['Alloy Wheels', 'Tyres', 'TPMS Sensors', 'Lug Nuts']
  },
  {
    id: 'electrical',
    name: 'Electrical Systems',
    icon: <Battery className="w-5 h-5" />,
    subs: ['Alternators', 'Starters', 'Sensors', 'ECUs', 'Lighting']
  },
  {
    id: 'hvac',
    name: 'Climate & HVAC',
    icon: <Snowflake className="w-5 h-5" />,
    subs: ['A/C Compressors', 'Heater Cores', 'Blower Motors', 'Cabin Filters']
  },
  {
    id: 'safety',
    name: 'Safety & ADAS',
    icon: <Shield className="w-5 h-5" />,
    subs: ['Airbags', 'ABS Modules', 'Cameras & Radar', 'Seatbelts']
  },
  {
    id: 'service',
    name: 'Service & Maintenance',
    icon: <Zap className="w-5 h-5" />,
    subs: ['Oils & Fluids', 'Filters', 'Spark Plugs', 'Wipers', 'Batteries']
  },
  {
    id: 'performance',
    name: 'Performance Upgrades',
    icon: <Zap className="w-5 h-5 text-orange-600" />,
    subs: ['ECU Tuning', 'Intakes', 'Exhausts', 'Suspension Kits', 'Big Brakes']
  },
];

const NAV_ITEMS = [
  { id: 'shop', label: 'Shop Parts', icon: <Package className="w-5 h-5" />, path: '/' },
  { id: 'mechanics', label: 'Find Mechanics', icon: <Wrench className="w-5 h-5" />, path: '/mechanics' },
  { id: 'part-identifier', label: 'Part Identifier', icon: <Scan className="w-5 h-5" />, path: '/part-identifier' },
];

const PROFILE_LINKS = [
  { label: 'Profile Overview', icon: <User className="w-5 h-5" />, path: '/profile' },
  { label: 'My Vehicles', icon: <Car className="w-5 h-5" />, path: '/vehicles' },
  { label: 'Documents & Insurance', icon: <FileText className="w-5 h-5" />, path: '/profile/documents' },
  { label: 'Appointments', icon: <Calendar className="w-5 h-5" />, path: '/profile/appointments' },
  { label: 'Payment Methods', icon: <CreditCard className="w-5 h-5" />, path: '/profile/payments' },
  { label: 'Delivery Addresses', icon: <Truck className="w-5 h-5" />, path: '/profile/addresses' },
  { label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/profile/settings' },
];

export function Header({
  cartItems,
  onCartClick,
  currentView,
  onViewChange,
  selectedCategory,
  onCategorySelect,
}: HeaderProps) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>([]);

  const profileRef = useRef<HTMLDivElement>(null);

  const itemCount = cartItems.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  const toggleCat = (id: string) => {
    setExpandedCats(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleMainNav = (view: any, path: string) => {
    if (view !== 'part-identifier') onViewChange(view);
    navigate(path);
    setIsMenuOpen(false);
  };

  const handleCategoryClick = (catId: string | null) => {
    onCategorySelect(catId);
    navigate('/');
    setIsMenuOpen(false);
  };

  const handleProfileNav = (path: string) => {
    navigate(path);
    setIsProfileOpen(false);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    setIsProfileOpen(false);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="bg-orange-600 text-white p-2 rounded-lg">
                  <Wrench className="h-6 w-6" />
                </div>
                <span className="text-xl sm:text-2xl font-bold text-gray-900">MyGarage</span>
              </Link>
            </div>

            {/* Desktop Navigation - Hidden on small screens */}
            <nav className="hidden lg:flex items-center space-x-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMainNav(item.id, item.path)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    currentView === item.id
                      ? 'bg-orange-50 text-orange-600 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-orange-600'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Right Side Icons */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Profile Dropdown */}
              <div className="relative hidden sm:block" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="p-2.5 rounded-xl hover:bg-orange-50 transition"
                  aria-label="Account menu"
                >
                  <User className="h-6 w-6" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-100">
                      <p className="font-medium text-gray-900">My Account</p>
                      <p className="text-xs text-gray-500 truncate">customer@example.com</p>
                    </div>
                    <div className="py-2">
                      {PROFILE_LINKS.map((link) => (
                        <button
                          key={link.path}
                          onClick={() => handleProfileNav(link.path)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition"
                        >
                          {link.icon}
                          <span>{link.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-100">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition font-medium"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart */}
              <button
                onClick={onCartClick}
                className="relative p-2.5 rounded-xl hover:bg-orange-50 transition"
              >
                <ShoppingCart className="h-6 w-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-2.5 rounded-xl hover:bg-gray-100 transition lg:hidden"
              >
                <MenuIcon className="h-6 w-6" />
              </button>

              {/* Desktop Menu Button (only shows when nav is hidden) */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="hidden lg:block p-2.5 rounded-xl hover:bg-gray-100 transition"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile & Desktop Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)} />
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Menu</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-3 rounded-xl hover:bg-gray-100">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Main Navigation */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Navigation
                </h3>
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMainNav(item.id, item.path)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl mb-2 transition ${
                      currentView === item.id ? 'bg-orange-50 text-orange-600 font-medium' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {item.icon}
                      <span className="text-lg font-medium">{item.label}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Shop by Category */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Shop by Category
                </h3>

                <button
                  onClick={() => handleCategoryClick(null)}
                  className={`w-full text-left p-4 rounded-xl transition mb-3 ${
                    !selectedCategory ? 'bg-orange-50 text-orange-600 font-medium' : 'hover:bg-gray-50'
                  }`}
                >
                  All Parts
                </button>

                {CATEGORIES.map((cat) => (
                  <div key={cat.id} className="mb-3">
                    <button
                      onClick={() => toggleCat(cat.id)}
                      className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-4">
                        {cat.icon}
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 transition-transform ${expandedCats.includes(cat.id) ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {expandedCats.includes(cat.id) && (
                      <div className="ml-8 mt-2 space-y-1 pb-3 border-l-2 border-orange-100 pl-4">
                        {cat.subs.map((sub) => (
                          <button
                            key={sub}
                            onClick={() => handleCategoryClick(cat.id)}
                            className="block w-full text-left py-2 text-sm text-gray-600 hover:text-orange-600 transition"
                          >
                            {sub}
                          </button>
                        ))}
                        <button
                          onClick={() => handleCategoryClick(cat.id)}
                          className="block w-full text-left py-3 mt-2 text-sm font-semibold text-orange-600 hover:text-orange-700 border-t border-orange-100 pt-3"
                        >
                          View All {cat.name} →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* My Account */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  My Account
                </h3>
                {PROFILE_LINKS.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => handleProfileNav(link.path)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition"
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </button>
                ))}
              </div>

              <div className="border-t pt-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-4 rounded-xl text-red-600 hover:bg-red-50 font-medium"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}