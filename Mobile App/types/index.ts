export type ProductVariant = {
  id: string;
  label: string;
  selections: Record<string, string>;
  price: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  images: string[];
  featured: boolean;
  published: boolean;
  category: string;
  subcategory: string;
  brand: string;
  sku: string;
  slug: string;
  tags: string[];
  variants: ProductVariant[];
  vendorId: string;
  createdAt: string;
  updatedAt: string;
};

export type PromoCarouselEntry = {
  id: string;
  product: Product;
  bannerUrl: string;
  source: 'admin' | 'vendor_application';
};

export type SearchSuggestionCategory = {
  name: string;
  image: string;
  count: number;
  headline: string;
};

export type SearchSuggestionProduct = Pick<
  Product,
  'id' | 'name' | 'description' | 'price' | 'compareAtPrice' | 'image' | 'category' | 'brand'
>;

export type SearchSuggestionServiceCategory = {
  categoryId: string;
  categoryTitle: string;
  emoji: string;
  count: number;
  headline: string;
  topServiceName: string;
};

export type SearchSuggestionService = {
  id: string;
  name: string;
  categoryId: string;
  categoryTitle: string;
};

export type SearchSuggestionsResponse = {
  query: string;
  categories: SearchSuggestionCategory[];
  products: SearchSuggestionProduct[];
  serviceCategories: SearchSuggestionServiceCategory[];
  services: SearchSuggestionService[];
};

export type BuyerWishlistItem = {
  id: string;
  customerId: string;
  productId?: string;
  productName: string;
  priceSnapshot: number;
  categorySnapshot: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
};

export type BuyerProfile = {
  customer: Customer;
  stats: {
    wishlistItems: number;
    addresses: number;
    serviceRequests: number;
    supportTickets: number;
    vehicles?: number;
  };
  defaultAddress?: { label: string; fullAddress: string } | null;
};

export type BuyerControlCenterData = {
  profile: BuyerProfile;
  account: {
    preferredContactMethod: 'email' | 'phone' | 'both';
    accountStatus: 'active' | 'deactivated';
    deactivatedAt: string | null;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  notificationPreferences: {
    customerId: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
    inAppEnabled: boolean;
    serviceUpdates: boolean;
    maintenanceReminders: boolean;
    marketing: boolean;
  };
  notifications: Array<{
    id: string;
    notificationType: string;
    title: string;
    body: string;
    readAt: string | null;
    createdAt: string;
  }>;
  unreadNotificationCount: number;
  preferences: {
    serviceMode: 'mobile' | 'workshop' | 'both';
    language: string;
    region: string;
    distanceUnit: 'km' | 'miles';
    currency: string;
    theme: 'system' | 'light' | 'dark';
  };
  documents: Array<{
    id: string;
    vehicleId: string;
    documentType: string;
    name: string;
    fileUrl: string | null;
    expiresAt: string | null;
  }>;
  documentAlerts: Array<{
    documentId: string;
    vehicleId: string;
    name: string;
    expiresAt: string;
    status: 'upcoming' | 'expired';
  }>;
  payments: Array<{
    id: string;
    source: 'service' | 'product';
    label: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string | null;
    createdAt: string;
  }>;
  pendingPaymentTotal: number;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'approved' | 'rejected';
  }>;
  analytics: {
    totalMaintenanceCost: number;
    totalServices: number;
    vehicles: Array<{
      vehicleId: string;
      vehicleLabel: string;
      totalMaintenanceCost: number;
      serviceCount: number;
      healthStatus: string;
      commonIssues: string[];
    }>;
    monthlySpend: Array<{ month: string; amount: number }>;
  };
  serviceRequests: Array<{
    id: string;
    category: string;
    service: string;
    location: string;
    status: string;
    providerId?: string | null;
    createdAt: string;
  }>;
  ratings: Array<{ providerId: string; stars: number }>;
  subscription: {
    planTier: 'platinum' | 'gold' | 'silver' | 'bronze';
    status: string;
    currentPeriodEnd?: string | null;
    startedAt?: string | null;
    cancelledAt?: string | null;
  } | null;
  subscriptionHistory?: Array<{
    id: string;
    planTier: string;
    status: string;
    startedAt?: string | null;
    createdAt: string;
    cancelledAt?: string | null;
  }>;
};

export type VehicleStatus =
  | 'in_service'
  | 'awaiting_parts'
  | 'ready_for_pickup'
  | 'no_active_issues';

export type BuyerVehicle = {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string | null;
  imageUrl: string | null;
  nickname: string | null;
  isPrimary: boolean;
  vehicleStatus: VehicleStatus;
  nextServiceDate: string | null;
  statusUpdatedByProviderId: string | null;
  statusUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VehicleServiceHistoryEntry = {
  id: string;
  vehicleId: string;
  customerId: string;
  serviceRequestId: string | null;
  serviceType: 'repair' | 'maintenance' | 'diagnostic' | 'inspection' | 'other';
  serviceName: string;
  serviceDate: string;
  providerId: string | null;
  providerName: string;
  notes: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
};

export type VehicleGarageDetail = {
  vehicle: BuyerVehicle;
  history: VehicleServiceHistoryEntry[];
};

export type CartItem = {
  productId: string;
  productName: string;
  image: string;
  price: number;
  quantity: number;
  variantId?: string;
  variantLabel?: string;
};

export type ServicePriority = 'urgent' | 'common' | 'optional';

export type ServiceCategory = {
  id: string;
  emoji: string;
  title: string;
  useWhen: string;
  priority: ServicePriority;
  services: string[];
};

export type BuyerServiceRequestStatus =
  | 'pending'
  | 'matched'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type BuyerServiceRequest = {
  id: string;
  customerId: string;
  category: string;
  service: string;
  location: string;
  status: BuyerServiceRequestStatus;
  createdAt: string;
};

export type BuyerServiceRequestDetail = BuyerServiceRequest & {
  providerId: string | null;
  acceptedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  buyerContactPhone?: string;
  buyerContactName?: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  providerLat?: number | null;
  providerLng?: number | null;
};

export type ServiceProviderContact = {
  id: string;
  name: string;
  businessName?: string;
  phone: string;
  rating?: number;
  completedJobs?: number;
  address?: string;
  vehicleLabel?: string;
  photoUrl?: string | null;
};

export type ServiceRequestUiPhase =
  | 'searching'
  | 'provider_found'
  | 'provider_accepted'
  | 'preparing_to_depart'
  | 'en_route'
  | 'nearby'
  | 'arrived'
  | 'service_started'
  | 'service_in_progress'
  | 'completed'
  | 'cancelled';

export type CategoryFeedSection = {
  category: string;
  products: Product[];
};

export type CategoryFeedPage = {
  sections: CategoryFeedSection[];
  hasMore: boolean;
  nextOffset: number;
  totalCategories: number;
};

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  vendorId: string;
};

export type Order = {
  id: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
};

export type PaytotaCheckoutResponse = {
  checkoutId: string;
  paymentReference: string;
  checkoutUrl: string;
  paymentReturnUrl?: string;
};
