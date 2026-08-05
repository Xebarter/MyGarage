import { config } from '@/lib/config';
import type {
  BuyerProfile,
  BuyerWishlistItem,
  BuyerServiceRequest,
  BuyerServiceRequestDetail,
  BuyerVehicle,
  BuyerControlCenterData,
  CategoryFeedPage,
  Order,
  PaytotaCheckoutResponse,
  PromoCarouselEntry,
  Product,
  SearchSuggestionsResponse,
  ServiceProviderContact,
  VehicleGarageDetail,
} from '@/types';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function normalizeProduct(input: Product): Product {
  const price = Number.isFinite(input.price) ? input.price : Number(input.price) || 0;
  const compareAtPrice =
    input.compareAtPrice == null || Number.isNaN(Number(input.compareAtPrice))
      ? null
      : Number(input.compareAtPrice);

  return {
    ...input,
    name: String(input.name ?? '').trim(),
    description: String(input.description ?? ''),
    price,
    compareAtPrice,
    image: String(input.image ?? '').trim(),
    images: Array.isArray(input.images) ? input.images.filter((item): item is string => typeof item === 'string') : [],
    featured: Boolean(input.featured),
    published: input.published !== false,
    category: String(input.category ?? '').trim(),
    subcategory: String(input.subcategory ?? '').trim(),
    brand: String(input.brand ?? '').trim(),
    sku: String(input.sku ?? '').trim(),
    slug: String(input.slug ?? '').trim(),
    tags: Array.isArray(input.tags) ? input.tags.filter((item): item is string => typeof item === 'string') : [],
    variants: Array.isArray(input.variants)
      ? input.variants
          .filter((variant): variant is Product['variants'][number] => Boolean(variant && typeof variant === 'object'))
          .map((variant) => ({
            ...variant,
            id: String(variant.id ?? ''),
            label: String(variant.label ?? ''),
            price: Number.isFinite(variant.price) ? variant.price : Number(variant.price) || price,
            selections:
              variant.selections && typeof variant.selections === 'object' && !Array.isArray(variant.selections)
                ? variant.selections
                : {},
          }))
      : [],
    vendorId: String(input.vendorId ?? '').trim(),
    createdAt: String(input.createdAt ?? ''),
    updatedAt: String(input.updatedAt ?? input.createdAt ?? ''),
  };
}

function isRenderableProduct(product: Product): boolean {
  return Boolean(product.id && product.name && product.createdAt);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${config.apiUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as T;
}

export async function fetchProducts(): Promise<Product[]> {
  const products = await request<Product[]>('/api/products');
  return products.map(normalizeProduct).filter((p) => p.published !== false && isRenderableProduct(p));
}

export async function createProduct(
  body: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { vendorId: string },
): Promise<Product> {
  return normalizeProduct(
    await request<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}

export async function fetchPromoCarousel(): Promise<PromoCarouselEntry[]> {
  return request<PromoCarouselEntry[]>('/api/promo-carousel');
}

export async function fetchSearchSuggestions(query: string): Promise<SearchSuggestionsResponse> {
  const search = new URLSearchParams({ q: query, limitProducts: '6', limitCategories: '6' });
  return request<SearchSuggestionsResponse>(`/api/search/suggestions?${search.toString()}`);
}

export type AddressSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  label: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  types?: string[];
};

export type AddressPlaceDetails = {
  label: string;
  lat: number;
  lng: number;
};

export type FetchAddressSuggestionsOptions = {
  sessionToken?: string;
  origin?: { lat: number; lng: number };
  limit?: number;
};

export async function fetchAddressSuggestions(
  query: string,
  options: FetchAddressSuggestionsOptions = {},
): Promise<AddressSuggestion[]> {
  const search = new URLSearchParams({ q: query, limit: String(options.limit ?? 6) });
  if (options.sessionToken) search.set('sessionToken', options.sessionToken);
  if (options.origin) {
    search.set('lat', String(options.origin.lat));
    search.set('lng', String(options.origin.lng));
  }
  const data = await request<{ suggestions?: AddressSuggestion[]; provider?: 'google' | 'osm' }>(
    `/api/geocode/suggestions?${search.toString()}`,
  );
  return Array.isArray(data.suggestions) ? data.suggestions : [];
}

export async function fetchAddressPlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<AddressPlaceDetails> {
  const search = new URLSearchParams({ placeId });
  if (sessionToken) search.set('sessionToken', sessionToken);
  return request<AddressPlaceDetails>(`/api/geocode/place?${search.toString()}`);
}

export async function fetchGeocodeLocation(
  query: string,
): Promise<{ lat: number; lng: number; label: string | null } | null> {
  const search = new URLSearchParams({ q: query });
  const data = await request<{ lat: number | null; lng: number | null; label?: string | null }>(
    `/api/geocode?${search.toString()}`,
  );
  if (data.lat == null || data.lng == null || !Number.isFinite(data.lat) || !Number.isFinite(data.lng)) {
    return null;
  }
  return { lat: data.lat, lng: data.lng, label: data.label ?? null };
}

export type AddItemsCategoryNode = {
  title: string;
  children?: AddItemsCategoryNode[];
};

let cachedAddItemsCategories: AddItemsCategoryNode[] | null = null;
let addItemsCategoriesInflight: Promise<AddItemsCategoryNode[]> | null = null;
const addItemsCategoriesListeners = new Set<() => void>();

function notifyAddItemsCategoriesListeners() {
  addItemsCategoriesListeners.forEach((listener) => listener());
}

export function getCachedAddItemsCategories(): AddItemsCategoryNode[] | null {
  return cachedAddItemsCategories;
}

export function subscribeAddItemsCategories(listener: () => void): () => void {
  addItemsCategoriesListeners.add(listener);
  return () => {
    addItemsCategoriesListeners.delete(listener);
  };
}

export function prefetchAddItemsCategories(): Promise<AddItemsCategoryNode[]> {
  if (cachedAddItemsCategories) {
    return Promise.resolve(cachedAddItemsCategories);
  }
  if (addItemsCategoriesInflight) {
    return addItemsCategoriesInflight;
  }

  addItemsCategoriesInflight = fetchAddItemsCategories()
    .then((data) => {
      cachedAddItemsCategories = data;
      notifyAddItemsCategoriesListeners();
      return data;
    })
    .catch((error) => {
      cachedAddItemsCategories = [];
      notifyAddItemsCategoriesListeners();
      throw error;
    })
    .finally(() => {
      addItemsCategoriesInflight = null;
    });

  return addItemsCategoriesInflight;
}

export async function fetchAddItemsCategories(): Promise<AddItemsCategoryNode[]> {
  const data = await request<{ items: AddItemsCategoryNode[] }>('/api/additems');
  return Array.isArray(data.items) ? data.items : [];
}

export async function fetchBuyerWishlist(customerId: string): Promise<BuyerWishlistItem[]> {
  const search = new URLSearchParams({ customerId });
  return request<BuyerWishlistItem[]>(`/api/buyer/wishlist?${search.toString()}`);
}

export async function addBuyerWishlistItem(body: {
  customerId: string;
  productId?: string;
  productName: string;
  priceSnapshot: number;
  categorySnapshot: string;
}): Promise<BuyerWishlistItem> {
  return request<BuyerWishlistItem>('/api/buyer/wishlist', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function removeBuyerWishlistItem(
  customerId: string,
  productId: string,
): Promise<{ success: boolean }> {
  const search = new URLSearchParams({ customerId, productId });
  return request<{ success: boolean }>(`/api/buyer/wishlist?${search.toString()}`, {
    method: 'DELETE',
  });
}

export async function fetchProduct(id: string): Promise<Product> {
  return normalizeProduct(await request<Product>(`/api/products/${encodeURIComponent(id)}`));
}

export async function updateProduct(id: string, body: Partial<Product>): Promise<Product> {
  return normalizeProduct(
    await request<Product>(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function fetchCategoryFeed(params?: {
  offset?: number;
  limit?: number;
  perCategory?: number;
}): Promise<CategoryFeedPage> {
  const search = new URLSearchParams();
  if (params?.offset != null) search.set('offset', String(params.offset));
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.perCategory != null) search.set('perCategory', String(params.perCategory));
  const qs = search.toString();
  return request<CategoryFeedPage>(`/api/landing/products${qs ? `?${qs}` : ''}`);
}

export async function fetchBuyerProfile(params: {
  customerId?: string;
  email?: string;
}): Promise<BuyerProfile> {
  const search = new URLSearchParams();
  if (params.customerId) search.set('customerId', params.customerId);
  if (params.email) search.set('email', params.email);
  return request<BuyerProfile>(`/api/buyer/profile?${search.toString()}`);
}

export async function createBuyerProfile(body: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}): Promise<BuyerProfile> {
  return request<BuyerProfile>('/api/buyer/profile', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateBuyerProfile(
  customerId: string,
  body: Partial<Pick<BuyerProfile['customer'], 'name' | 'email' | 'phone' | 'address'>>,
): Promise<BuyerProfile> {
  return request<BuyerProfile>(`/api/buyer/profile/${encodeURIComponent(customerId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function fetchOrders(): Promise<Order[]> {
  return request<Order[]>('/api/orders');
}

export async function fetchOrder(orderId: string): Promise<Order> {
  return request<Order>(`/api/orders/${encodeURIComponent(orderId)}`);
}

export async function createPaytotaCheckout(body: {
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
}): Promise<PaytotaCheckoutResponse> {
  return request<PaytotaCheckoutResponse>('/api/paytota/checkout', {
    method: 'POST',
    body: JSON.stringify({ ...body, platform: 'mobile' }),
  });
}

export async function createBuyerServiceRequest(body: {
  customerId: string;
  category: string;
  service: string;
  location: string;
  destinationLat?: number;
  destinationLng?: number;
  vehicleId?: string;
}): Promise<BuyerServiceRequest> {
  return request<BuyerServiceRequest>('/api/buyer/service-requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type BuyerServiceRequestDetailResponse = {
  request: BuyerServiceRequestDetail;
  assignments: {
    id: string;
    request_id: string;
    provider_id: string;
    assigned_at: string;
    responded_at: string | null;
    response: string;
    response_note: string | null;
  }[];
  providerContact: ServiceProviderContact | null;
};

export async function fetchBuyerServiceRequestDetail(
  requestId: string,
  customerId: string,
): Promise<BuyerServiceRequestDetailResponse> {
  const search = new URLSearchParams({ customerId });
  return request<BuyerServiceRequestDetailResponse>(
    `/api/buyer/service-requests/${encodeURIComponent(requestId)}?${search.toString()}`,
  );
}

export async function fetchBuyerVehicles(customerId: string): Promise<BuyerVehicle[]> {
  const search = new URLSearchParams({ customerId });
  return request<BuyerVehicle[]>(`/api/buyer/vehicles?${search.toString()}`);
}

export async function createBuyerVehicle(body: {
  customerId: string;
  make: string;
  model: string;
  year: number;
  licensePlate?: string | null;
  imageUrl?: string | null;
  nickname?: string | null;
  isPrimary?: boolean;
}): Promise<BuyerVehicle> {
  return request<BuyerVehicle>('/api/buyer/vehicles', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateBuyerVehicle(
  vehicleId: string,
  body: Partial<{
    customerId: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string | null;
    imageUrl: string | null;
    nickname: string | null;
    isPrimary: boolean;
  }>,
): Promise<BuyerVehicle> {
  return request<BuyerVehicle>(`/api/buyer/vehicles/${encodeURIComponent(vehicleId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteBuyerVehicle(vehicleId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/buyer/vehicles/${encodeURIComponent(vehicleId)}`, {
    method: 'DELETE',
  });
}

export async function fetchVehicleGarageDetail(
  vehicleId: string,
  params?: {
    serviceType?: string;
    providerId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  },
): Promise<VehicleGarageDetail> {
  const search = new URLSearchParams();
  if (params?.serviceType) search.set('serviceType', params.serviceType);
  if (params?.providerId) search.set('providerId', params.providerId);
  if (params?.status) search.set('status', params.status);
  if (params?.sortBy) search.set('sortBy', params.sortBy);
  if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
  const qs = search.toString();
  return request<VehicleGarageDetail>(
    `/api/buyer/vehicles/${encodeURIComponent(vehicleId)}/service-history${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchBuyerControlCenter(customerId: string): Promise<BuyerControlCenterData> {
  const search = new URLSearchParams({ customerId });
  return request<BuyerControlCenterData>(`/api/buyer/control-center?${search.toString()}`);
}

export async function updateBuyerAccount(
  customerId: string,
  body: { preferredContactMethod?: string; accountStatus?: string },
) {
  return request(`/api/buyer/account`, {
    method: 'PATCH',
    body: JSON.stringify({ customerId, ...body }),
  });
}

export async function updateBuyerNotificationPreferences(
  customerId: string,
  body: Record<string, boolean>,
) {
  return request(`/api/buyer/notification-preferences`, {
    method: 'PATCH',
    body: JSON.stringify({ customerId, ...body }),
  });
}

export async function markBuyerNotificationsRead(
  customerId: string,
  opts: { notificationId?: string; markAll?: boolean },
) {
  return request(`/api/buyer/notifications`, {
    method: 'PATCH',
    body: JSON.stringify({ customerId, ...opts }),
  });
}

export async function updateBuyerAppPreferences(customerId: string, body: Record<string, unknown>) {
  return request(`/api/buyer/preferences`, {
    method: 'PATCH',
    body: JSON.stringify({ customerId, ...body }),
  });
}

export async function createBuyerVehicleDocument(body: {
  customerId: string;
  vehicleId: string;
  documentType: string;
  name: string;
  fileUrl?: string | null;
  expiresAt?: string | null;
}) {
  return request('/api/buyer/vehicle-documents', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteBuyerVehicleDocument(documentId: string, customerId: string) {
  const search = new URLSearchParams({ customerId });
  return request(`/api/buyer/vehicle-documents/${encodeURIComponent(documentId)}?${search.toString()}`, {
    method: 'DELETE',
  });
}

export async function updateServiceRecommendation(
  id: string,
  customerId: string,
  status: 'approved' | 'rejected',
) {
  return request(`/api/buyer/service-recommendations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ customerId, status }),
  });
}

export async function fetchServiceRequestMessages(requestId: string, customerId: string) {
  const search = new URLSearchParams({ customerId });
  return request<Array<{ id: string; senderType: string; message: string; createdAt: string }>>(
    `/api/buyer/service-requests/${encodeURIComponent(requestId)}/messages?${search.toString()}`,
  );
}

export async function sendServiceRequestMessage(requestId: string, customerId: string, message: string) {
  return request(`/api/buyer/service-requests/${encodeURIComponent(requestId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ customerId, message }),
  });
}

export async function submitProviderRating(customerId: string, providerId: string, stars: number) {
  return request('/api/buyer/provider-ratings', {
    method: 'POST',
    body: JSON.stringify({ customerId, providerId, stars }),
  });
}

export async function deleteBuyerProfile(customerId: string) {
  return request(`/api/buyer/profile/${encodeURIComponent(customerId)}`, { method: 'DELETE' });
}

export async function subscribeBuyerPlan(body: {
  customerId: string;
  planTier: string;
  customerPhone?: string;
  platform?: string;
}) {
  return request<{ subscription: unknown; checkoutUrl?: string | null; checkoutId?: string }>(
    '/api/buyer/subscriptions',
    { method: 'POST', body: JSON.stringify({ ...body, platform: body.platform ?? 'mobile' }) },
  );
}

export async function cancelBuyerSubscription(customerId: string) {
  const search = new URLSearchParams({ customerId });
  return request(`/api/buyer/subscriptions?${search.toString()}`, { method: 'DELETE' });
}

export type ServicePriceRangeDto = {
  serviceName: string;
  minPriceUgx: number;
  maxPriceUgx: number;
  providerCount: number;
};

export async function fetchServicePriceRanges(categoryId: string): Promise<ServicePriceRangeDto[]> {
  const search = new URLSearchParams({ categoryId });
  const data = await request<{ ranges?: ServicePriceRangeDto[] }>(
    `/api/services/price-ranges?${search.toString()}`,
  );
  return Array.isArray(data.ranges) ? data.ranges : [];
}

export { ApiError };
