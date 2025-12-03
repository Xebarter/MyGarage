import { useState } from 'react';
import { Bell, Mail, Phone, Calendar, Wrench, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'appointment' | 'reminder' | 'promotion' | 'alert';
}

interface NotificationsProps {
  onBack?: () => void;
}

export function Notifications({ onBack }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Appointment Reminder',
      message: 'Your oil change appointment is scheduled for tomorrow at 10:00 AM',
      date: '2023-07-14T09:30:00Z',
      read: false,
      type: 'reminder'
    },
    {
      id: '2',
      title: 'Service Completed',
      message: 'Your brake inspection has been completed. View the report in your service history.',
      date: '2023-06-20T15:45:00Z',
      read: true,
      type: 'appointment'
    },
    {
      id: '3',
      title: 'Special Offer',
      message: 'Get 20% off your next tire rotation service. Valid until July 31st.',
      date: '2023-07-10T12:00:00Z',
      read: false,
      type: 'promotion'
    },
    {
      id: '4',
      title: 'Document Expiring',
      message: 'Your vehicle registration expires in 30 days. Renew now to avoid penalties.',
      date: '2023-06-15T08:15:00Z',
      read: true,
      type: 'alert'
    },
    {
      id: '5',
      title: 'Appointment Confirmation',
      message: 'Your tire rotation appointment has been confirmed for July 22nd at 9:00 AM',
      date: '2023-07-12T14:20:00Z',
      read: false,
      type: 'appointment'
    }
  ]);

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => filter === 'unread' ? !n.read : n.read);

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };

  const getIconByType = (type: Notification['type']) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'reminder': return <Bell className="h-5 w-5 text-yellow-500" />;
      case 'promotion': return <Mail className="h-5 w-5 text-green-500" />;
      case 'alert': return <Wrench className="h-5 w-5 text-red-500" />;
      default: return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBgColorByType = (type: Notification['type']) => {
    switch (type) {
      case 'appointment': return 'bg-blue-50';
      case 'reminder': return 'bg-yellow-50';
      case 'promotion': return 'bg-green-50';
      case 'alert': return 'bg-red-50';
      default: return 'bg-gray-50';
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
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Notification Settings</h2>
              <p className="text-slate-600 text-sm">
                Manage your notification preferences
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 flex space-x-3">
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
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    filter === 'unread'
                      ? 'bg-blue-100 text-blue-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Unread
                </button>
                <button
                  onClick={() => setFilter('read')}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    filter === 'read'
                      ? 'bg-green-100 text-green-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Read
                </button>
              </div>
              
              <button 
                onClick={markAllAsRead}
                className="px-3 py-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Mark all as read
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-slate-200">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No notifications</h3>
              <p className="mt-1 text-sm text-slate-500">
                You're all caught up! No new notifications.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`px-6 py-5 hover:bg-slate-50 transition ${!notification.read ? 'bg-blue-50' : ''}`}
              >
                <div className="flex">
                  <div className={`flex-shrink-0 p-2 rounded-lg ${getBgColorByType(notification.type)}`}>
                    {getIconByType(notification.type)}
                  </div>
                  
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`text-base font-medium ${notification.read ? 'text-slate-900' : 'text-slate-900 font-semibold'}`}>
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-slate-600">{notification.message}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(notification.date).toLocaleString()}
                        </p>
                      </div>
                      
                      {!notification.read && (
                        <button 
                          onClick={() => markAsRead(notification.id)}
                          className="ml-4 p-1 rounded-full hover:bg-slate-200"
                        >
                          <CheckCircle className="h-5 w-5 text-slate-400 hover:text-green-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Preferences */}
        <div className="px-6 py-5 border-t border-slate-200 bg-slate-50">
          <h3 className="text-md font-medium text-slate-900 mb-4">Notification Preferences</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-slate-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Push Notifications</p>
                  <p className="text-sm text-slate-500">Receive notifications on your device</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-slate-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Email Notifications</p>
                  <p className="text-sm text-slate-500">Receive emails about your appointments</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-slate-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-slate-900">SMS Notifications</p>
                  <p className="text-sm text-slate-500">Receive text messages for urgent alerts</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}