import { useState } from 'react';
import { Star, User, Calendar, Wrench, MapPin, Edit, ArrowLeft } from 'lucide-react';

interface Review {
  id: string;
  date: string;
  service: string;
  shop: string;
  rating: number;
  comment: string;
  response?: string;
}

interface RatingsReviewsProps {
  onBack?: () => void;
}

export function RatingsReviews({ onBack }: RatingsReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: '1',
      date: '2023-06-15',
      service: 'Oil Change',
      shop: 'AutoCare Service Center',
      rating: 5,
      comment: 'Excellent service! Quick and professional. Will definitely come back.',
    },
    {
      id: '2',
      date: '2023-05-20',
      service: 'Tire Replacement',
      shop: 'TireMaster Shop',
      rating: 4,
      comment: 'Good service overall. The wait was a bit long, but the quality is great.',
      response: 'Thank you for your feedback! We apologize for the wait time and are glad you enjoyed our service.'
    },
    {
      id: '3',
      date: '2023-04-05',
      service: 'Brake Inspection',
      shop: 'Brake Experts',
      rating: 5,
      comment: 'Thorough inspection and fair pricing. Highly recommended!'
    }
  ]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  const ratingCounts = reviews.reduce((acc, review) => {
    acc[review.rating] = (acc[review.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

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
        <h1 className="text-2xl font-bold text-gray-900">Ratings & Reviews</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your Reviews</h2>
            <p className="text-slate-600 text-sm">
              View and manage your service reviews
            </p>
          </div>
        </div>

        {/* Rating Summary */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex flex-col md:flex-row items-center">
            <div className="text-center md:text-left mb-4 md:mb-0 md:mr-8">
              <div className="text-4xl font-bold text-slate-900">{averageRating.toFixed(1)}</div>
              <div className="flex justify-center md:justify-start mt-1">
                {renderStars(Math.round(averageRating))}
              </div>
              <div className="text-sm text-slate-600 mt-1">{reviews.length} reviews</div>
            </div>
            
            <div className="flex-1 w-full">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center mb-1">
                  <div className="w-10 text-sm text-slate-600">{stars} stars</div>
                  <div className="flex-1 mx-2">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-400 rounded-full" 
                        style={{ width: `${((ratingCounts[stars] || 0) / reviews.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-8 text-sm text-slate-600 text-right">{ratingCounts[stars] || 0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="divide-y divide-slate-200">
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No reviews yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                You haven't submitted any reviews yet.
              </p>
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="px-6 py-5 hover:bg-slate-50 transition">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center">
                      <User className="text-orange-600 w-6 h-6" />
                    </div>
                  </div>
                  
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center">
                          <h3 className="text-base font-medium text-slate-900">{review.service}</h3>
                          <span className="ml-3 text-sm text-slate-600">{new Date(review.date).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex items-center mt-1">
                          <div className="flex">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center text-sm text-slate-600">
                          <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                          {review.shop}
                        </div>
                      </div>
                      
                      <button className="p-2 rounded-full hover:bg-slate-100">
                        <Edit className="h-4 w-4 text-slate-500" />
                      </button>
                    </div>
                    
                    <div className="mt-3">
                      <p className="text-slate-700">{review.comment}</p>
                    </div>
                    
                    {review.response && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center">
                              <Wrench className="text-blue-600 w-4 h-4" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-blue-800">Response from {review.shop}</p>
                            <p className="text-sm text-blue-700 mt-1">{review.response}</p>
                          </div>
                        </div>
                      </div>
                    )}
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