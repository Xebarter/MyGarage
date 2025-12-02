import { useState } from 'react';
import { Save, Mail, Bell, Lock, Palette, Globe, Database, Shield, Upload, Trash2 } from 'lucide-react';
import { AdminHeader } from './AdminHeader';

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  orderUpdates: boolean;
  inventoryAlerts: boolean;
  customerMessages: boolean;
}

interface GeneralSettings {
  siteName: string;
  contactEmail: string;
  timezone: string;
  currency: string;
}

export function AdminSettings() {
  const [activeSection, setActiveSection] = useState<'general' | 'notifications' | 'security' | 'appearance'>('general');
  
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    siteName: 'AutoParts Admin',
    contactEmail: 'admin@autoparts.com',
    timezone: 'UTC+0',
    currency: 'USD'
  });
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    orderUpdates: true,
    inventoryAlerts: true,
    customerMessages: true
  });
  
  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleGeneralSettingsChange = (field: keyof GeneralSettings, value: string) => {
    setGeneralSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationSettingsChange = (field: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field: keyof typeof password, value: string) => {
    setPassword(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveGeneralSettings = () => {
    console.log('Saving general settings:', generalSettings);
    alert('General settings saved successfully!');
  };

  const handleSaveNotificationSettings = () => {
    console.log('Saving notification settings:', notificationSettings);
    alert('Notification settings saved successfully!');
  };

  const handleSavePassword = () => {
    if (password.newPassword !== password.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    
    if (password.newPassword.length < 8) {
      alert('Password must be at least 8 characters long!');
      return;
    }
    
    console.log('Changing password');
    alert('Password changed successfully!');
    
    // Reset form
    setPassword({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your admin panel configuration
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow p-6">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveSection('general')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeSection === 'general'
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Globe className="mr-3 h-5 w-5" />
                  General
                </button>
                
                <button
                  onClick={() => setActiveSection('notifications')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeSection === 'notifications'
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Bell className="mr-3 h-5 w-5" />
                  Notifications
                </button>
                
                <button
                  onClick={() => setActiveSection('security')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeSection === 'security'
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Lock className="mr-3 h-5 w-5" />
                  Security
                </button>
                
                <button
                  onClick={() => setActiveSection('appearance')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeSection === 'appearance'
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Palette className="mr-3 h-5 w-5" />
                  Appearance
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="bg-white rounded-lg shadow">
              {/* General Settings */}
              {activeSection === 'general' && (
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900">General Settings</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Update your site configuration and business information
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="siteName" className="block text-sm font-medium text-gray-700">
                        Site Name
                      </label>
                      <input
                        type="text"
                        id="siteName"
                        value={generalSettings.siteName}
                        onChange={(e) => handleGeneralSettingsChange('siteName', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        id="contactEmail"
                        value={generalSettings.contactEmail}
                        onChange={(e) => handleGeneralSettingsChange('contactEmail', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                        Timezone
                      </label>
                      <select
                        id="timezone"
                        value={generalSettings.timezone}
                        onChange={(e) => handleGeneralSettingsChange('timezone', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                      >
                        <option value="UTC-12">(UTC-12:00) International Date Line West</option>
                        <option value="UTC-11">(UTC-11:00) Midway Island, Samoa</option>
                        <option value="UTC-10">(UTC-10:00) Hawaii</option>
                        <option value="UTC-9">(UTC-09:00) Alaska</option>
                        <option value="UTC-8">(UTC-08:00) Pacific Time (US & Canada)</option>
                        <option value="UTC-7">(UTC-07:00) Mountain Time (US & Canada)</option>
                        <option value="UTC-6">(UTC-06:00) Central Time (US & Canada)</option>
                        <option value="UTC-5">(UTC-05:00) Eastern Time (US & Canada)</option>
                        <option value="UTC-4">(UTC-04:00) Atlantic Time (Canada)</option>
                        <option value="UTC-3">(UTC-03:00) Brasilia</option>
                        <option value="UTC-2">(UTC-02:00) Mid-Atlantic</option>
                        <option value="UTC-1">(UTC-01:00) Cape Verde Is.</option>
                        <option value="UTC+0">(UTC+00:00) London, Dublin, Lisbon</option>
                        <option value="UTC+1">(UTC+01:00) Paris, Berlin, Rome</option>
                        <option value="UTC+2">(UTC+02:00) Athens, Helsinki, Istanbul</option>
                        <option value="UTC+3">(UTC+03:00) Moscow, Baghdad</option>
                        <option value="UTC+4">(UTC+04:00) Abu Dhabi, Muscat</option>
                        <option value="UTC+5">(UTC+05:00) Islamabad, Karachi</option>
                        <option value="UTC+6">(UTC+06:00) Almaty, Dhaka</option>
                        <option value="UTC+7">(UTC+07:00) Bangkok, Hanoi, Jakarta</option>
                        <option value="UTC+8">(UTC+08:00) Beijing, Singapore, Hong Kong</option>
                        <option value="UTC+9">(UTC+09:00) Tokyo, Seoul</option>
                        <option value="UTC+10">(UTC+10:00) Brisbane, Sydney</option>
                        <option value="UTC+11">(UTC+11:00) Solomon Is., New Caledonia</option>
                        <option value="UTC+12">(UTC+12:00) Auckland, Wellington</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                        Currency
                      </label>
                      <select
                        id="currency"
                        value={generalSettings.currency}
                        onChange={(e) => handleGeneralSettingsChange('currency', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="JPY">JPY - Japanese Yen</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                        <option value="CHF">CHF - Swiss Franc</option>
                        <option value="CNY">CNY - Chinese Yuan</option>
                      </select>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveGeneralSettings}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Notification Settings */}
              {activeSection === 'notifications' && (
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900">Notification Settings</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Configure how you receive notifications
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <button
                        onClick={() => handleNotificationSettingsChange('emailNotifications', !notificationSettings.emailNotifications)}
                        className={`${
                          notificationSettings.emailNotifications ? 'bg-orange-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
                      >
                        <span
                          className={`${
                            notificationSettings.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
                        <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
                      </div>
                      <button
                        onClick={() => handleNotificationSettingsChange('pushNotifications', !notificationSettings.pushNotifications)}
                        className={`${
                          notificationSettings.pushNotifications ? 'bg-orange-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
                      >
                        <span
                          className={`${
                            notificationSettings.pushNotifications ? 'translate-x-5' : 'translate-x-0'
                          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-md font-medium text-gray-900 mb-4">Specific Notifications</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Order Updates</h4>
                            <p className="text-sm text-gray-500">Notifications about order status changes</p>
                          </div>
                          <button
                            onClick={() => handleNotificationSettingsChange('orderUpdates', !notificationSettings.orderUpdates)}
                            className={`${
                              notificationSettings.orderUpdates ? 'bg-orange-600' : 'bg-gray-200'
                            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
                          >
                            <span
                              className={`${
                                notificationSettings.orderUpdates ? 'translate-x-5' : 'translate-x-0'
                              } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                            />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Inventory Alerts</h4>
                            <p className="text-sm text-gray-500">Low stock warnings and inventory updates</p>
                          </div>
                          <button
                            onClick={() => handleNotificationSettingsChange('inventoryAlerts', !notificationSettings.inventoryAlerts)}
                            className={`${
                              notificationSettings.inventoryAlerts ? 'bg-orange-600' : 'bg-gray-200'
                            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
                          >
                            <span
                              className={`${
                                notificationSettings.inventoryAlerts ? 'translate-x-5' : 'translate-x-0'
                              } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                            />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Customer Messages</h4>
                            <p className="text-sm text-gray-500">Messages from customers and support tickets</p>
                          </div>
                          <button
                            onClick={() => handleNotificationSettingsChange('customerMessages', !notificationSettings.customerMessages)}
                            className={`${
                              notificationSettings.customerMessages ? 'bg-orange-600' : 'bg-gray-200'
                            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
                          >
                            <span
                              className={`${
                                notificationSettings.customerMessages ? 'translate-x-5' : 'translate-x-0'
                              } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveNotificationSettings}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Security Settings */}
              {activeSection === 'security' && (
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Update your password and manage security preferences
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-4">Change Password</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                            Current Password
                          </label>
                          <input
                            type="password"
                            id="currentPassword"
                            value={password.currentPassword}
                            onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                            New Password
                          </label>
                          <input
                            type="password"
                            id="newPassword"
                            value={password.newPassword}
                            onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            id="confirmPassword"
                            value={password.confirmPassword}
                            onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-md font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Enable 2FA</h4>
                          <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                        </div>
                        <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
                          <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-md font-medium text-gray-900 mb-4">Active Sessions</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Current Session</p>
                            <p className="text-sm text-gray-500">Chrome on Windows • Your location</p>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Firefox on macOS</p>
                            <p className="text-sm text-gray-500">San Francisco, CA • 2 hours ago</p>
                          </div>
                          <button className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none">
                            <Trash2 className="mr-1 h-3 w-3" />
                            Revoke
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSavePassword}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Appearance Settings */}
              {activeSection === 'appearance' && (
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900">Appearance Settings</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Customize the look and feel of your admin panel
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-4">Theme</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="border-2 border-orange-500 rounded-lg p-4 cursor-pointer bg-white">
                          <div className="flex items-center">
                            <div className="h-4 w-4 rounded-full bg-orange-500 mr-2"></div>
                            <span className="font-medium text-gray-900">Default</span>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">Orange accent color</p>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 bg-white">
                          <div className="flex items-center">
                            <div className="h-4 w-4 rounded-full bg-blue-500 mr-2"></div>
                            <span className="font-medium text-gray-900">Blue</span>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">Blue accent color</p>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 bg-white">
                          <div className="flex items-center">
                            <div className="h-4 w-4 rounded-full bg-green-500 mr-2"></div>
                            <span className="font-medium text-gray-900">Green</span>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">Green accent color</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-4">Sidebar Layout</h3>
                      <div className="flex items-center">
                        <div className="flex items-center mr-6">
                          <input
                            id="sidebar-expanded"
                            name="sidebar-layout"
                            type="radio"
                            className="h-4 w-4 border-gray-300 text-orange-600 focus:ring-orange-500"
                            defaultChecked
                          />
                          <label htmlFor="sidebar-expanded" className="ml-3 block text-sm font-medium text-gray-700">
                            Expanded
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="sidebar-compact"
                            name="sidebar-layout"
                            type="radio"
                            className="h-4 w-4 border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <label htmlFor="sidebar-compact" className="ml-3 block text-sm font-medium text-gray-700">
                            Compact
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-4">Dashboard Layout</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-2 border-orange-500 rounded-lg p-4 cursor-pointer bg-white">
                          <div className="flex flex-col space-y-2">
                            <div className="h-3 w-full bg-gray-200 rounded"></div>
                            <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                              <div className="h-20 bg-gray-100 rounded"></div>
                              <div className="h-20 bg-gray-100 rounded"></div>
                            </div>
                          </div>
                          <p className="mt-3 text-center text-sm font-medium text-gray-900">Standard Layout</p>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 bg-white">
                          <div className="flex flex-col space-y-2">
                            <div className="h-3 w-full bg-gray-200 rounded"></div>
                            <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                            <div className="grid grid-cols-1 gap-2 mt-4">
                              <div className="h-16 bg-gray-100 rounded"></div>
                              <div className="h-16 bg-gray-100 rounded"></div>
                            </div>
                          </div>
                          <p className="mt-3 text-center text-sm font-medium text-gray-900">Compact Layout</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}