import { User, CreditCard, FileText, Calendar, Wrench, Star, Bell, Gift, MessageCircle, Activity, Car, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

interface ProfileOverviewProps {
  onBack?: () => void;
}

export function ProfileOverview({ onBack }: ProfileOverviewProps) {
  const profileSections: ProfileSection[] = [
    {
      id: 'profile',
      title: 'Profile & Security',
      description: 'Manage your personal information and security settings',
      icon: <User className="h-6 w-6" />,
      path: '/profile/details',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'wallet',
      title: 'Wallet & Payments',
      description: 'View your wallet balance and payment methods',
      icon: <CreditCard className="h-6 w-6" />,
      path: '/profile/wallet',
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 'documents',
      title: 'Documents & Insurance',
      description: 'Manage your vehicle documents and insurance policies',
      icon: <FileText className="h-6 w-6" />,
      path: '/profile/documents',
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      id: 'appointments',
      title: 'Appointments',
      description: 'View and manage your service appointments',
      icon: <Calendar className="h-6 w-6" />,
      path: '/profile/appointments',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'service-history',
      title: 'Service History',
      description: 'Track your vehicle service records',
      icon: <Wrench className="h-6 w-6" />,
      path: '/profile/service-history',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      id: 'mechanics',
      title: 'Saved Mechanics',
      description: 'View your favorite mechanics',
      icon: <User className="h-6 w-6" />,
      path: '/profile/mechanics',
      color: 'bg-indigo-100 text-indigo-600'
    },
    {
      id: 'reviews',
      title: 'Ratings & Reviews',
      description: 'See your reviews and ratings',
      icon: <Star className="h-6 w-6" />,
      path: '/profile/reviews',
      color: 'bg-pink-100 text-pink-600'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Manage your notification preferences',
      icon: <Bell className="h-6 w-6" />,
      path: '/profile/notifications',
      color: 'bg-teal-100 text-teal-600'
    },
    {
      id: 'referrals',
      title: 'Referrals & Rewards',
      description: 'Track your referrals and rewards',
      icon: <Gift className="h-6 w-6" />,
      path: '/profile/referrals',
      color: 'bg-cyan-100 text-cyan-600'
    },
    {
      id: 'messages',
      title: 'Messages & Support',
      description: 'View your messages and support tickets',
      icon: <MessageCircle className="h-6 w-6" />,
      path: '/profile/messages',
      color: 'bg-rose-100 text-rose-600'
    },
    {
      id: 'activity',
      title: 'Account Activity',
      description: 'Monitor your account activity and security events',
      icon: <Activity className="h-6 w-6" />,
      path: '/profile/activity',
      color: 'bg-violet-100 text-violet-600'
    },
    {
      id: 'vehicles',
      title: 'My Vehicles',
      description: 'Manage your vehicles',
      icon: <Car className="h-6 w-6" />,
      path: '/profile/vehicles',
      color: 'bg-emerald-100 text-emerald-600'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile Overview</h1>
        <p className="text-slate-600 mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {profileSections.map((section) => (
          <Link
            key={section.id}
            to={section.path}
            className="group block bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 overflow-hidden"
          >
            <div className="p-5">
              <div className={`inline-flex p-3 rounded-lg ${section.color} mb-4`}>
                {section.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                {section.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {section.description}
              </p>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center text-sm font-medium text-orange-600">
                <span>Manage</span>
                <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-bold">Need Help?</h3>
            <p className="mt-1 text-orange-100 max-w-lg">
              Visit our help center or contact support for assistance with your account.
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-white text-orange-600 font-medium rounded-lg hover:bg-orange-50 transition">
              Help Center
            </button>
            <button className="px-4 py-2 bg-orange-900 bg-opacity-30 text-white font-medium rounded-lg hover:bg-opacity-40 transition">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}