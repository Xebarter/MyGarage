import { config } from '@/lib/config';
import type {
  BuyerProfile,
  BuyerWishlistItem,
  BuyerServiceRequest,
  BuyerServiceRequestDetail,
  CategoryFeedPage,
  Order,
  PaytotaCheckoutResponse,
  PromoCarouselEntry,
  Product,
  SearchSuggestionsResponse,
  ServiceProviderContact,
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

export { ApiError };
