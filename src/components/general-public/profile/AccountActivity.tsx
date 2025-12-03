import { useState } from 'react';
import { Activity, LogIn, LogOut, Settings, CreditCard, User, Shield, ArrowLeft } from 'lucide-react';

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  ip: string;
  location: string;
  device: string;
  timestamp: string;
  type: 'login' | 'logout' | 'settings' | 'profile' | 'payment' | 'security';
}

interface AccountActivityProps {
  onBack?: () => void;
}

export function AccountActivity({ onBack }: AccountActivityProps) {
  const [filter, setFilter] = useState<'all' | 'login' | 'settings' | 'profile' | 'payment' | 'security'>('all');

  // Mock data
  const activities: ActivityLog[] = [
    {
      id: '1',
      action: 'Login',
      description: 'Successful login from Chrome on Windows',
      ip: '192.168.1.100',
      location: 'Detroit, MI',
      device: 'Chrome on Windows 10',
      timestamp: '2023-07-15T08:30:00Z',
      type: 'login'
    },
    {
      id: '2',
      action: 'Profile Update',
      description: 'Updated personal information',
      ip: '192.168.1.100',
      location: 'Detroit, MI',
      device: 'Chrome on Windows 10',
      timestamp: '2023-07-14T15:45:00Z',
      type: 'profile'
    },
    {
      id: '3',
      action: 'Payment Method Added',
      description: 'Added new credit card ending in 4242',
      ip: '192.168.1.100',
      location: 'Detroit, MI',
      device: 'Chrome on Windows 10',
      timestamp: '2023-07-14T11:20:00Z',
      type: 'payment'
    },
    {
      id: '4',
      action: 'Password Changed',
      description: 'Changed account password',
      ip: '192.168.1.100',
      location: 'Detroit, MI',
      device: 'Chrome on Windows 10',
      timestamp: '2023-07-12T09:15:00Z',
      type: 'security'
    },
    {
      id: '5',
      action: 'Logout',
      description: 'Logged out from Chrome on Windows',
      ip: '192.168.1.100',
      location: 'Detroit, MI',
      device: 'Chrome on Windows 10',
      timestamp: '2023-07-12T17:30:00Z',
      type: 'logout'
    },
    {
      id: '6',
      action: 'Settings Updated',
      description: 'Changed notification preferences',
      ip: '192.168.1.105',
      location: 'Ann Arbor, MI',
      device: 'Safari on iPhone',
      timestamp: '2023-07-10T12:45:00Z',
      type: 'settings'
    },
    {
      id: '7',
      action: 'Login',
      description: 'Successful login from Safari on iPhone',
      ip: '192.168.1.105',
      location: 'Ann Arbor, MI',
      device: 'Safari on iPhone',
      timestamp: '2023-07-10T12:30:00Z',
      type: 'login'
    }
  ];

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(activity => activity.type === filter);

  const getTypeIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'login': return <LogIn className="h-4 w-4 text-green-500" />;
      case 'logout': return <LogOut className="h-4 w-4 text-gray-500" />;
      case 'settings': return <Settings className="h-4 w-4 text-blue-500" />;
      case 'profile': return <User className="h-4 w-4 text-purple-500" />;
      case 'payment': return <CreditCard className="h-4 w-4 text-yellow-500" />;
      case 'security': return <Shield className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeColor = (type: ActivityLog['type']) => {
    switch (type) {
      case 'login': return 'bg-green-50 text-green-700';
      case 'logout': return 'bg-gray-50 text-gray-700';
      case 'settings': return 'bg-blue-50 text-blue-700';
      case 'profile': return 'bg-purple-50 text-purple-700';
      case 'payment': return 'bg-yellow-50 text-yellow-700';
      case 'security': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-700';
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Account Activity</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
              <p className="text-slate-600 text-sm">
                Monitor your account activity and security events
              </p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    filter === 'all'
                      ? 'bg-orange-100 text-orange-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('login')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    filter === 'login'
                      ? 'bg-green-100 text-green-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setFilter('profile')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    filter === 'profile'
                      ? 'bg-purple-100 text-purple-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setFilter('security')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    filter === 'security'
                      ? 'bg-red-100 text-red-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Security
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Activity List */}
        <div className="divide-y divide-slate-200">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No activity found</h3>
              <p className="mt-1 text-sm text-slate-500">
                There is no activity matching your filter.
              </p>
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div key={activity.id} className="px-6 py-5 hover:bg-slate-50 transition">
                <div className="flex">
                  <div className={`flex-shrink-0 p-2 rounded-lg ${getTypeColor(activity.type)}`}>
                    {getTypeIcon(activity.type)}
                  </div>
                  
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base font-medium text-slate-900">{activity.action}</h3>
                        <p className="mt-1 text-slate-600">{activity.description}</p>
                        
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {activity.ip}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {activity.location}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {activity.device}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 sm:mt-0">
                        <p className="text-sm text-slate-500 whitespace-nowrap">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Security Tips */}
        <div className="px-6 py-5 border-t border-slate-200 bg-slate-50">
          <h3 className="text-md font-medium text-slate-900 mb-3">Security Recommendations</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <Shield className="h-6 w-6 text-orange-600 mb-2" />
              <h4 className="font-medium text-slate-900">Enable Two-Factor Authentication</h4>
              <p className="mt-1 text-sm text-slate-600">
                Add an extra layer of security to your account
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <LogIn className="h-6 w-6 text-orange-600 mb-2" />
              <h4 className="font-medium text-slate-900">Review Active Sessions</h4>
              <p className="mt-1 text-sm text-slate-600">
                Check and manage devices that are logged into your account
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <Settings className="h-6 w-6 text-orange-600 mb-2" />
              <h4 className="font-medium text-slate-900">Update Password Regularly</h4>
              <p className="mt-1 text-sm text-slate-600">
                Change your password every 3-6 months for better security
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}