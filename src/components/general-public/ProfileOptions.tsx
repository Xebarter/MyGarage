import { useState } from 'react';
import { 
  User, 
  Wallet, 
  Wrench, 
  FileText, 
  Heart, 
  Star, 
  Bell, 
  Gift, 
  MessageCircle, 
  Activity, 
  Car,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const profileOptions = [
  {
    id: "profile-and-security",
    title: "Profile & Security",
    description: "Manage personal details, address information, service preferences, password, privacy controls, and account verification settings.",
    type: "settings",
    priority: "core",
    actions: ["view", "edit", "update_password", "manage_privacy"],
    icon: User
  },
  {
    id: "wallet_payments",
    title: "Wallet & Payments",
    description: "Manage saved payment methods, mobile money, transaction history, refunds, loyalty points, and promo codes.",
    type: "finance",
    priority: "core",
    actions: ["add_payment_method", "view_balance", "view_transactions", "redeem_rewards"],
    icon: Wallet
  },
  {
    id: "service_history",
    title: "Service History",
    description: "Access completed services, invoices, mechanic notes, and downloadable inspection reports.",
    type: "history",
    priority: "core",
    actions: ["view_records", "download_invoice", "filter_by_vehicle"],
    icon: Wrench,
    link: "/service-history"
  },
  {
    id: "documents_storage",
    title: "Documents & Insurance",
    description: "Store and manage motor insurance, logbooks, inspection reports, driving permits, and receive expiry reminders.",
    type: "documents",
    priority: "core",
    actions: ["upload_document", "view_document", "set_expiry_alert"],
    icon: FileText,
    link: "/documents-insurance"
  },
  {
    id: "saved_mechanics",
    title: "Saved Mechanics",
    description: "Manage favorite mechanics and repair shops for quick access and rebooking.",
    type: "favorites",
    priority: "core",
    actions: ["view_saved", "remove", "book_again"],
    icon: Heart
  },
  {
    id: "reviews_feedback",
    title: "Ratings & Reviews",
    description: "View and manage reviews submitted for mechanics and services, and track responses.",
    type: "feedback",
    priority: "optional",
    actions: ["view_reviews", "edit_review", "delete_review"],
    icon: Star
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Customize alerts for bookings, deliveries, maintenance reminders, and promotions.",
    type: "alerts",
    priority: "core",
    actions: ["enable", "disable", "set_preferences"],
    icon: Bell
  },
  {
    id: "referrals_rewards",
    title: "Referrals & Rewards",
    description: "View referral links, track points earned, cashback status, and reward history.",
    type: "loyalty",
    priority: "optional",
    actions: ["copy_referral_link", "view_points", "redeem_rewards"],
    icon: Gift
  },
  {
    id: "messages_support",
    title: "Messages & Support",
    description: "Access past conversations with mechanics and support, including service-related communication.",
    type: "communication",
    priority: "core",
    actions: ["view_messages", "send_message", "open_support_ticket"],
    icon: MessageCircle
  },
  {
    id: "account_activity",
    title: "Account Activity",
    description: "View login history and account activity for transparency and security monitoring.",
    type: "security",
    priority: "optional",
    actions: ["view_activity_log"],
    icon: Activity
  },
  {
    id: "my_vehicles",
    title: "My Vehicles",
    description: "Register and manage vehicles including make, model, year, engine type, VIN, mileage, and uploaded logbooks.",
    type: "vehicle_management",
    priority: "core",
    actions: ["add_vehicle", "edit_vehicle", "delete_vehicle", "view_vehicle_details"],
    icon: Car
  },
  {
    id: "maintenance_reminders",
    title: "Maintenance Reminders",
    description: "View and manage scheduled service reminders for oil changes, brake checks, tire rotation, and inspections.",
    type: "reminders",
    priority: "optional",
    actions: ["view_schedule", "set_reminder", "edit_reminder"],
    icon: Calendar
  }
];

interface ProfileOptionsProps {
  onClose: () => void;
  onSelectView?: (view: string) => void;
}

export function ProfileOptions({ onClose, onSelectView }: ProfileOptionsProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = profileOptions.filter(option => 
    option.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOptionClick = (optionId: string, link?: string) => {
    if (onSelectView) {
      onSelectView(optionId);
    }
    
    if (link) {
      navigate(link);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />

      {/* Profile Options Panel */}
      <div className="absolute right-0 top-0 h-full w-[90vw] sm:w-[80vw] md:w-[600px] max-w-md bg-white shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Profile Options</h2>
          <button 
            onClick={onClose}
            className="p-3 rounded-xl hover:bg-slate-100 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search profile options..."
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Options List */}
          <div className="space-y-4">
            {filteredOptions.map((option) => {
              const IconComponent = option.icon;
              
              const content = (
                <div 
                  key={option.id} 
                  className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
                  onClick={() => handleOptionClick(option.id, option.link)}
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <IconComponent className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-900 mb-1">{option.title}</h3>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition" />
                      </div>
                      <p className="text-slate-600 text-sm mb-3">{option.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {option.actions.map((action, index) => (
                          <span 
                            key={index} 
                            className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded capitalize"
                          >
                            {action.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
              
              // If the option has a link, wrap it in a Link component
              if (option.link) {
                return (
                  <div 
                    key={option.id} 
                    onClick={() => {
                      // If there's an onSelectView callback, use it instead of navigating
                      if (onSelectView) {
                        handleOptionClick(option.id);
                      }
                    }}
                  >
                    {content}
                  </div>
                );
              }
              
              // Otherwise, return the plain content
              return content;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
