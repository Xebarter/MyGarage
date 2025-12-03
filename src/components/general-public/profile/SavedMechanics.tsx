import { useState } from 'react';
import { Star, MapPin, Phone, Clock, Wrench, MessageSquare, Heart, ArrowLeft } from 'lucide-react';

interface Mechanic {
  id: string;
  name: string;
  specialty: string[];
  rating: number;
  reviewCount: number;
  location: string;
  distance: string;
  phone: string;
  availability: string;
  isFavorite: boolean;
}

interface SavedMechanicsProps {
  onBack?: () => void;
}

export function SavedMechanics({ onBack }: SavedMechanicsProps) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([
    {
      id: '1',
      name: 'John Smith',
      specialty: ['Engine Repair', 'Brake Services'],
      rating: 4.8,
      reviewCount: 124,
      location: '123 Auto St, Detroit, MI',
      distance: '2.5 miles',
      phone: '(555) 123-4567',
      availability: 'Mon-Fri: 8AM-6PM',
      isFavorite: true
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      specialty: ['Tire Services', 'Oil Changes'],
      rating: 4.9,
      reviewCount: 98,
      location: '456 Garage Ave, Detroit, MI',
      distance: '3.2 miles',
      phone: '(555) 987-6543',
      availability: 'Tue-Sat: 9AM-7PM',
      isFavorite: true
    },
    {
      id: '3',
      name: 'Mike Davis',
      specialty: ['Electrical Systems', 'Diagnostics'],
      rating: 4.7,
      reviewCount: 87,
      location: '789 Mechanic Blvd, Detroit, MI',
      distance: '1.8 miles',
      phone: '(555) 456-7890',
      availability: 'Mon-Sun: 7AM-8PM',
      isFavorite: true
    }
  ]);

  const toggleFavorite = (id: string) => {
    setMechanics(mechanics.map(mechanic => 
      mechanic.id === id 
        ? { ...mechanic, isFavorite: !mechanic.isFavorite } 
        : mechanic
    ));
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center mb-6">
        {onBack && (
          <button 
            onClick={onBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
            aria-label="Back to profile"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-900">Saved Mechanics</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Favorite Mechanics</h2>
            <p className="text-slate-600 text-sm">
              Your saved mechanics for quick booking
            </p>
          </div>
        </div>

        {/* Mechanics List */}
        <div className="divide-y divide-slate-200">
          {mechanics.filter(m => m.isFavorite).length === 0 ? (
            <div className="text-center py-12">
              <Heart className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No saved mechanics</h3>
              <p className="mt-1 text-sm text-slate-500">
                You haven't saved any mechanics yet.
              </p>
            </div>
          ) : (
            mechanics.filter(m => m.isFavorite).map((mechanic) => (
              <div key={mechanic.id} className="px-6 py-5 hover:bg-slate-50 transition">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center">
                      <Wrench className="text-orange-600 w-8 h-8" />
                    </div>
                  </div>
                  
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-slate-900">{mechanic.name}</h3>
                        <div className="flex items-center mt-1">
                          <div className="flex">
                            {renderStars(mechanic.rating)}
                          </div>
                          <span className="ml-2 text-sm text-slate-600">
                            {mechanic.rating} ({mechanic.reviewCount} reviews)
                          </span>
                        </div>
                        
                        <div className="mt-2 flex flex-wrap gap-2">
                          {mechanic.specialty.map((spec, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                        
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center text-sm text-slate-600">
                            <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            {mechanic.location} ({mechanic.distance})
                          </div>
                          <div className="flex items-center text-sm text-slate-600">
                            <Phone className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            {mechanic.phone}
                          </div>
                          <div className="flex items-center text-sm text-slate-600">
                            <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            {mechanic.availability}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button 
                          onClick={() => toggleFavorite(mechanic.id)}
                          className="p-2 rounded-full hover:bg-slate-100"
                        >
                          <Heart 
                            className={`h-5 w-5 ${mechanic.isFavorite ? 'text-red-500 fill-current' : 'text-slate-400'}`} 
                          />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-3">
                      <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Book Service
                      </button>
                      <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
                        <Phone className="h-4 w-4 mr-2" />
                        Call Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}