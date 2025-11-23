/**
 * Professional Repair Shop Locator Page
 * Features: Map integration, location-aware search, responsive layout
 */

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import {
  Navigation,
  Search,
  Loader2,
  AlertCircle,
  MapPin,
  Phone,
  Wrench,
  CheckCircle2,
  X,
} from 'lucide-react';
import { supabase, RepairShop } from '../../lib/supabase';
import { RepairShopCard } from './RepairShopCard';
import { motion, AnimatePresence } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ── Custom Icons ───────────────────────────────────────────────

// User location marker (pulsing orange dot)
const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="
      background: #ea580c;
      width: 32px; height: 32px;
      border-radius: 50%;
      border: 4px solid white;
      box-shadow: 0 4px 16px rgba(234, 88, 12, 0.5);
      animation: pulse 2s infinite;
    "></div>
    <style>
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.5); }
        70% { box-shadow: 0 0 0 16px rgba(234, 88, 12, 0); }
        100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0); }
      }
    </style>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Standard repair shop marker
const shopIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [0, -46],
});

// ── Map Controller ─────────────────────────────────────────────

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
}

// ── Utilities ───────────────────────────────────────────────────

type UserLocation = { latitude: number; longitude: number };

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// ── Main Component ──────────────────────────────────────────────

export function RepairShopLocator() {
  const [shops, setShops] = useState<RepairShop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedShop, setSelectedShop] = useState<RepairShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const mapCenter: [number, number] = selectedShop
    ? [selectedShop.latitude, selectedShop.longitude]
    : userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : defaultCenter;

  // Fetch repair shops on mount
  useEffect(() => {
    const fetchShops = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('repair_shops')
        .select('*')
        .order('rating', { ascending: false });

      if (error) {
        console.error('Failed to load shops:', error);
        setShops([]);
      } else {
        setShops(data || []);
      }
      setLoading(false);
    };

    fetchShops();
  }, []);

  // Filter and sort shops based on search and location
  const filteredShops = useMemo(() => {
    let result = [...shops];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((shop) =>
        [shop.name, shop.city, shop.state, shop.specialties, shop.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    if (userLocation) {
      result = result
        .map((shop) => ({
          ...shop,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            shop.latitude,
            shop.longitude
          ),
        }))
        .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }

    return result;
  }, [shops, searchQuery, userLocation]);

  // Get user's current location
  const getUserLocation = () => {
    setGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setGettingLocation(false);
      },
      () => {
        setLocationError('Location access denied. Please enable location permissions.');
        setGettingLocation(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 text-white"
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className="relative container mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
          <motion.h1
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-yellow-300 to-orange-500"
          >
            Find Trusted Mechanics Near You
          </motion.h1>
          <p className="text-lg sm:text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto px-2">
            Verified shops • Real reviews • Transparent pricing
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {['Verified Shops', '5-Star Rated', 'Warranty Protected'].map((badge) => (
              <span
                key={badge}
                className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2.5 rounded-full text-sm font-medium"
              >
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                {badge}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 py-10 md:py-12 max-w-7xl">
        {/* Search Bar */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 md:p-8 mb-10 border border-white/20"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-end">
            <div className="md:col-span-2 relative">
              <Search
                className="absolute left-4 top-4 w-5 h-5 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by shop name, service, city..."
                aria-label="Search repair shops"
                className="w-full pl-12 pr-10 py-4 text-base md:text-lg rounded-xl bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <button
              onClick={getUserLocation}
              disabled={gettingLocation}
              aria-label={gettingLocation ? 'Locating...' : 'Use current location'}
              className="group flex items-center justify-center gap-2.5 px-6 py-4 md:px-8 md:py-5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold rounded-xl md:rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {gettingLocation ? (
                <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
              ) : (
                <Navigation className="w-5 h-5 md:w-6 md:h-6 group-hover:animate-pulse" />
              )}
              <span className="text-base md:text-lg">
                {gettingLocation ? 'Locating...' : 'Use My Location'}
              </span>
            </button>
          </div>

          <AnimatePresence>
            {locationError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-3 md:p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800"
                role="alert"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{locationError}</span>
              </motion.div>
            )}
            {userLocation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 md:p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800"
              >
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="font-medium">Showing shops near you — sorted by distance</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Map & Results */}
          <div className="lg:col-span-2 space-y-8">
            {/* Map */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl overflow-hidden shadow-xl border border-slate-200"
            >
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-4 md:px-8 md:py-5 flex items-center justify-between">
                <h3 className="text-xl md:text-2xl font-bold flex items-center gap-2.5">
                  <MapPin className="w-6 h-6" />
                  Interactive Map
                </h3>
                <span className="text-sm opacity-90">{filteredShops.length} shops</span>
              </div>
              <div style={{ height: '520px' }}>
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <MapController center={mapCenter} />
                  {userLocation && (
                    <Marker
                      position={[userLocation.latitude, userLocation.longitude]}
                      icon={userIcon}
                    >
                      <Popup>You are here</Popup>
                    </Marker>
                  )}
                  {filteredShops.map((shop) => (
                    <Marker
                      key={shop.id}
                      position={[shop.latitude, shop.longitude]}
                      icon={shopIcon}
                      eventHandlers={{ click: () => setSelectedShop(shop) }}
                    >
                      <Popup>
                        <div className="p-2.5">
                          <h4 className="font-semibold text-lg text-orange-700">{shop.name}</h4>
                          <p className="text-sm text-slate-600">{shop.address}</p>
                          {shop.phone && (
                            <a
                              href={`tel:${shop.phone}`}
                              className="mt-2 inline-flex items-center gap-1.5 text-orange-600 font-medium hover:underline"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {shop.phone}
                            </a>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </motion.div>

            {/* Shop List */}
            <div>
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-2xl md:text-3xl font-bold text-slate-900 mb-6"
              >
                {filteredShops.length} {filteredShops.length === 1 ? 'Shop' : 'Shops'} Found
              </motion.h2>

              {loading ? (
                <div className="space-y-5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-white/70 backdrop-blur rounded-xl p-6 shadow-md animate-pulse"
                    >
                      <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : filteredShops.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 bg-white/70 backdrop-blur rounded-2xl shadow-lg"
                >
                  <div className="bg-slate-200 border-2 border-dashed rounded-xl w-24 h-24 mx-auto mb-5" />
                  <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">No shops found</h3>
                  <p className="text-slate-600">Try adjusting your search or location</p>
                </motion.div>
              ) : (
                <motion.div className="space-y-5">
                  <AnimatePresence>
                    {filteredShops.map((shop) => (
                      <motion.div
                        key={shop.id}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                      >
                        <RepairShopCard
                          shop={shop}
                          distance={
                            userLocation
                              ? calculateDistance(
                                  userLocation.latitude,
                                  userLocation.longitude,
                                  shop.latitude,
                                  shop.longitude
                                )
                              : undefined
                          }
                          onViewMap={() => {
                            setSelectedShop(shop);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-6 md:p-8 sticky top-6 space-y-7"
            >
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-5 flex items-center gap-2.5">
                  <Wrench className="w-7 h-7 text-orange-600" />
                  Pro Tips
                </h3>
                <div className="space-y-4">
                  {[
                    'Look for shops with 4.5+ stars from recent reviews',
                    'Ask about warranty on parts AND labor',
                    'Get everything in writing before work begins',
                    'Verified shops have passed our quality audit',
                    'Good mechanics explain repairs in plain English',
                  ].map((tip, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
                        {i + 1}
                      </div>
                      <p className="text-slate-700 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 text-center">
                <p className="text-sm text-slate-600 mb-1.5">Need help choosing?</p>
                <p className="text-lg md:text-xl font-bold text-orange-600">1-800-MY-GARAGE</p>
                <p className="text-xs text-slate-500">Mon–Fri 8AM–8PM EST</p>
              </div>
            </motion.div>
          </aside>
        </div>
      </div>
    </div>
  );
}