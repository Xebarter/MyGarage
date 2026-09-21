import {
  getConciergeProductDetail,
  getConciergeShopHome,
  resolveConciergeService,
  resolveQuoteLines,
  searchConciergeCatalog,
  searchConciergeProducts,
} from "@/lib/concierge/catalog";
import type {
  ConciergeBookingCard,
  ConciergeChatTurn,
  ConciergeOrderCard,
  ConciergePendingAction,
  ConciergeProductBrowse,
  ConciergeProductDetailView,
  ConciergeQuoteLine,
  ConciergeShopDepartment,
} from "@/lib/concierge/types";
import {
  addressCreateAction,
  authHref,
  CONCIERGE_DESTINATIONS,
  listConciergeBookings,
  listConciergeOrders,
  matchVehicleId,
  navigateAction,
  profileUpdateAction,
  resolveConciergeDestination,
  vehicleCreateAction,
  vehicleDraftFromArgs,
  vehicleUpdateAction,
  optionalImageUrl,
} from "@/lib/concierge/guides";

const MAX_HISTORY = 12;
const MAX_TOOL_ROUNDS = 6;
const FALLBACK_REPLY =
  "I can set up your account, add a car, find parts, place an order, track deliveries, or book a mechanic. What should we do first?";

type ConciergeRunResult = {
  reply: string;
  pendingAction: ConciergePendingAction | null;
  productBrowse: ConciergeProductBrowse | null;
  productDetail: ConciergeProductDetailView | null;
  shopCategories: ConciergeShopDepartment[] | null;
  orderBrowse: ConciergeOrderCard[] | null;
  bookingBrowse: ConciergeBookingCard[] | null;
};

function sessionResult(session: ToolSession, reply: string): ConciergeRunResult {
  return {
    reply,
    pendingAction: session.pendingAction,
    productBrowse: session.productBrowse,
    productDetail: session.productDetail,
    shopCategories: session.shopCategories,
    orderBrowse: session.orderBrowse,
    bookingBrowse: session.bookingBrowse,
  };
}
const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export function isGrokConfigured(): boolean {
  return Boolean(grokApiKey());
}

function sanitizeKey(raw: string | undefined): string {
  return (raw || "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function grokApiKey(): string {
  return (
    sanitizeKey(process.env.GROQ_API_KEY) ||
    sanitizeKey(process.env.GROK_API_KEY) ||
    sanitizeKey(process.env.XAI_API_KEY)
  );
}

function usesXai(apiKey: string): boolean {
  return apiKey.startsWith("xai-");
}

function grokModel(apiKey: string): string {
  const override = process.env.GROK_MODEL?.trim() || process.env.GROQ_MODEL?.trim() || process.env.XAI_MODEL?.trim();
  if (override) return override;
  return usesXai(apiKey) ? "grok-4.6" : "openai/gpt-oss-120b";
}

export type GrokFailure = {
  code: string;
  status: number;
  error: string;
};

class GrokHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GrokHttpError";
    this.status = status;
  }
}

function grokErrorStatus(error: unknown): number {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    if (Number.isFinite(status) && status > 0) return status;
  }
  return 0;
}

function grokErrorDetail(status: number, json: unknown): string {
  if (json && typeof json === "object") {
    const rec = json as Record<string, unknown>;
    if (typeof rec.error === "string" && rec.error.trim()) return rec.error.trim();
    if (rec.error && typeof rec.error === "object") {
      const err = rec.error as Record<string, unknown>;
      if (typeof err.message === "string" && err.message.trim()) return err.message.trim();
    }
    if (typeof rec.message === "string" && rec.message.trim()) return rec.message.trim();
  }
  return `Grok request failed (${status})`;
}

export function classifyGrokError(error: unknown): GrokFailure {
  const status = grokErrorStatus(error);
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (status === 401 || lower.includes("incorrect api key") || lower.includes("invalid api key")) {
    return {
      code: "GROK_UNAUTHORIZED",
      status: 401,
      error: "That API key was rejected. Use a Groq key from console.groq.com/keys as GROK_API_KEY.",
    };
  }
  if (
    status === 402 ||
    lower.includes("credits") ||
    lower.includes("billing") ||
    lower.includes("insufficient")
  ) {
    return {
      code: "GROK_CREDITS",
      status: 402,
      error: "API credits are depleted. Add credits in the Groq or xAI console, then try again.",
    };
  }
  if (status === 429) {
    return {
      code: "GROK_RATE_LIMIT",
      status: 429,
      error: "Concierge is busy right now. Try again in a moment.",
    };
  }
  if (status === 400) {
    return {
      code: "GROK_BAD_REQUEST",
      status: 400,
      error: raw || "Grok rejected the request.",
    };
  }
  if (status === 404 || (lower.includes("model") && lower.includes("not found"))) {
    return {
      code: "GROK_MODEL_UNAVAILABLE",
      status: 502,
      error: "That model is unavailable. Set GROK_MODEL to a current Groq model id.",
    };
  }
  return {
    code: "GROK_ERROR",
    status: 502,
    error: "Failed to reach concierge.",
  };
}

const TOOL_PARAMS = {
  list_shop_categories: {
    name: "list_shop_categories",
    description:
      "List MyGarage shop departments and their part groups. Use when the buyer wants to browse the store, asks what you sell, or needs a category to pick from.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  search_products: {
    name: "search_products",
    description:
      "Browse and search published shop products. Use for parts, accessories, brands, categories, price filters, and 'show more' with offset. Prefer this over guessing names. Include the vehicle make/model in query when they want parts for their car.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search text, e.g. oil filter or brake pads." },
        category: { type: "string", description: "Shop department or subcategory, e.g. BRAKING SYSTEM or Brake Pads." },
        brand: { type: "string" },
        minPrice: { type: "number" },
        maxPrice: { type: "number" },
        offset: { type: "number", description: "Skip this many ranked results for pagination." },
        sort: {
          type: "string",
          enum: ["relevance", "price_asc", "price_desc", "newest"],
        },
      },
    },
  },
  get_product: {
    name: "get_product",
    description: "Load one product's details and a few related items. Use a product id from search_products.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" },
      },
      required: ["productId"],
    },
  },
  search_catalog: {
    name: "search_catalog",
    description:
      "Search both shop products and bookable services. Use when the buyer might want either a part or a mechanic.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Buyer search text, e.g. oil filter Corolla or oil service." },
        category: { type: "string" },
      },
      required: ["query"],
    },
  },
  propose_quote: {
    name: "propose_quote",
    description:
      "Propose buying catalog products. Only use product ids returned by search_products or search_catalog. Buyer must confirm. After confirm the app adds them to the cart and can open checkout.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              productId: { type: "string" },
              quantity: { type: "number" },
            },
            required: ["productId"],
          },
        },
      },
      required: ["items"],
    },
  },
  propose_booking: {
    name: "propose_booking",
    description:
      "Propose a dispatched service booking. Use a categoryId and service name from search_catalog. Buyer must confirm. Do not call this for guests.",
    parameters: {
      type: "object",
      properties: {
        categoryId: { type: "string" },
        service: { type: "string" },
        vehicleId: { type: "string" },
        notes: { type: "string" },
        location: {
          type: "string",
          description:
            "Where to send the provider. Use the saved default address when the buyer did not specify one.",
        },
      },
      required: ["categoryId", "service"],
    },
  },
  list_guides: {
    name: "list_guides",
    description:
      "List what you can do in the app: account, garage, shop, checkout, orders, bookings, profile, addresses. Call this when they ask what you can help with or how the app works.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  propose_navigate: {
    name: "propose_navigate",
    description:
      "Take the buyer to a real app page. Use for dashboard, garage, shop, cart, checkout, orders, profile, addresses, services, wishlist, support, or home. Prefer this over describing where to click.",
    parameters: {
      type: "object",
      properties: {
        destination: {
          type: "string",
          description: "One of: home, shop, cart, checkout, auth, dashboard, garage, orders, services, wishlist, addresses, profile, support.",
        },
        orderId: { type: "string", description: "When opening a specific order." },
        vehicleId: { type: "string", description: "When opening a specific car." },
        requestId: { type: "string", description: "When opening a specific service booking." },
      },
      required: ["destination"],
    },
  },
  propose_auth: {
    name: "propose_auth",
    description:
      "Open sign in / create account. Use when a guest wants to save a car, book, track orders, or explicitly create an account. Do not use if they are already signed in.",
    parameters: {
      type: "object",
      properties: {
        next: { type: "string", description: "Path to continue after sign in, e.g. /buyer/garage." },
      },
    },
  },
  propose_add_vehicle: {
    name: "propose_add_vehicle",
    description:
      "Save a car to the garage after you have make, model, and year. Buyer confirms on a card. Call this as soon as those three exist. Do not wait for plate or nickname. Do not use for guests.",
    parameters: {
      type: "object",
      properties: {
        make: { type: "string" },
        model: { type: "string" },
        year: { type: "number" },
        licensePlate: { type: "string" },
        nickname: { type: "string" },
        color: { type: "string" },
        vin: { type: "string" },
        mileageKm: { type: "number" },
        fuelType: { type: "string", enum: ["petrol", "diesel", "hybrid", "electric", "other"] },
        transmission: { type: "string", enum: ["manual", "automatic", "other"] },
        isPrimary: { type: "boolean" },
        imageUrl: {
          type: "string",
          description: "Public URL of an uploaded vehicle photo. Use the attached photo URL from the message when present.",
        },
      },
      required: ["make", "model", "year"],
    },
  },
  propose_update_vehicle: {
    name: "propose_update_vehicle",
    description:
      "Update an existing car (photo, mileage, plate, nickname, color, fuel, make/model/year). Identify the vehicle from context. Buyer confirms. Do not use for guests. Use this to save an attached photo onto a car.",
    parameters: {
      type: "object",
      properties: {
        vehicleId: { type: "string" },
        vehicleHint: { type: "string", description: "Nickname, plate, or make/model if id is unknown." },
        make: { type: "string" },
        model: { type: "string" },
        year: { type: "number" },
        licensePlate: { type: "string" },
        nickname: { type: "string" },
        color: { type: "string" },
        vin: { type: "string" },
        mileageKm: { type: "number" },
        fuelType: { type: "string" },
        transmission: { type: "string" },
        isPrimary: { type: "boolean" },
        imageUrl: {
          type: "string",
          description: "Public URL of an uploaded vehicle photo. Use the attached photo URL from the message when present.",
        },
      },
    },
  },
  list_orders: {
    name: "list_orders",
    description:
      "List recent parts orders with status and totals. Use when they ask about orders, tracking, receipts, or delivery. Then offer to open one. Do not use for guests.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  list_bookings: {
    name: "list_bookings",
    description:
      "List roadside and workshop bookings. Use when they ask about a mechanic, a service request, or tracking a provider. Then offer to open one. Do not use for guests.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  propose_update_profile: {
    name: "propose_update_profile",
    description: "Update the buyer's name, phone, or address. Collect the new value first. Buyer confirms.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        address: { type: "string" },
      },
    },
  },
  propose_add_address: {
    name: "propose_add_address",
    description: "Save a delivery or service address. Collect the area or street first. Buyer confirms.",
    parameters: {
      type: "object",
      properties: {
        label: { type: "string" },
        fullAddress: { type: "string" },
        isDefault: { type: "boolean" },
      },
      required: ["fullAddress"],
    },
  },
} as const;

const XAI_TOOLS = Object.values(TOOL_PARAMS).map((tool) => ({
  type: "function" as const,
  name: tool.name,
  description: tool.description,
  parameters: tool.parameters,
}));

const GROQ_TOOLS = Object.values(TOOL_PARAMS).map((tool) => ({
  type: "function" as const,
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
}));

type ToolSession = {
  allowedProductIds: string[];
  pendingAction: ConciergePendingAction | null;
  productBrowse: ConciergeProductBrowse | null;
  productDetail: ConciergeProductDetailView | null;
  shopCategories: ConciergeShopDepartment[] | null;
  orderBrowse: ConciergeOrderCard[] | null;
  bookingBrowse: ConciergeBookingCard[] | null;
  canBook: boolean;
  signedIn: boolean;
  customerId: string | null;
  defaultLocation: string;
  defaultVehicleId: string | null;
  vehicleHint: string;
  attachedImageUrl: string;
  vehicles: Array<{
    id: string;
    make?: string;
    model?: string;
    year?: number;
    nickname?: string | null;
    licensePlate?: string | null;
  }>;
};

type GrokOutputItem = {
  type?: string;
  call_id?: string;
  id?: string;
  name?: string;
  arguments?: string;
  content?: unknown;
};

type GrokResponsesResult = {
  id?: string;
  output_text?: string;
  output?: GrokOutputItem[];
};

type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: GroqToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

type GroqToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: GroqToolCall[];
    };
  }>;
};

function systemInstruction(contextJson: string, canBook: boolean, signedIn: boolean, defaultLocation: string): string {
  return [
    "You are the MyGarage Concierge — a professional in-app assistant for car owners in Uganda.",
    "You guide people through the product by taking action, not by describing menus or telling them where to tap.",
    "You can: create or open an account, add and update cars, save a car photo, browse and order parts, checkout, track orders, book a mechanic, track bookings, and update profile or addresses.",
    "Complete jobs end to end. Collect only the missing facts, then call the matching propose_* tool so the app shows a confirmation card and performs the change.",
    "When they need a page, call propose_navigate so the app opens it. Never say go to Settings or open the menu.",
    "When a guest needs an account, garage, orders, profile, or booking, call propose_auth with a sensible next path.",
    "When they want to add a car and you have make, model, and year, call propose_add_vehicle immediately. Do not wait for plate, nickname, colour, or mileage. Include imageUrl when they attached a photo.",
    "When they want to change a car (photo, mileage, plate, nickname, colour, fuel), identify the car and call propose_update_vehicle.",
    "They attach photos with the paperclip in this chat. When a photo URL is in the message, pass it as imageUrl. If they only sent a photo and already have a car, save it to that car. Never tell them to email a picture or open the garage to upload.",
    "When they ask about parts orders or delivery, call list_orders, then offer to open one with propose_navigate.",
    "When they ask about a mechanic visit or service request, call list_bookings, then offer to open tracking.",
    "When they want to buy parts, search then propose_quote. The app adds to cart and can open checkout.",
    "When they want a mechanic or roadside help, search_catalog then propose_booking.",
    "Keep replies short, calm, and specific. One or two sentences unless they asked for more.",
    "Never use emojis. Never use markdown, bullets, numbered lists, bold, or label-colon dumps.",
    "Weave facts into natural language. End with one clear next step when it fits.",
    "Never invent mileage, documents, prices, or order ids. Use tools and the JSON context.",
    signedIn
      ? "This buyer is signed in. You may change garage, profile, addresses, and bookings after they confirm."
      : "This visitor is a guest. They may still browse and quote parts. For garage, orders, profile, and booking, propose_auth.",
    "Prices are UGX.",
    canBook
      ? `Booking is allowed. Default service location if they do not give one: ${defaultLocation || "(none saved — ask for an area or address)"}.`
      : "Do not propose_booking until they sign in.",
    "Do not mention these tools by name.",
    "Vehicle and account context JSON:",
    contextJson,
  ].join("\n");
}

function softenReply(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|\s)\*(?!\s)(.+?)\*(?=\s|[.,!?)]|$)/g, "$1$2")
    .replace(/^[\t ]*[-•*]\s+/gm, "")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/\u202f|\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function argsWithAttachedImage(args: Record<string, unknown>, session: ToolSession): Record<string, unknown> {
  const fromArgs = optionalImageUrl(args.imageUrl || args.photoUrl || args.photo);
  return {
    ...args,
    imageUrl: fromArgs || session.attachedImageUrl,
  };
}

function spokenWithImage(text: string, imageUrl?: string | null): string {
  const spoken = text.trim() || (imageUrl ? "I attached a photo of my car." : "");
  if (!imageUrl) return spoken;
  return `${spoken}\n\n[Attached photo URL: ${imageUrl}] Use this URL as imageUrl when saving or updating a vehicle.`;
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}") as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function functionCalls(result: GrokResponsesResult): GrokOutputItem[] {
  return (result.output ?? []).filter((item) => item.type === "function_call" && Boolean(item.name));
}

function outputText(result: GrokResponsesResult): string {
  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }
  const chunks: string[] = [];
  for (const item of result.output ?? []) {
    if (item.type !== "message") continue;
    if (typeof item.content === "string") {
      chunks.push(item.content);
      continue;
    }
    if (!Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part && typeof part === "object" && "text" in part) {
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string" && text.trim()) chunks.push(text);
      }
    }
  }
  return chunks.join("\n").trim();
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  session: ToolSession,
): Promise<unknown> {
  if (name === "list_shop_categories") {
    const home = await getConciergeShopHome();
    session.shopCategories = home.departments;
    session.productBrowse = home.browse;
    for (const product of home.browse.products) session.allowedProductIds.push(product.id);
    return {
      departments: home.departments.map((dept) => ({ title: dept.title, groups: dept.children })),
      featured: home.browse.products.map((row) => ({
        id: row.id,
        name: row.name,
        price: row.price,
        brand: row.brand,
        category: row.category,
      })),
    };
  }
  if (name === "search_products") {
    const browse = await searchConciergeProducts({
      query: typeof args.query === "string" ? args.query : "",
      category: typeof args.category === "string" ? args.category : undefined,
      brand: typeof args.brand === "string" ? args.brand : undefined,
      minPrice: typeof args.minPrice === "number" ? args.minPrice : undefined,
      maxPrice: typeof args.maxPrice === "number" ? args.maxPrice : undefined,
      offset: typeof args.offset === "number" ? args.offset : undefined,
      sort:
        args.sort === "price_asc" || args.sort === "price_desc" || args.sort === "newest" || args.sort === "relevance"
          ? args.sort
          : "relevance",
      vehicleHint: session.vehicleHint,
    });
    for (const product of browse.products) session.allowedProductIds.push(product.id);
    session.productBrowse = browse;
    if (browse.departments?.length) session.shopCategories = browse.departments;
    return {
      title: browse.title,
      total: browse.total,
      offset: browse.offset,
      hasMore: browse.hasMore,
      departments: browse.departments?.map((dept) => dept.title),
      products: browse.products.map((row) => ({
        id: row.id,
        name: row.name,
        price: row.price,
        brand: row.brand,
        category: row.category,
      })),
    };
  }
  if (name === "get_product") {
    const productId = typeof args.productId === "string" ? args.productId : "";
    const detail = await getConciergeProductDetail(productId);
    if (!detail) return { error: "Product not found or unpublished." };
    session.allowedProductIds.push(detail.product.id);
    for (const related of detail.related) session.allowedProductIds.push(related.id);
    session.productDetail = { ...detail.product, related: detail.related };
    session.productBrowse = {
      title: "Related parts",
      total: detail.related.length,
      offset: 0,
      hasMore: false,
      products: detail.related,
    };
    return {
      product: {
        id: detail.product.id,
        name: detail.product.name,
        price: detail.product.price,
        brand: detail.product.brand,
        category: detail.product.category,
        description: detail.product.description,
      },
      related: detail.related.map((row) => ({ id: row.id, name: row.name, price: row.price })),
    };
  }
  if (name === "search_catalog") {
    const query = typeof args.query === "string" ? args.query : "";
    const result = await searchConciergeCatalog(query, {
      category: typeof args.category === "string" ? args.category : undefined,
      vehicleHint: session.vehicleHint,
    });
    for (const product of result.products) session.allowedProductIds.push(product.id);
    if (result.browse.products.length > 0) {
      session.productBrowse = result.browse;
      if (result.browse.departments?.length) session.shopCategories = result.browse.departments;
    }
    return {
      products: result.products.map((row) => ({
        id: row.id,
        name: row.name,
        price: row.price,
        brand: row.brand,
        category: row.category,
      })),
      services: result.services,
    };
  }
  if (name === "propose_quote") {
    const rawItems = Array.isArray(args.items) ? args.items : [];
    const items = rawItems
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const rec = row as Record<string, unknown>;
        return {
          productId: String(rec.productId ?? rec.product_id ?? ""),
          quantity: Number(rec.quantity) || 1,
        };
      })
      .filter((row): row is { productId: string; quantity: number } => Boolean(row?.productId));
    const lines: ConciergeQuoteLine[] = await resolveQuoteLines(items, session.allowedProductIds);
    if (lines.length === 0) {
      return { error: "No matching catalog products. Search first, then quote only those ids." };
    }
    session.pendingAction = { type: "quote", lines };
    return { ok: true, lines };
  }
  if (name === "propose_booking") {
    if (!session.canBook) {
      return { error: "Sign in is required to book." };
    }
    const resolved = resolveConciergeService({
      categoryId: typeof args.categoryId === "string" ? args.categoryId : null,
      service: typeof args.service === "string" ? args.service : "",
    });
    if (!resolved) {
      return { error: "That service is not in the MyGarage catalog." };
    }
    const location =
      (typeof args.location === "string" && args.location.trim()) || session.defaultLocation;
    const vehicleId =
      (typeof args.vehicleId === "string" && args.vehicleId.trim()) || session.defaultVehicleId;
    session.pendingAction = {
      type: "book",
      categoryId: resolved.categoryId,
      category: resolved.categoryTitle,
      service: resolved.name,
      vehicleId,
      notes: typeof args.notes === "string" ? args.notes.trim() : "",
      location,
    };
    return { ok: true, booking: session.pendingAction };
  }
  if (name === "list_guides") {
    return {
      signedIn: session.signedIn,
      canDo: session.signedIn
        ? [
            "Add or update cars",
            "Save a car photo",
            "Order parts and checkout",
            "Track orders",
            "Track service bookings",
            "Book a mechanic",
            "Update profile and addresses",
            "Open any buyer page",
          ]
        : ["Browse and order parts", "Create an account", "Open shop, cart, or checkout"],
      pages: CONCIERGE_DESTINATIONS.filter((row) => session.signedIn || row.guestOk).map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
      })),
    };
  }
  if (name === "propose_navigate") {
    const dest = resolveConciergeDestination(String(args.destination ?? ""));
    if (!dest) return { error: "Unknown destination. Use list_guides." };
    if (!dest.guestOk && !session.signedIn) {
      session.pendingAction = authHref(dest.href);
      return { ok: true, needsSignIn: true, after: dest.title };
    }
    const orderId = typeof args.orderId === "string" ? args.orderId.trim() : "";
    const vehicleId = typeof args.vehicleId === "string" ? args.vehicleId.trim() : "";
    const requestId = typeof args.requestId === "string" ? args.requestId.trim() : "";
    let href = dest.href;
    let hrefMobile = dest.hrefMobile;
    if (dest.id === "orders" && orderId) {
      href = `/buyer/orders/${encodeURIComponent(orderId)}`;
      hrefMobile = `/orders/${encodeURIComponent(orderId)}`;
    }
    if (dest.id === "garage" && vehicleId) {
      href = `/buyer/garage/${encodeURIComponent(vehicleId)}`;
      hrefMobile = `/garage/${encodeURIComponent(vehicleId)}`;
    }
    if (dest.id === "services" && requestId) {
      href = `/buyer/services/track/${encodeURIComponent(requestId)}`;
      hrefMobile = `/service/requesting?requestId=${encodeURIComponent(requestId)}`;
    }
    session.pendingAction = navigateAction(dest, { href, hrefMobile });
    return { ok: true, navigation: session.pendingAction };
  }
  if (name === "propose_auth") {
    if (session.signedIn) return { error: "They are already signed in." };
    const next = typeof args.next === "string" && args.next.startsWith("/") ? args.next : "/buyer";
    session.pendingAction = authHref(next);
    return { ok: true, auth: session.pendingAction };
  }
  if (name === "propose_add_vehicle") {
    if (!session.signedIn) {
      session.pendingAction = authHref("/buyer/garage");
      return { ok: true, needsSignIn: true };
    }
    const created = vehicleCreateAction(vehicleDraftFromArgs(argsWithAttachedImage(args, session)));
    if ("error" in created) return created;
    session.pendingAction = created;
    return { ok: true, vehicle: created };
  }
  if (name === "propose_update_vehicle") {
    if (!session.signedIn) {
      session.pendingAction = authHref("/buyer/garage");
      return { ok: true, needsSignIn: true };
    }
    const hint = String(args.vehicleHint ?? args.vehicleId ?? "");
    const vehicleId = matchVehicleId(session.vehicles, hint, session.defaultVehicleId);
    if (!vehicleId) return { error: "No car on file. Add one first." };
    const current = session.vehicles.find((row) => row.id === vehicleId);
    const updated = vehicleUpdateAction({
      vehicleId,
      label: [current?.nickname, current?.year, current?.make, current?.model].filter(Boolean).join(" "),
      current: current
        ? {
            make: current.make || "",
            model: current.model || "",
            year: current.year || 0,
            licensePlate: current.licensePlate || "",
            nickname: current.nickname || "",
          }
        : undefined,
      args: argsWithAttachedImage(args, session),
    });
    if ("error" in updated) return updated;
    session.pendingAction = updated;
    return { ok: true, vehicle: updated };
  }
  if (name === "list_orders") {
    if (!session.signedIn || !session.customerId) {
      session.pendingAction = authHref("/buyer/orders");
      return { ok: true, needsSignIn: true };
    }
    const orders = await listConciergeOrders(session.customerId);
    session.orderBrowse = orders;
    return {
      count: orders.length,
      orders: orders.map((row) => ({
        id: row.id,
        status: row.status,
        total: row.total,
        items: row.itemSummary,
      })),
    };
  }
  if (name === "list_bookings") {
    if (!session.signedIn || !session.customerId) {
      session.pendingAction = authHref("/buyer/services");
      return { ok: true, needsSignIn: true };
    }
    const bookings = await listConciergeBookings(session.customerId);
    session.bookingBrowse = bookings;
    return {
      count: bookings.length,
      bookings: bookings.map((row) => ({
        id: row.id,
        status: row.status,
        service: row.service,
        location: row.location,
      })),
    };
  }
  if (name === "propose_update_profile") {
    if (!session.signedIn) {
      session.pendingAction = authHref("/buyer/profile");
      return { ok: true, needsSignIn: true };
    }
    const next = profileUpdateAction(args);
    if ("error" in next) return next;
    session.pendingAction = next;
    return { ok: true, profile: next };
  }
  if (name === "propose_add_address") {
    if (!session.signedIn) {
      session.pendingAction = authHref("/buyer/addresses");
      return { ok: true, needsSignIn: true };
    }
    const next = addressCreateAction(args);
    if ("error" in next) return next;
    session.pendingAction = next;
    return { ok: true, address: next };
  }
  return { error: `Unknown tool ${name}` };
}

async function postJson(url: string, apiKey: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    const detail = grokErrorDetail(response.status, json);
    console.error("Grok API error:", response.status, json);
    throw new GrokHttpError(response.status, detail);
  }
  return json;
}

async function runXaiChat(
  apiKey: string,
  instructions: string,
  history: ConciergeChatTurn[],
  message: string,
  session: ToolSession,
): Promise<ConciergeRunResult> {
  const last = history[history.length - 1];
  const historyTurns =
    last?.role === "user" && last.content.trim() === message.trim() ? history.slice(0, -1) : history;
  const input: unknown[] = historyTurns.map((turn) => ({
    role: turn.role === "assistant" ? "assistant" : "user",
    content: spokenWithImage(turn.content, turn.imageUrl),
  }));
  const latest = spokenWithImage(message, session.attachedImageUrl);
  if (session.attachedImageUrl) {
    input.push({
      role: "user",
      content: [
        { type: "input_text", text: latest },
        { type: "input_image", image_url: session.attachedImageUrl },
      ],
    });
  } else {
    input.push({ role: "user", content: latest });
  }

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = (await postJson(XAI_RESPONSES_URL, apiKey, {
      model: grokModel(apiKey),
      instructions,
      input,
      tools: XAI_TOOLS,
      store: false,
    })) as GrokResponsesResult;
    const calls = functionCalls(response);
    if (calls.length === 0) {
      const reply = softenReply(outputText(response) || FALLBACK_REPLY);
      return sessionResult(session, reply);
    }
    input.push(...calls);
    for (const call of calls) {
      const result = await runTool(call.name || "", parseArgs(call.arguments || ""), session);
      input.push({
        type: "function_call_output",
        call_id: call.call_id || call.id || "",
        output: JSON.stringify(result),
      });
    }
  }
  return sessionResult(
    session,
    session.pendingAction
      ? "If that looks right, confirm and I will take care of it."
      : session.productBrowse?.products.length
        ? "Those parts are on the cards below. Tap one to open it, or tell me which to add."
        : session.orderBrowse?.length
          ? "Your recent orders are on the cards below."
          : session.bookingBrowse?.length
            ? "Your service bookings are on the cards below."
            : FALLBACK_REPLY,
  );
}

async function runGroqChat(
  apiKey: string,
  instructions: string,
  history: ConciergeChatTurn[],
  message: string,
  session: ToolSession,
): Promise<ConciergeRunResult> {
  const last = history[history.length - 1];
  const historyTurns =
    last?.role === "user" && last.content.trim() === message.trim() ? history.slice(0, -1) : history;
  const messages: ChatMessage[] = [{ role: "system", content: instructions }];
  for (const turn of historyTurns) {
    messages.push({
      role: turn.role === "assistant" ? "assistant" : "user",
      content: spokenWithImage(turn.content, turn.imageUrl),
    });
  }
  messages.push({ role: "user", content: spokenWithImage(message, session.attachedImageUrl) });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = (await postJson(GROQ_CHAT_URL, apiKey, {
      model: grokModel(apiKey),
      messages,
      tools: GROQ_TOOLS,
      tool_choice: "auto",
    })) as GroqChatResponse;
    const choice = response.choices?.[0]?.message;
    const calls = choice?.tool_calls?.filter((call) => call?.function?.name) ?? [];
    if (calls.length === 0) {
      const reply = softenReply((choice?.content || "").trim() || FALLBACK_REPLY);
      return sessionResult(session, reply);
    }
    messages.push({
      role: "assistant",
      content: choice?.content ?? null,
      tool_calls: calls,
    });
    for (const call of calls) {
      const result = await runTool(call.function.name, parseArgs(call.function.arguments), session);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }
  return sessionResult(
    session,
    session.pendingAction
      ? "If that looks right, confirm and I will take care of it."
      : session.productBrowse?.products.length
        ? "Those parts are on the cards below. Tap one to open it, or tell me which to add."
        : session.orderBrowse?.length
          ? "Your recent orders are on the cards below."
          : session.bookingBrowse?.length
            ? "Your service bookings are on the cards below."
            : FALLBACK_REPLY,
  );
}

export async function runConciergeChat(input: {
  message: string;
  history: ConciergeChatTurn[];
  contextJson: string;
  canBook: boolean;
  signedIn: boolean;
  customerId?: string | null;
  defaultLocation: string;
  defaultVehicleId: string | null;
  vehicleHint?: string;
  imageUrl?: string | null;
  vehicles?: ToolSession["vehicles"];
}): Promise<ConciergeRunResult> {
  const apiKey = grokApiKey();
  if (!apiKey) {
    throw new Error("GROK_UNAVAILABLE");
  }

  const session: ToolSession = {
    allowedProductIds: [],
    pendingAction: null,
    productBrowse: null,
    productDetail: null,
    shopCategories: null,
    orderBrowse: null,
    bookingBrowse: null,
    canBook: input.canBook,
    signedIn: input.signedIn,
    customerId: input.customerId?.trim() || null,
    defaultLocation: input.defaultLocation,
    defaultVehicleId: input.defaultVehicleId,
    vehicleHint: input.vehicleHint?.trim() || "",
    attachedImageUrl: optionalImageUrl(input.imageUrl),
    vehicles: input.vehicles ?? [],
  };
  const instructions = systemInstruction(input.contextJson, input.canBook, input.signedIn, input.defaultLocation);
  const prior = input.history.slice(-MAX_HISTORY);
  const runner = usesXai(apiKey) ? runXaiChat : runGroqChat;
  return runner(apiKey, instructions, prior, input.message, session);
}
