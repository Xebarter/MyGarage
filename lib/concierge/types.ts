export type ConciergeChatRole = "user" | "assistant";

export type ConciergeChatTurn = {
  role: ConciergeChatRole;
  content: string;
  imageUrl?: string;
};

export type ConciergeQuoteLine = {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  vendorId?: string;
};

export type ConciergeProductCard = {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  category: string;
  brand: string;
  href: string;
};

export type ConciergeProductBrowse = {
  title: string;
  query?: string;
  category?: string;
  total: number;
  offset: number;
  hasMore: boolean;
  products: ConciergeProductCard[];
  departments?: ConciergeShopDepartment[];
};

export type ConciergeProductDetailView = ConciergeProductCard & {
  description: string;
  sku?: string;
  subcategory?: string;
  related?: ConciergeProductCard[];
};

export type ConciergeShopDepartment = {
  title: string;
  children: string[];
};

export type ConciergeOrderCard = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  itemSummary: string;
  href: string;
  hrefMobile: string;
};

export type ConciergeBookingCard = {
  id: string;
  status: string;
  service: string;
  location: string;
  createdAt: string;
  href: string;
  hrefMobile: string;
};

export type ConciergeVehicleDraft = {
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  nickname: string;
  color: string;
  vin: string;
  mileageKm: number | null;
  fuelType: string;
  transmission: string;
  isPrimary: boolean;
  imageUrl: string;
};

export type ConciergePendingQuote = {
  type: "quote";
  lines: ConciergeQuoteLine[];
};

export type ConciergePendingBook = {
  type: "book";
  categoryId: string;
  category: string;
  service: string;
  vehicleId: string | null;
  notes: string;
  location: string;
};

export type ConciergePendingNavigate = {
  type: "navigate";
  destination: string;
  href: string;
  hrefMobile: string;
  title: string;
  description: string;
};

export type ConciergePendingAuth = {
  type: "auth";
  href: string;
  hrefMobile: string;
  title: string;
  description: string;
  next: string;
};

export type ConciergePendingVehicleCreate = ConciergeVehicleDraft & {
  type: "vehicle_create";
};

export type ConciergePendingVehicleUpdate = {
  type: "vehicle_update";
  vehicleId: string;
  label: string;
  summary: string;
  updates: Partial<ConciergeVehicleDraft> & { vehicleId?: never };
};

export type ConciergePendingProfileUpdate = {
  type: "profile_update";
  name: string;
  phone: string;
  address: string;
};

export type ConciergePendingAddressCreate = {
  type: "address_create";
  label: string;
  fullAddress: string;
  isDefault: boolean;
};

export type ConciergePendingAction =
  | ConciergePendingQuote
  | ConciergePendingBook
  | ConciergePendingNavigate
  | ConciergePendingAuth
  | ConciergePendingVehicleCreate
  | ConciergePendingVehicleUpdate
  | ConciergePendingProfileUpdate
  | ConciergePendingAddressCreate;

export type ConciergeChatResponse = {
  reply: string;
  pendingAction: ConciergePendingAction | null;
  productBrowse: ConciergeProductBrowse | null;
  productDetail: ConciergeProductDetailView | null;
  shopCategories: ConciergeShopDepartment[] | null;
  orderBrowse: ConciergeOrderCard[] | null;
  bookingBrowse: ConciergeBookingCard[] | null;
  configured: true;
};

export type ConciergeActQuoteResult = {
  ok: true;
  type: "quote";
  lines: ConciergeQuoteLine[];
};

export type ConciergeActBookResult = {
  ok: true;
  type: "book";
  requestId: string;
  trackPath: string;
};

export type ConciergeActGuideResult = {
  ok: true;
  type: Exclude<ConciergePendingAction["type"], "quote" | "book">;
  href?: string;
  hrefMobile?: string;
  vehicleId?: string;
  addressId?: string;
  message: string;
};

export type ConciergeActError = {
  ok: false;
  error: string;
  code?: string;
  field?: "location" | "phone" | "sign_in" | "service";
  requestId?: string;
  trackPath?: string;
};

export type ConciergeActResult =
  | ConciergeActQuoteResult
  | ConciergeActBookResult
  | ConciergeActGuideResult
  | ConciergeActError;
