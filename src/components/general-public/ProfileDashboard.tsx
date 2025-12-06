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
  ChevronRight,
  Search
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
    icon: User,
    link: "/profile/security"
  },
  {
    id: "wallet_payments",
    title: "Wallet & Payments",
    description: "Manage saved payment methods, mobile money, transaction history, refunds, loyalty points, and promo codes.",
    type: "finance",
    priority: "core",
    actions: ["add_payment_method", "view_balance", "view_transactions", "redeem_rewards"],
    icon: Wallet,
    link: "/profile/payments"
  },
  {
    id: "service_history",
    title: "Service History",
    description: "Access completed services, invoices, mechanic notes, and downloadable inspection reports.",
    type: "history",
    priority: "core",
    actions: ["view_records", "download_invoice", "filter_by_vehicle"],
    icon: Wrench,
    link: "/profile/service-history"
  },
  {
    id: "documents_storage",
    title: "Documents & Insurance",
    description: "Store and manage motor insurance, logbooks, inspection reports, driving permits, and receive expiry reminders.",
    type: "documents",
    priority: "core",
    actions: ["upload_document", "view_document", "set_expiry_alert"],
    icon: FileText,
    link: "/profile/documents"
  },
  {
    id: "appointments",
    title: "Appointments",
    description: "Manage your vehicle service appointments, schedule new appointments and track upcoming services.",
    type: "scheduling",
    priority: "core",
    actions: ["view_appointments", "schedule_appointment", "cancel_appointment"],
    icon: Calendar,
    link: "/profile/appointments"
  },
  {
    id: "saved_mechanics",
    title: "Saved Mechanics",
    description: "Manage favorite mechanics and repair shops for quick access and rebooking.",
    type: "favorites",
    priority: "core",
    actions: ["view_saved", "remove", "book_again"],
    icon: Heart,
    link: "/profile/mechanics"
  },
  {
    id: "reviews_feedback",
    title: "Ratings & Reviews",
    description: "View and manage reviews submitted for mechanics and services, and track responses.",
    type: "feedback",
    priority: "optional",
    actions: ["view_reviews", "edit_review", "delete_review"],
    icon: Star,
    link: "/profile/ratings"
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Customize alerts for bookings, deliveries, maintenance reminders, and promotions.",
    type: "alerts",
    priority: "core",
    actions: ["enable", "disable", "set_preferences"],
    icon: Bell,
    link: "/profile/notifications"
  },
  {
    id: "referrals_rewards",
    title: "Referrals & Rewards",
    description: "View referral links, track points earned, cashback status, and reward history.",
    type: "loyalty",
    priority: "optional",
    actions: ["copy_referral_link", "view_points", "redeem_rewards"],
    icon: Gift,
    link: "/profile/referrals"
  },
  {
    id: "messages_support",
    title: "Messages & Support",
    description: "Access past conversations with mechanics and support, including service-related communication.",
    type: "communication",
    priority: "core",
    actions: ["view_messages", "send_message", "open_support_ticket"],
    icon: MessageCircle,
    link: "/profile/messages"
  },
  {
    id: "account_activity",
    title: "Account Activity",
    description: "View login history and account activity for transparency and security monitoring.",
    type: "security",
    priority: "optional",
    actions: ["view_activity_log"],
    icon: Activity,
    link: "/profile/account"
  },
  {
    id: "my_vehicles",
    title: "My Vehicles",
    description: "Register and manage vehicles including make, model, year, engine type, VIN, mileage, and uploaded logbooks.",
    type: "vehicle_management",
    priority: "core",
    actions: ["add_vehicle", "edit_vehicle", "delete_vehicle", "view_vehicle_details"],
    icon: Car,
    link: "/profile/vehicles"
  },
  {
    id: "maintenance_reminders",
    title: "Maintenance Reminders",
    description: "View and manage scheduled service reminders for oil changes, brake checks, tire rotation, and inspections.",
    type: "reminders",
    priority: "optional",
    actions: ["view_schedule", "set_reminder", "edit_reminder"],
    icon: Calendar,
    link: "/profile/reminders"
  }
];

interface ProfileDashboardProps {
  onSelectView: (view: string) => void;
}

export function ProfileDashboard({ onSelectView }: ProfileDashboardProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = profileOptions.filter(option => 
    option.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOptionClick = (optionId: string, link?: string) => {
    if (link) {
      navigate(link);
    } else {
      onSelectView(optionId);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search profile options..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOptions.map((option) => {
          const IconComponent = option.icon;
          
          return (
            <div 
              key={option.id} 
              className="border border-gray-200 rounded-xl hover:border-orange-300 transition cursor-pointer group bg-white shadow-sm hover:shadow-md"
              onClick={() => handleOptionClick(option.id, option.link)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <IconComponent className="w-6 h-6 text-orange-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition" />
                </div>
                
                <h3 className="font-bold text-gray-900 text-lg mt-4 mb-2">{option.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{option.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {option.actions.slice(0, 3).map((action, index) => (
                    <span 
                      key={index} 
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize"
                    >
                      {action.replace('_', ' ')}
                    </span>
                  ))}
                  {option.actions.length > 3 && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      +{option.actions.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}