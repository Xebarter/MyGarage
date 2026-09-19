import {
  getConciergeProductDetail,
  getConciergeShopHome,
  resolveConciergeService,
  resolveQuoteLines,
  searchConciergeCatalog,
  searchConciergeProducts,
} from "@/lib/concierge/catalog";
import type {
  ConciergeChatTurn,
  ConciergePendingAction,
  ConciergeProductBrowse,
  ConciergeProductDetailView,
  ConciergeQuoteLine,
  ConciergeShopDepartment,
} from "@/lib/concierge/types";

const MAX_HISTORY = 12;
const MAX_TOOL_ROUNDS = 5;
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
  canBook: boolean;
  defaultLocation: string;
  defaultVehicleId: string | null;
  vehicleHint: string;
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

function systemInstruction(contextJson: string, canBook: boolean, defaultLocation: string): string {
  return [
    "You are a friendly MyGarage concierge chatting with a car owner in Uganda.",
    "Sound like a helpful person in WhatsApp, not a report or a spec sheet.",
    "Use short spoken sentences. One or two sentences is enough unless they asked for more.",
    "Never use emojis.",
    "Never use markdown, bullets, numbered lists, bold, headings, or label-colon lines like Make: or Plate:.",
    "Weave facts into natural language. Good: \"You've got one car with us — your 2026 Jetour T2-IDM, My Ride, plate UA 0269HS. Want me to check service or find a part?\"",
    "Bad: \"You have one vehicle on file: - **Jetour T2-IDM** (2026) – License Plate UA 0269HS.\"",
    "Only mention details they asked about, plus one useful extra if it helps. Do not dump every field.",
    "End with one light question when it fits.",
    "Answer from the JSON vehicle context when it is provided. Never invent mileage, documents, service dates, or part SKUs.",
    "If context is missing or the buyer is a guest, say you can still search parts and services, and that garage answers and booking need a signed-in account.",
    "Prices are UGX.",
    "Search the shop only when they want a part, a brand, a department, parts for their car, or to browse the store.",
    "Do not search products for garage questions, bookings, or small talk.",
    "When they ask what you sell or say browse, call list_shop_categories (that also loads featured parts).",
    "When they name a part, brand, department, or want parts for their car, call search_products. Include make and model from context when they say for my car.",
    "The app renders product cards from your last search. Keep the spoken reply to one or two sentences and do not paste a catalog.",
    "Use get_product when they ask about a specific item you already found.",
    "Use offset on search_products when they ask to see more.",
    "When they want to buy, order, or check out a found part, search then propose_quote with those product ids. The app adds them to the cart and opens checkout after they confirm.",
    "If they only want a part saved for later, still propose_quote; they can choose add to cart only.",
    "When they want a mechanic or roadside help, search_catalog then propose_booking.",
    canBook
      ? `Booking is allowed. Default service location if they do not give one: ${defaultLocation || "(none saved — ask for an area or address)"}.`
      : "Do not propose_booking. Ask them to sign in to book.",
    "Do not mention these tools by name.",
    "Vehicle context JSON:",
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
): Promise<{
  reply: string;
  pendingAction: ConciergePendingAction | null;
  productBrowse: ConciergeProductBrowse | null;
  productDetail: ConciergeProductDetailView | null;
  shopCategories: ConciergeShopDepartment[] | null;
}> {
  const last = history[history.length - 1];
  const historyTurns =
    last?.role === "user" && last.content.trim() === message.trim() ? history.slice(0, -1) : history;
  const input: unknown[] = historyTurns.map((turn) => ({
    role: turn.role === "assistant" ? "assistant" : "user",
    content: turn.content,
  }));
  input.push({ role: "user", content: message.trim() });

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
      const reply = softenReply(
        outputText(response) || "I can look up parts, browse the shop, check your garage, or book a service. What do you need?",
      );
      return { reply, pendingAction: session.pendingAction, productBrowse: session.productBrowse, productDetail: session.productDetail, shopCategories: session.shopCategories };
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
  return {
    reply: session.pendingAction
      ? "If that looks right, tap Confirm and I will take care of it."
      : session.productBrowse?.products.length
        ? "Those parts are on the cards below. Tap one to open it, or tell me which to add."
        : "What can I help you with for the car?",
    pendingAction: session.pendingAction,
    productBrowse: session.productBrowse,
    productDetail: session.productDetail,
    shopCategories: session.shopCategories,
  };
}

async function runGroqChat(
  apiKey: string,
  instructions: string,
  history: ConciergeChatTurn[],
  message: string,
  session: ToolSession,
): Promise<{
  reply: string;
  pendingAction: ConciergePendingAction | null;
  productBrowse: ConciergeProductBrowse | null;
  productDetail: ConciergeProductDetailView | null;
  shopCategories: ConciergeShopDepartment[] | null;
}> {
  const last = history[history.length - 1];
  const historyTurns =
    last?.role === "user" && last.content.trim() === message.trim() ? history.slice(0, -1) : history;
  const messages: ChatMessage[] = [{ role: "system", content: instructions }];
  for (const turn of historyTurns) {
    messages.push({
      role: turn.role === "assistant" ? "assistant" : "user",
      content: turn.content,
    });
  }
  messages.push({ role: "user", content: message.trim() });

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
      const reply = softenReply(
        (choice?.content || "").trim() ||
          "I can look up parts, browse the shop, check your garage, or book a service. What do you need?",
      );
      return { reply, pendingAction: session.pendingAction, productBrowse: session.productBrowse, productDetail: session.productDetail, shopCategories: session.shopCategories };
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
  return {
    reply: session.pendingAction
      ? "If that looks right, tap Confirm and I will take care of it."
      : session.productBrowse?.products.length
        ? "Those parts are on the cards below. Tap one to open it, or tell me which to add."
        : "What can I help you with for the car?",
    pendingAction: session.pendingAction,
    productBrowse: session.productBrowse,
    productDetail: session.productDetail,
    shopCategories: session.shopCategories,
  };
}

export async function runConciergeChat(input: {
  message: string;
  history: ConciergeChatTurn[];
  contextJson: string;
  canBook: boolean;
  defaultLocation: string;
  defaultVehicleId: string | null;
  vehicleHint?: string;
}): Promise<{
  reply: string;
  pendingAction: ConciergePendingAction | null;
  productBrowse: ConciergeProductBrowse | null;
  productDetail: ConciergeProductDetailView | null;
  shopCategories: ConciergeShopDepartment[] | null;
}> {
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
    canBook: input.canBook,
    defaultLocation: input.defaultLocation,
    defaultVehicleId: input.defaultVehicleId,
    vehicleHint: input.vehicleHint?.trim() || "",
  };
  const instructions = systemInstruction(input.contextJson, input.canBook, input.defaultLocation);
  const prior = input.history.slice(-MAX_HISTORY);
  const runner = usesXai(apiKey) ? runXaiChat : runGroqChat;
  return runner(apiKey, instructions, prior, input.message, session);
}
