import { MapPin, Phone, Mail, Star, CheckCircle, ExternalLink, Clock } from 'lucide-react';
import { RepairShop } from '../lib/supabase';

type RepairShopCardProps = {
  shop: RepairShop;
  distance?: number;
  onViewMap: (shop: RepairShop) => void;
};

export function RepairShopCard({ shop, distance, onViewMap }: RepairShopCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="relative h-48 overflow-hidden bg-slate-100">
        <img
          src={shop.image_url}
          alt={shop.name}
          className="w-full h-full object-cover"
        />
        {shop.verified && (
          <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Verified
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-xl text-slate-900">{shop.name}</h3>
          {shop.rating > 0 && (
            <div className="flex items-center gap-1 bg-orange-100 px-2 py-1 rounded-lg">
              <Star className="w-4 h-4 fill-orange-500 text-orange-500" />
              <span className="font-bold text-sm text-orange-700">{shop.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{shop.description}</p>

        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2 text-sm text-slate-700">
            <MapPin className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <div>{shop.address}</div>
              <div>{shop.city}, {shop.state} {shop.zip_code}</div>
              {distance !== undefined && (
                <div className="text-orange-600 font-semibold mt-1">
                  {distance.toFixed(1)} miles away
                </div>
              )}
            </div>
          </div>

          {shop.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Phone className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <a href={`tel:${shop.phone}`} className="hover:text-orange-600 transition-colors">
                {shop.phone}
              </a>
            </div>
          )}

          {shop.hours && (
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <Clock className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>{shop.hours}</span>
            </div>
          )}
        </div>

        {shop.specialties && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {shop.specialties.split(',').slice(0, 3).map((specialty, index) => (
                <span
                  key={index}
                  className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded"
                >
                  {specialty.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t border-slate-200">
          <button
            onClick={() => onViewMap(shop)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
          >
            <MapPin className="w-4 h-4" />
            View Map
          </button>
          {shop.website && (
            <a
              href={shop.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
