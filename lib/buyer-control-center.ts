export type PreferredContactMethod = 'email' | 'phone' | 'both';
export type AccountStatus = 'active' | 'deactivated';
export type ServiceMode = 'mobile' | 'workshop' | 'both';
export type DistanceUnit = 'km' | 'miles';
export type ThemePreference = 'system' | 'light' | 'dark';
export type NotificationType =
  | 'system'
  | 'service_update'
  | 'maintenance_reminder'
  | 'document_expiry'
  | 'payment'
  | 'recommendation'
  | 'message';
export type DocumentType = 'logbook' | 'insurance' | 'inspection' | 'registration' | 'warranty' | 'other';
export type RecommendationStatus = 'pending' | 'approved' | 'rejected';

export type BuyerAccountDetails = {
  preferredContactMethod: PreferredContactMethod;
  accountStatus: AccountStatus;
  deactivatedAt: Date | null;
  emailVerified: boolean;
  phoneVerified: boolean;
};

export type BuyerNotificationPreferences = {
  customerId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  serviceUpdates: boolean;
  maintenanceReminders: boolean;
  marketing: boolean;
};

export type BuyerNotification = {
  id: string;
  customerId: string;
  notificationType: NotificationType;
  title: string;
  body: string;
  readAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export type BuyerAppPreferences = {
  customerId: string;
  preferredProviderIds: string[];
  serviceMode: ServiceMode;
  language: string;
  region: string;
  distanceUnit: DistanceUnit;
  currency: string;
  theme: ThemePreference;
};

export type BuyerVehicleDocument = {
  id: string;
  customerId: string;
  vehicleId: string;
  documentType: DocumentType;
  name: string;
  fileUrl: string | null;
  storagePath: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceProviderRecommendation = {
  id: string;
  customerId: string;
  vehicleId: string | null;
  providerId: string | null;
  requestId: string | null;
  title: string;
  description: string;
  status: RecommendationStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type BuyerPaymentRecord = {
  id: string;
  source: 'service' | 'product';
  referenceId: string;
  label: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  paidAt: Date | null;
  createdAt: Date;
};

export type ServiceRequestMessage = {
  id: string;
  requestId: string;
  senderType: 'buyer' | 'provider' | 'admin' | 'system';
  senderId: string | null;
  message: string;
  createdAt: Date;
};

export type VehicleAnalytics = {
  vehicleId: string;
  vehicleLabel: string;
  totalMaintenanceCost: number;
  serviceCount: number;
  lastServiceAt: Date | null;
  commonIssues: string[];
  healthStatus: 'excellent' | 'good' | 'attention' | 'critical';
  nextServiceDate: Date | null;
};

export type BuyerAnalyticsSummary = {
  totalMaintenanceCost: number;
  totalServices: number;
  vehicles: VehicleAnalytics[];
  monthlySpend: { month: string; amount: number }[];
};

export type BuyerControlCenterPayload = {
  account: BuyerAccountDetails;
  notificationPreferences: BuyerNotificationPreferences;
  notifications: BuyerNotification[];
  unreadNotificationCount: number;
  preferences: BuyerAppPreferences;
  documents: BuyerVehicleDocument[];
  documentAlerts: { documentId: string; vehicleId: string; name: string; expiresAt: Date; status: 'upcoming' | 'expired' }[];
  payments: BuyerPaymentRecord[];
  pendingPaymentTotal: number;
  recommendations: ServiceProviderRecommendation[];
  analytics: BuyerAnalyticsSummary;
  subscription: import('@/lib/supabase/buyer-subscriptions-repo').BuyerSubscription | null;
  subscriptionHistory: import('@/lib/supabase/buyer-subscriptions-repo').BuyerSubscription[];
};
