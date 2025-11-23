import { useState, useEffect } from 'react';
import { supabase, RepairShop } from '../../lib/supabase';
import { MapPin, Navigation, RefreshCw } from 'lucide-react';

interface LiveLocationTrackerProps {
  repairShop: RepairShop;
  onUpdate?: (latitude: number, longitude: number) => void;
}

export function LiveLocationTracker({ repairShop, onUpdate }: LiveLocationTrackerProps) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: repairShop.latitude,
    longitude: repairShop.longitude
  });
  const [tracking, setTracking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    setLocation({
      latitude: repairShop.latitude,
      longitude: repairShop.longitude
    });
    setLastUpdated(repairShop.updated_at);
  }, [repairShop]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to retrieve your location');
      }
    );
  };

  const updateLocationInDatabase = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('repair_shops')
        .update({ 
          latitude: location.latitude, 
          longitude: location.longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', repairShop.id);

      if (error) throw error;

      setLastUpdated(new Date().toISOString());
      if (onUpdate) {
        onUpdate(location.latitude, location.longitude);
      }
      
      alert('Location updated successfully');
    } catch (err) {
      console.error('Error updating location:', err);
      alert('Failed to update location');
    } finally {
      setUpdating(false);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setTracking(true);
    
    // Watch position continuously
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
      },
      (error) => {
        console.error('Error tracking location:', error);
        alert('Error tracking location');
        stopTracking();
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
    );

    // Store watchId to stop tracking later
    (window as any).locationWatchId = watchId;
  };

  const stopTracking = () => {
    setTracking(false);
    if ((window as any).locationWatchId) {
      navigator.geolocation.clearWatch((window as any).locationWatchId);
      delete (window as any).locationWatchId;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <MapPin className="mr-2" />
        Live Location Tracker
      </h3>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Current Coordinates</span>
          <button
            onClick={getCurrentLocation}
            disabled={tracking || updating}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-500">Latitude</span>
            <span className="text-xs font-mono">{location.latitude.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Longitude</span>
            <span className="text-xs font-mono">{location.longitude.toFixed(6)}</span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          Last updated: {formatDate(lastUpdated)}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <button
          onClick={startTracking}
          disabled={tracking || updating}
          className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-colors ${
            tracking
              ? 'bg-green-100 text-green-800 cursor-default'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          <Navigation className="w-4 h-4 mr-2" />
          {tracking ? 'Tracking...' : 'Start Tracking'}
        </button>
        
        {tracking && (
          <button
            onClick={stopTracking}
            disabled={updating}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            Stop Tracking
          </button>
        )}
      </div>
      
      <button
        onClick={updateLocationInDatabase}
        disabled={updating || (
          location.latitude === repairShop.latitude && 
          location.longitude === repairShop.longitude
        )}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {updating ? 'Updating...' : 'Update Location'}
      </button>
      
      <div className="mt-4 text-xs text-gray-500">
        <p>Note: Enabling location tracking will continuously update your position while the app is open.</p>
      </div>
    </div>
  );
}