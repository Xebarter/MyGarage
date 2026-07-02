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
    openServiceRequests: number;
    openSupportTickets: number;
  };
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
};
