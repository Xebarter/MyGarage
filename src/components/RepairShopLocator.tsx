import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Navigation, Search, Loader2, AlertCircle } from 'lucide-react';
import { supabase, RepairShop } from '../lib/supabase';
import { RepairShopCard } from './RepairShopCard';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 11);
  }, [center, map]);
  return null;
}

type UserLocation = {
  latitude: number;
  longitude: number;
};

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function RepairShopLocator() {
  const [shops, setShops] = useState<RepairShop[]>([]);
  const [filteredShops, setFilteredShops] = useState<RepairShop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedShop, setSelectedShop] = useState<RepairShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const defaultCenter: [number, number] = [37.0902, -95.7129];
  const mapCenter: [number, number] = selectedShop
    ? [selectedShop.latitude, selectedShop.longitude]
    : userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : defaultCenter;

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    filterShops();
  }, [shops, searchQuery, userLocation]);

  async function fetchShops() {
    setLoading(true);
    const { data, error } = await supabase
      .from('repair_shops')
      .select('*')
      .order('rating', { ascending: false });

    if (error) {
      console.error('Error fetching repair shops:', error);
    } else {
      setShops(data || []);
    }
    setLoading(false);
  }

  function filterShops() {
    let filtered = [...shops];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (shop) =>
          shop.name.toLowerCase().includes(query) ||
          shop.city.toLowerCase().includes(query) ||
          shop.state.toLowerCase().includes(query) ||
          shop.specialties.toLowerCase().includes(query) ||
          shop.description.toLowerCase().includes(query)
      );
    }

    if (userLocation) {
      filtered = filtered
        .map((shop) => ({
          ...shop,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            shop.latitude,
            shop.longitude
          ),
        }))
        .sort((a, b) => a.distance - b.distance);
    }

    setFilteredShops(filtered);
  }

  function getUserLocation() {
    setGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationError('Unable to retrieve your location. Please check your browser permissions.');
        setGettingLocation(false);
      }
    );
  }

  function handleViewMap(shop: RepairShop) {
    setSelectedShop(shop);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-3">Find Repair Shops & Mechanics</h2>
          <p className="text-lg text-slate-300">
            Locate trusted automotive service centers near you
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, location, or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-900"
              />
            </div>
            <button
              onClick={getUserLocation}
              disabled={gettingLocation}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {gettingLocation ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Navigation className="w-5 h-5" />
              )}
              Use My Location
            </button>
          </div>

          {locationError && (
            <div className="mt-4 flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{locationError}</p>
            </div>
          )}

          {userLocation && (
            <div className="mt-4 text-sm text-slate-600">
              Showing results near your location
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8" style={{ height: '500px' }}>
              <MapContainer
                center={mapCenter}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController center={mapCenter} />
                {userLocation && (
                  <Marker position={[userLocation.latitude, userLocation.longitude]}>
                    <Popup>Your Location</Popup>
                  </Marker>
                )}
                {filteredShops.map((shop) => (
                  <Marker
                    key={shop.id}
                    position={[shop.latitude, shop.longitude]}
                  >
                    <Popup>
                      <div className="text-sm">
                        <h3 className="font-bold text-base mb-1">{shop.name}</h3>
                        <p className="text-slate-600 mb-2">{shop.address}</p>
                        {shop.phone && (
                          <p className="text-slate-700">
                            <a href={`tel:${shop.phone}`} className="text-orange-600 hover:underline">
                              {shop.phone}
                            </a>
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4 text-slate-900">
                {filteredShops.length} {filteredShops.length === 1 ? 'Shop' : 'Shops'} Found
              </h3>

              {loading ? (
                <div className="text-center py-16">
                  <Loader2 className="inline-block w-12 h-12 animate-spin text-orange-500" />
                  <p className="mt-4 text-slate-600">Loading repair shops...</p>
                </div>
              ) : filteredShops.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-md">
                  <p className="text-xl text-slate-600">No repair shops found</p>
                  <p className="text-slate-500 mt-2">Try adjusting your search</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredShops.map((shop) => (
                    <RepairShopCard
                      key={shop.id}
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
                      onViewMap={handleViewMap}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-8">
              <h3 className="text-xl font-bold mb-4 text-slate-900">Quick Tips</h3>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="text-orange-600">•</span>
                  <span>Click "Use My Location" to find shops near you</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-600">•</span>
                  <span>Search by specialty to find experts in specific services</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-600">•</span>
                  <span>Verified shops have been vetted by our team</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-600">•</span>
                  <span>Call ahead to check availability and pricing</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-600">•</span>
                  <span>Ask about warranties on parts and labor</span>
                </li>
              </ul>

              {selectedShop && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2">Selected Shop</h4>
                  <p className="text-sm text-slate-700">{selectedShop.name}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {selectedShop.city}, {selectedShop.state}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
