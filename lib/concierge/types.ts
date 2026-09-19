export type ConciergeChatRole = "user" | "assistant";

export type ConciergeChatTurn = {
  role: ConciergeChatRole;
  content: string;
};

export type ConciergeQuoteLine = {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  vendorId?: string;
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

export type ConciergePendingAction = ConciergePendingQuote | ConciergePendingBook;

export type ConciergeChatResponse = {
  reply: string;
  pendingAction: ConciergePendingAction | null;
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

export type ConciergeActError = {
  ok: false;
  error: string;
  code?: string;
  field?: "location" | "phone" | "sign_in" | "service";
};

export type ConciergeActResult = ConciergeActQuoteResult | ConciergeActBookResult | ConciergeActError;
