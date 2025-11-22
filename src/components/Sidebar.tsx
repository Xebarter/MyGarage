import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  MapPin,
  Tag,
  Menu,
  Car,
  Gauge,
  Wrench,
  Battery,
  Snowflake,
  Shield,
  Zap,
  Camera
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon?: React.ReactNode;
  subcategories?: Category[];
}

const AUTOMOTIVE_CATEGORIES: Category[] = [
  {
    id: 'engine',
    name: 'Engine System',
    icon: <Car className="w-4 h-4" />,
    subcategories: [
      { id: 'engine-core', name: 'Engine Core Components' },
      { id: 'gaskets', name: 'Gaskets, Seals & Fasteners' },
      { id: 'belts-hoses', name: 'Belts, Tensioners & Hoses' },
      { id: 'fuel', name: 'Fuel & Injection System' },
      { id: 'ignition', name: 'Ignition System' },
      { id: 'air-intake', name: 'Air Intake & Forced Induction' },
      { id: 'exhaust', name: 'Exhaust & Emission Control' },
      { id: 'cooling', name: 'Cooling System' },
      { id: 'lubrication', name: 'Lubrication System' },
    ],
  },
  {
    id: 'transmission',
    name: 'Transmission & Drivetrain',
    icon: <Gauge className="w-4 h-4" />,
    subcategories: [
      { id: 'manual', name: 'Manual Transmission & Clutch' },
      { id: 'automatic', name: 'Automatic Transmission' },
      { id: 'cvt-dct', name: 'CVT & Dual-Clutch' },
      { id: 'driveline', name: 'Driveline & Differentials' },
    ],
  },
  {
    id: 'suspension',
    name: 'Suspension & Steering',
    icon: <Wrench className="w-4 h-4" />,
    subcategories: [
      { id: 'front-susp', name: 'Front Suspension' },
      { id: 'rear-susp', name: 'Rear Suspension' },
      { id: 'steering', name: 'Steering System' },
    ],
  },
  {
    id: 'brakes',
    name: 'Braking System',
    icon: <div className="w-4 h-4 rounded-full border-2 border-red-600" />,
    subcategories: [
      { id: 'disc', name: 'Disc Brakes' },
      { id: 'drum', name: 'Drum Brakes' },
      { id: 'brake-control', name: 'Brake Hydraulics & Safety' },
    ],
  },
  {
    id: 'wheels',
    name: 'Wheels & Tyres',
    icon: <div className="w-4 h-4 rounded-full bg-black" />,
    subcategories: [
      { id: 'rims', name: 'Rims & Covers' },
      { id: 'tyres', name: 'Tyres' },
      { id: 'bearings', name: 'Wheel Bearings & Hubs' },
      { id: 'hardware', name: 'Wheel Hardware & TPMS' },
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical & Electronic Systems',
    icon: <Battery className="w-4 h-4" />,
    subcategories: [
      { id: 'starting', name: 'Starting & Charging' },
      { id: 'sensors', name: 'Sensors' },
      { id: 'ecu', name: 'Control Units' },
      { id: 'lighting', name: 'Lighting' },
      { id: 'wiring', name: 'Wiring & Accessories' },
    ],
  },
  {
    id: 'body',
    name: 'Body & Structural Components',
    icon: <div className="w-4 h-4 border border-slate-600 rounded" />,
    subcategories: [
      { id: 'panels', name: 'Body Panels' },
      { id: 'glass', name: 'Glass & Mirrors' },
      { id: 'trim', name: 'Exterior Trim' },
    ],
  },
  {
    id: 'interior',
    name: 'Interior & Cabin Systems',
    icon: <div className="w-4 h-4 bg-slate-300 rounded" />,
    subcategories: [
      { id: 'seating', name: 'Seating & Safety' },
      { id: 'dashboard', name: 'Dashboard & Controls' },
      { id: 'interior-trim', name: 'Trim & Carpets' },
    ],
  },
  {
    id: 'hvac',
    name: 'Climate & HVAC System',
    icon: <Snowflake className="w-4 h-4" />,
    subcategories: [
      { id: 'ac-compressor', name: 'A/C Compressor & Clutch' },
      { id: 'condenser', name: 'Condenser & Radiator' },
      { id: 'evaporator', name: 'Evaporator & Expansion Valve' },
      { id: 'heater-core', name: 'Heater Core & Blower Motor' },
      { id: 'hvac-controls', name: 'Climate Control Modules & Sensors' },
      { id: 'ducts-vents', name: 'Ducts, Vents & Actuators' },
      { id: 'refrigerant', name: 'Refrigerant, Oil & Leak Detection' },
      { id: 'cabin-filters', name: 'Cabin Air Filters' },
    ],
  },
  {
    id: 'safety',
    name: 'Safety & ADAS',
    icon: <Shield className="w-4 h-4" />,
    subcategories: [
      { id: 'airbags', name: 'Airbags & Seat Belt Pretensioners' },
      { id: 'abs-esp', name: 'ABS, ESP & Traction Control' },
      { id: 'adas-sensors', name: 'Cameras, Radar & LiDAR Sensors' },
      { id: 'lane-assist', name: 'Lane Keep Assist & Blind Spot' },
      { id: 'acc', name: 'Adaptive Cruise Control' },
      { id: 'parking-sensors', name: 'Parking Sensors & Cameras' },
      { id: 'seatbelts', name: 'Seat Belts & Components' },
    ],
  },
  {
    id: 'service',
    name: 'Service & Maintenance Parts',
    icon: <Wrench className="w-4 h-4" />,
    subcategories: [
      { id: 'oils-fluids', name: 'Oils, Fluids & Additives' },
      { id: 'filters', name: 'Filters (Oil, Fuel, Air, Transmission)' },
      { id: 'spark-plugs', name: 'Spark Plugs & Glow Plugs' },
      { id: 'wipers', name: 'Wiper Blades & Washers' },
      { id: 'batteries', name: 'Batteries & Accessories' },
      { id: 'bulbs-fuses', name: 'Bulbs, Fuses & Relays' },
      { id: 'service-tools', name: 'Service Tools & Equipment' },
      { id: 'belts-chains', name: 'Timing Belts, Chains & Kits' },
    ],
  },
  {
    id: 'performance',
    name: 'Performance & Upgrades',
    icon: <Zap className="w-4 h-4" />,
    subcategories: [
      { id: 'tuning-ecu', name: 'ECU Tuning & Programmers' },
      { id: 'intakes', name: 'Cold Air Intakes & Filters' },
      { id: 'exhaust-perf', name: 'Performance Exhaust Systems' },
      { id: 'turbo-super', name: 'Turbochargers & Superchargers' },
      { id: 'suspension-perf', name: 'Coilovers & Performance Suspension' },
      { id: 'big-brakes', name: 'Big Brake Kits' },
      { id: 'cams-valvetrain', name: 'Camshafts & Valvetrain' },
      { id: 'intercoolers', name: 'Intercoolers & Piping' },
      { id: 'engine-internals', name: 'Forged Internals & Stroker Kits' },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  currentView: 'shop' | 'mechanics';
  setCurrentView: (view: 'shop' | 'mechanics') => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  showFeaturedOnly: boolean;
  setShowFeaturedOnly: (featured: boolean) => void;
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
}: SidebarProps) {
  const [expandedMain, setExpandedMain] = useState<string[]>([]);
  const location = useLocation();

  const toggleMain = (id: string) => {
    setExpandedMain((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <>
      {/* Mobile overlay/backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      <aside
        className={`h-screen bg-white shadow-xl z-10 flex flex-col transition-all duration-300 ${isOpen ? 'w-80' : 'w-20'
          } ${isOpen ? 'flex absolute md:relative inset-y-0 z-50 md:z-10' : 'hidden md:flex'}`}
      >
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">MyGarage</h1>
          <button onClick={toggleSidebar} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Top Navigation */}
        <nav className="p-4 space-y-1 flex-shrink-0">
          <button
            onClick={() => setCurrentView('shop')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${currentView === 'shop'
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'text-slate-700 hover:bg-slate-50 hover:text-orange-600'
              }`}
          >
            <Package className="w-5 h-5" />
            {isOpen && <span className="font-medium">Shop Parts</span>}
          </button>
          <button
            onClick={() => setCurrentView('mechanics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${currentView === 'mechanics'
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'text-slate-700 hover:bg-slate-50 hover:text-orange-600'
              }`}
          >
            <MapPin className="w-5 h-5" />
            {isOpen && <span className="font-medium">Find Mechanics</span>}
          </button>
          <Link
            to="/part-identifier"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
              location.pathname === '/part-identifier'
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'text-slate-700 hover:bg-slate-50 hover:text-orange-600'
            }`}
          >
            <Camera className="w-5 h-5" />
            {isOpen && <span className="font-medium">Part Identifier</span>}
          </Link>
        </nav>

        {/* Categories Section - Only in Shop View */}
        {currentView === 'shop' && (
          <div className="flex-grow overflow-y-auto px-4 pb-20">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5" />
                {isOpen && 'Categories'}
              </h3>

              {/* All Parts Button */}
              {isOpen && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-3 ${!selectedCategory
                      ? 'bg-orange-50 text-orange-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <Package className="w-4 h-4" />
                  All Parts
                </button>
              )}

              {/* Main Categories */}
              <div className="space-y-1">
                {AUTOMOTIVE_CATEGORIES.map((mainCat) => (
                  <div key={mainCat.id}>
                    <button
                      onClick={() => toggleMain(mainCat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${expandedMain.includes(mainCat.id)
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {mainCat.icon || <div className="w-4 h-4" />}
                        {isOpen && <span>{mainCat.name}</span>}
                      </div>
                      {isOpen &&
                        mainCat.subcategories &&
                        mainCat.subcategories.length > 0 && (
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${expandedMain.includes(mainCat.id) ? 'rotate-90' : ''
                              }`}
                          />
                        )}
                    </button>

                    {/* Subcategories */}
                    {isOpen &&
                      expandedMain.includes(mainCat.id) &&
                      mainCat.subcategories &&
                      mainCat.subcategories.length > 0 && (
                        <div className="ml-6 mt-1 space-y-1 border-l-2 border-slate-200 pl-4">
                          {mainCat.subcategories.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => setSelectedCategory(sub.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === sub.id
                                  ? 'bg-orange-50 text-orange-700 font-medium'
                                  : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {isOpen && (
          <div className="mt-auto border-t border-slate-200 p-4 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>© {new Date().getFullYear()} MyGarage</span>
              <span>v1.0.0</span>
            </div>
          </div>
        )}
      </aside>

      {/* Desktop Toggle */}
      <button
        onClick={toggleSidebar}
        className="fixed left-4 top-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-lg z-40 hover:shadow-xl transition-shadow hidden md:block"
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        ) : (
          <Menu className="w-5 h-5 text-slate-700" />
        )}
      </button>

      {/* Mobile Toggle */}
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed left-4 top-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-lg z-40 md:hidden"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
      )}
    </>
  );
}