'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Package, Send, Trash2, Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddressAutocomplete } from '@/components/location/address-autocomplete';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { addCartLine } from '@/lib/cart-client';
import { formatUgx } from '@/lib/format-ugx';
import {
  CONCIERGE_OPEN_EVENT,
  CONCIERGE_STORAGE_KEY,
  isConciergeConfirmPhrase,
  shouldHideConcierge,
  type ConciergeOpenDetail,
} from '@/lib/concierge/open';
import type {
  ConciergeActResult,
  ConciergePendingAction,
  ConciergeProductBrowse,
  ConciergeProductCard,
  ConciergeProductDetailView,
  ConciergeShopDepartment,
} from '@/lib/concierge/types';
import { resolveBuyerCustomerId } from '@/components/buyer/garage/utils';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  { label: 'Browse shop', prompt: 'Show me what you sell in the shop' },
  { label: 'Parts for my car', prompt: 'Find parts for my car' },
  { label: 'Brake pads', prompt: 'I need brake pads' },
  { label: 'Oil filter', prompt: 'I need an oil filter' },
  { label: 'What cars do I have?', prompt: 'What cars do I have?' },
  { label: 'Book oil service', prompt: 'Book an oil service' },
];

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pendingAction?: ConciergePendingAction | null;
  productBrowse?: ConciergeProductBrowse | null;
  productDetail?: ConciergeProductDetailView | null;
  shopCategories?: ConciergeShopDepartment[] | null;
  actDone?: boolean;
};

type StoredThread = {
  messages: ChatMessage[];
  pendingAction: ConciergePendingAction | null;
  vehicleId?: string;
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readThread(): StoredThread {
  if (typeof window === 'undefined') return { messages: [], pendingAction: null };
  try {
    const raw = localStorage.getItem(CONCIERGE_STORAGE_KEY);
    if (!raw) return { messages: [], pendingAction: null };
    const parsed = JSON.parse(raw) as StoredThread;
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      pendingAction: parsed.pendingAction ?? null,
      vehicleId: parsed.vehicleId,
    };
  } catch {
    return { messages: [], pendingAction: null };
  }
}

function writeThread(thread: StoredThread) {
  localStorage.setItem(CONCIERGE_STORAGE_KEY, JSON.stringify(thread));
}

function SuggestionChips({
  disabled,
  onPick,
}: {
  disabled?: boolean;
  onPick: (item: (typeof SUGGESTIONS)[number]) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {SUGGESTIONS.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onPick(item)}
          disabled={disabled}
          className="shrink-0 rounded-full border border-[#ECDCC6] bg-white px-3.5 py-2 text-xs font-semibold text-[#087A53] shadow-sm transition hover:border-[#0E9A6A]/35 hover:bg-[#D3F6E6] disabled:opacity-50"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ProductThumb({ src, alt }: { src?: string; alt: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    );
  }
  return (
    <span className="flex h-full w-full items-center justify-center bg-[#F1EBE3] text-[#7A8B82]">
      <Package className="h-4 w-4" />
    </span>
  );
}

function ProductBrowseGrid({
  browse,
  busy,
  onBuy,
  onMore,
}: {
  browse: ConciergeProductBrowse;
  busy?: boolean;
  onBuy: (product: ConciergeProductCard) => void;
  onMore?: () => void;
}) {
  if (browse.products.length === 0) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-[20px] border border-[#F4E9D8] bg-[#FFF6EA]/80">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[#7A8B82]">
          {browse.title}
        </p>
        {browse.total > browse.products.length ? (
          <span className="shrink-0 text-[11px] text-[#7A8B82]">{browse.products.length} shown</span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 p-2 pt-0">
        {browse.products.map((product) => (
          <article
            key={product.id}
            className="overflow-hidden rounded-2xl border border-[#F4E9D8] bg-[#FFFEFB]"
          >
            <Link href={product.href} className="block aspect-square bg-[#F1EBE3]">
              <ProductThumb src={product.image} alt={product.name} />
            </Link>
            <div className="space-y-1.5 p-2.5">
              <p className="line-clamp-2 min-h-8 text-xs font-semibold leading-snug text-[#1A241F]">
                {product.name}
              </p>
              <p className="text-[11px] text-[#7A8B82]">
                {[product.brand, product.category].filter(Boolean).join(' · ')}
              </p>
              <p className="text-sm font-bold tabular-nums text-[#087A53]">{formatUgx(product.price)}</p>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 flex-1 rounded-full bg-[#0E9A6A] px-2 text-[11px] text-[#FFFBF4] hover:bg-[#087A53]"
                  disabled={busy}
                  onClick={() => onBuy(product)}
                >
                  Buy
                </Button>
                <Button asChild variant="outline" size="sm" className="h-8 rounded-full border-[#ECDCC6] px-2 text-[11px]">
                  <Link href={product.href}>View</Link>
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {browse.hasMore && onMore ? (
        <div className="border-t border-[#F4E9D8] p-2">
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-full rounded-full text-xs font-semibold text-[#087A53]"
            disabled={busy}
            onClick={onMore}
          >
            Show more parts
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ConciergeChatHost() {
  const pathname = usePathname();
  const router = useRouter();
  const hide = shouldHideConcierge(pathname || '');
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<ConciergePendingAction | null>(null);
  const [vehicleId, setVehicleId] = useState('');
  const [locationDraft, setLocationDraft] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [needLocation, setNeedLocation] = useState(false);
  const [needPhone, setNeedPhone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMsgRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = readThread();
    setMessages(stored.messages);
    setPendingAction(stored.pendingAction);
    if (stored.vehicleId) setVehicleId(stored.vehicleId);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const apply = () => setDesktop(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<ConciergeOpenDetail>).detail || {};
      if (detail.vehicleId) setVehicleId(detail.vehicleId);
      setOpen(true);
    };
    window.addEventListener(CONCIERGE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CONCIERGE_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const target = lastMsgRef.current ?? bottomRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [messages, open, busy]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 280);
    return () => window.clearTimeout(timer);
  }, [open]);

  const persist = useCallback((next: Partial<StoredThread> & { messages?: ChatMessage[] }) => {
    setMessages((prev) => {
      const messagesNext = next.messages ?? prev;
      const pendingNext = next.pendingAction === undefined ? pendingAction : next.pendingAction;
      const vehicleNext = next.vehicleId === undefined ? vehicleId : next.vehicleId;
      writeThread({ messages: messagesNext, pendingAction: pendingNext, vehicleId: vehicleNext });
      return messagesNext;
    });
    if (next.pendingAction !== undefined) setPendingAction(next.pendingAction);
    if (next.vehicleId !== undefined) setVehicleId(next.vehicleId);
  }, [pendingAction, vehicleId]);

  const applyActResult = useCallback((result: ConciergeActResult, goToCheckout = false) => {
    if (!result.ok) {
      if (result.field === 'location') setNeedLocation(true);
      if (result.field === 'phone') setNeedPhone(true);
      if (result.field === 'sign_in') {
        router.push(`/auth?role=buyer&next=${encodeURIComponent(pathname || '/')}`);
      }
      setError(result.error);
      if (result.code === 'ACTIVE_REQUEST_EXISTS' && result.trackPath) {
        persist({
          pendingAction: null,
          messages: [
            ...messages,
            {
              id: newId(),
              role: 'assistant',
              content: result.error,
              actDone: true,
            },
          ],
        });
        router.push(result.trackPath);
      }
      return false;
    }
    setNeedLocation(false);
    setNeedPhone(false);
    if (result.type === 'quote') {
      for (const line of result.lines) {
        addCartLine({
          id: line.productId,
          name: line.name,
          price: line.price,
          image: line.image,
          quantity: line.quantity,
          vendorId: line.vendorId,
        });
      }
      const count = result.lines.reduce((sum, line) => sum + line.quantity, 0);
      persist({
        pendingAction: null,
        messages: [
          ...messages,
          {
            id: newId(),
            role: 'assistant',
            content: goToCheckout
              ? `Added ${count} item${count === 1 ? '' : 's'} to your cart. Opening checkout.`
              : `Added ${count} item${count === 1 ? '' : 's'} to your cart.`,
            actDone: true,
          },
        ],
      });
      if (goToCheckout) {
        setOpen(false);
        router.push('/checkout');
      }
    } else {
      persist({
        pendingAction: null,
        messages: [
          ...messages,
          {
            id: newId(),
            role: 'assistant',
            content: `Service request sent. Track it here: ${result.trackPath}`,
            actDone: true,
          },
        ],
      });
    }
    return true;
  }, [messages, pathname, persist, router]);

  const confirmPending = useCallback(async (goToCheckout = true) => {
    if (!pendingAction || busy) return;
    setBusy(true);
    setError(null);
    try {
      const customerId = await resolveBuyerCustomerId();
      const response = await fetch('/api/buyer/concierge/act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || undefined,
          action: pendingAction,
          location: locationDraft.trim() || undefined,
          destinationLat: locationCoords?.lat,
          destinationLng: locationCoords?.lng,
          phone: phoneDraft.trim() || undefined,
        }),
      });
      const json = (await response.json()) as ConciergeActResult;
      applyActResult(json, pendingAction.type === 'quote' ? goToCheckout : false);
    } catch {
      setError('Could not complete that action.');
    } finally {
      setBusy(false);
    }
  }, [applyActResult, busy, locationCoords, locationDraft, pendingAction, phoneDraft]);

  const addProductFromCard = useCallback(async (product: ConciergeProductCard) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const customerId = await resolveBuyerCustomerId();
      const response = await fetch('/api/buyer/concierge/act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || undefined,
          action: {
            type: 'quote',
            lines: [
              {
                productId: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1,
              },
            ],
          },
        }),
      });
      const json = (await response.json()) as ConciergeActResult;
      applyActResult(json, true);
    } catch {
      setError('Could not add that part.');
    } finally {
      setBusy(false);
    }
  }, [applyActResult, busy]);

  const loadMoreBrowse = useCallback(async (messageId: string, browse: ConciergeProductBrowse) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/buyer/concierge/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: browse.query || '',
          category: browse.category || '',
          offset: browse.offset + browse.products.length,
          limit: 8,
        }),
      });
      if (!response.ok) throw new Error('more');
      const next = (await response.json()) as ConciergeProductBrowse;
      const merged: ConciergeProductBrowse = {
        ...browse,
        ...next,
        products: [
          ...browse.products,
          ...next.products.filter((row) => !browse.products.some((existing) => existing.id === row.id)),
        ],
        offset: browse.offset,
      };
      persist({
        messages: messages.map((msg) => (msg.id === messageId ? { ...msg, productBrowse: merged } : msg)),
      });
    } catch {
      setError('Could not load more parts.');
    } finally {
      setBusy(false);
    }
  }, [busy, messages, persist]);

  const browseShop = useCallback(async (opts: { label: string; category?: string }) => {
    if (busy) return;
    const label = opts.label.trim();
    const category = (opts.category ?? '').trim();
    const userMsg: ChatMessage = { id: newId(), role: 'user', content: label };
    const nextMessages = [...messages, userMsg];
    persist({ messages: nextMessages });
    setBusy(true);
    setError(null);
    try {
      const home = !category;
      const response = await fetch('/api/buyer/concierge/products', {
        method: home ? 'GET' : 'POST',
        headers: home ? undefined : { 'Content-Type': 'application/json' },
        body: home
          ? undefined
          : JSON.stringify({
              category,
              limit: 8,
            }),
      });
      if (!response.ok) throw new Error('shop');
      const json = (await response.json()) as ConciergeProductBrowse & {
        browse?: ConciergeProductBrowse;
        departments?: ConciergeShopDepartment[];
      };
      const browse = json.browse ?? json;
      const departments =
        json.departments ??
        browse.departments ??
        null;
      persist({
        messages: [
          ...nextMessages,
          {
            id: newId(),
            role: 'assistant',
            content: browse.products?.length
              ? `Here are ${browse.title.toLowerCase()} from the shop.`
              : `I could not find parts for that yet. Try another department.`,
            productBrowse: browse.products ? browse : null,
            shopCategories: departments?.length ? departments : null,
          },
        ],
      });
    } catch {
      setError('Could not load the shop.');
    } finally {
      setBusy(false);
    }
  }, [busy, messages, persist]);

  const sendMessage = useCallback(async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    if (pendingAction && isConciergeConfirmPhrase(text)) {
      setInput('');
      await confirmPending(pendingAction.type === 'quote');
      return;
    }
    setInput('');
    const userMsg: ChatMessage = { id: newId(), role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    persist({ messages: nextMessages });
    setBusy(true);
    setError(null);
    try {
      const customerId = await resolveBuyerCustomerId();
      const response = await fetch('/api/buyer/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || undefined,
          vehicleId: vehicleId || undefined,
          message: text,
          history: nextMessages.map((msg) => ({ role: msg.role, content: msg.content })),
        }),
      });
      const json = await response.json();
      if (response.status === 503 || json.code === 'GROK_UNAVAILABLE' || json.code === 'GEMINI_UNAVAILABLE') {
        setUnconfigured(true);
        persist({
          messages: [
            ...nextMessages,
            {
              id: newId(),
              role: 'assistant',
              content: 'I am not set up on this server yet. Add GROK_API_KEY and I can help.',
            },
          ],
        });
        return;
      }
      if (!response.ok) {
        const detail = typeof json.error === 'string' ? json.error : 'I could not reply just now.';
        setError(detail);
        persist({
          messages: [
            ...nextMessages,
            { id: newId(), role: 'assistant', content: detail },
          ],
        });
        return;
      }
      persist({
        pendingAction: json.pendingAction ?? null,
        messages: [
          ...nextMessages,
          {
            id: newId(),
            role: 'assistant',
            content: String(json.reply ?? ''),
            pendingAction: json.pendingAction ?? null,
            productBrowse: json.productBrowse ?? null,
            productDetail: json.productDetail ?? null,
            shopCategories: json.shopCategories ?? null,
          },
        ],
      });
    } catch {
      setError('Could not reach concierge.');
    } finally {
      setBusy(false);
    }
  }, [busy, confirmPending, input, messages, pendingAction, persist, vehicleId]);

  const pickSuggestion = useCallback((item: (typeof SUGGESTIONS)[number]) => {
    void sendMessage(item.prompt);
  }, [sendMessage]);

  const visiblePending = useMemo(() => {
    if (!pendingAction) return null;
    const last = [...messages].reverse().find((msg) => msg.pendingAction);
    if (last?.actDone) return null;
    return pendingAction;
  }, [messages, pendingAction]);

  const clearThread = useCallback(() => {
    persist({ messages: [], pendingAction: null });
    setError(null);
    setNeedLocation(false);
    setNeedPhone(false);
    setLocationCoords(null);
    setLocationDraft('');
  }, [persist]);

  if (hide) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed z-40 flex items-center justify-center rounded-full bg-[#0E9A6A] text-[#FFFBF4] shadow-[0_14px_36px_rgba(14,154,106),0.38)] transition hover:scale-[1.03] hover:bg-[#087A53]',
          'right-4 h-12 px-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))]',
          'md:bottom-6 md:right-6',
          open && 'hidden',
        )}
        aria-label="Open Concierge"
      >
        <span className="text-sm font-semibold tracking-tight">Concierge</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={desktop ? 'right' : 'bottom'}
          className={cn(
            'flex flex-col gap-0 overflow-hidden bg-[#FFF6EA] p-0',
            '[&>button]:top-3.5 [&>button]:right-3 [&>button]:flex [&>button]:h-9 [&>button]:w-9 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-black/[0.05] [&>button]:opacity-100 [&>button]:hover:bg-black/[0.08]',
            desktop
              ? 'inset-y-0 h-full w-full border-l border-[#ECDCC6] sm:max-w-[420px]'
              : 'h-[min(92dvh,760px)] max-h-[92dvh] w-full rounded-t-[28px] border-x-0 border-[#ECDCC6] sm:max-w-none',
          )}
        >
          {!desktop ? (
            <div className="flex justify-center pt-2.5">
              <span className="h-1.5 w-12 rounded-full bg-black/15" />
            </div>
          ) : null}

          <SheetHeader className="space-y-0 border-b border-[#ECDCC6] bg-[#FFFEFB]/90 px-4 py-3 text-left backdrop-blur">
            <div className="flex items-center gap-3 pr-10">
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-[17px] font-bold tracking-tight text-[#1A241F]">Concierge</SheetTitle>
                <SheetDescription className="text-xs text-[#7A8B82]">
                  Online · garage, shop, and bookings
                </SheetDescription>
              </div>
              {messages.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full text-[#7A8B82] hover:bg-black/[0.05] hover:text-[#1A241F]"
                  onClick={clearThread}
                  aria-label="Clear chat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="rounded-[28px] border border-[#F4E9D8] bg-[#FFFEFB] p-5 shadow-[0_10px_30px_rgba(18,36,28,0.05)]">
                <p className="text-[17px] font-semibold tracking-tight text-[#1A241F]">Hi, how can I help?</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#4A5C54]">
                  I can check your car, browse the shop, find a part, or book a mechanic.
                </p>
                <div className="mt-4">
                  <SuggestionChips disabled={busy} onPick={pickSuggestion} />
                </div>
              </div>
            ) : null}

            {messages.map((msg, index) => (
              <div
                key={msg.id}
                ref={index === messages.length - 1 && msg.role === 'assistant' ? lastMsgRef : undefined}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'whitespace-pre-wrap break-words px-3.5 py-2.5 text-[14px] leading-relaxed shadow-sm',
                    msg.productBrowse || msg.shopCategories ? 'w-full max-w-full' : 'max-w-[86%]',
                    msg.role === 'user'
                      ? 'rounded-[20px] rounded-br-md bg-[#0E9A6A] text-[#FFFBF4]'
                      : 'rounded-[20px] rounded-bl-md border border-[#F4E9D8] bg-[#FFFEFB] text-[#1A241F]',
                  )}
                >
                  {msg.content}
                  {msg.productBrowse ? (
                    <ProductBrowseGrid
                      browse={msg.productBrowse}
                      busy={busy}
                      onBuy={(product) => void addProductFromCard(product)}
                      onMore={
                        msg.productBrowse.hasMore
                          ? () => void loadMoreBrowse(msg.id, msg.productBrowse!)
                          : undefined
                      }
                    />
                  ) : null}
                  {(msg.shopCategories ?? msg.productBrowse?.departments)?.length ? (
                    <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {(msg.shopCategories ?? msg.productBrowse?.departments ?? []).map((dept) => (
                        <button
                          key={dept.title}
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void browseShop({
                              label: `Browse ${dept.title}`,
                              category: dept.title,
                            })
                          }
                          className="shrink-0 rounded-full border border-[#ECDCC6] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#087A53]"
                        >
                          {dept.title.toLowerCase()}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {msg.productDetail ? (
                    <div className="mt-3 rounded-2xl border border-[#F4E9D8] bg-[#FFF6EA]/80 p-3">
                      <p className="text-sm font-bold text-[#1A241F]">{msg.productDetail.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#4A5C54]">
                        {msg.productDetail.description || msg.productDetail.category}
                      </p>
                      <p className="mt-2 text-sm font-bold tabular-nums text-[#087A53]">
                        {formatUgx(msg.productDetail.price)}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-full bg-[#0E9A6A] text-[11px] text-[#FFFBF4] hover:bg-[#087A53]"
                          disabled={busy}
                          onClick={() => void addProductFromCard(msg.productDetail!)}
                        >
                          Buy
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-8 rounded-full border-[#ECDCC6] text-[11px]">
                          <Link href={msg.productDetail.href}>Open product</Link>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {msg.actDone && msg.content.includes('/buyer/services/track/') ? (
                    <Link
                      href={msg.content.split('Track it here: ')[1] || '/buyer/services'}
                      className="mt-2 block text-xs font-semibold text-[#0E9A6A] underline"
                    >
                      Open request
                    </Link>
                  ) : null}
                  {msg.actDone && msg.content.includes('cart') ? (
                    <Link href="/cart" className="mt-2 block text-xs font-semibold text-[#0E9A6A] underline">
                      View cart
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}

            {visiblePending?.type === 'quote' ? (
              <div className="overflow-hidden rounded-[24px] border border-[#ECDCC6] bg-[#FFFEFB] shadow-[0_10px_24px_rgba(18,36,28,0.06)]">
                <div className="border-b border-[#F4E9D8] px-4 py-3">
                  <p className="text-sm font-bold text-[#1A241F]">Order these parts</p>
                  <p className="text-xs text-[#7A8B82]">Confirm and I will add them to your cart and open checkout.</p>
                </div>
                <ul className="divide-y divide-[#F4E9D8]">
                  {visiblePending.lines.map((line) => (
                    <li key={line.productId} className="flex items-center gap-3 px-4 py-3">
                      {line.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={line.image}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-black/[0.06]"
                        />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1EBE3] text-[#7A8B82]">
                          <Package className="h-4 w-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#1A241F]">{line.name}</span>
                        <span className="text-xs text-[#7A8B82]">Qty {line.quantity}</span>
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-[#087A53]">
                        {formatUgx(line.price * line.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2 p-3 sm:flex-row">
                  <Button
                    className="h-11 flex-1 rounded-full bg-[#0E9A6A] text-[#FFFBF4] hover:bg-[#087A53]"
                    onClick={() => void confirmPending(true)}
                    disabled={busy}
                  >
                    Checkout
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-full border-[#ECDCC6]"
                    onClick={() => void confirmPending(false)}
                    disabled={busy}
                  >
                    Add to cart only
                  </Button>
                </div>
              </div>
            ) : null}

            {visiblePending?.type === 'book' ? (
              <div className="overflow-hidden rounded-[24px] border border-[#ECDCC6] bg-[#FFFEFB] shadow-[0_10px_24px_rgba(18,36,28,0.06)]">
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D3F6E6] text-[#0E9A6A]">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1A241F]">Book service</p>
                    <p className="text-sm text-[#4A5C54]">{visiblePending.service}</p>
                    {visiblePending.location ? (
                      <p className="mt-0.5 text-xs text-[#7A8B82]">{visiblePending.location}</p>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2 px-4 pb-3">
                  {needLocation ? (
                    <AddressAutocomplete
                      value={locationDraft}
                      onChange={(next) => {
                        setLocationDraft(next);
                        setLocationCoords(null);
                      }}
                      onPlaceSelect={(place) => {
                        setLocationDraft(place.label);
                        if (typeof place.lat === 'number' && typeof place.lng === 'number') {
                          setLocationCoords({ lat: place.lat, lng: place.lng });
                        }
                      }}
                      placeholder="Search an area or landmark…"
                      inputClassName="h-11 rounded-2xl border-[#ECDCC6] bg-[#FFF6EA] focus:ring-[#0E9A6A]/40"
                    />
                  ) : null}
                  {needPhone ? (
                    <Input
                      className="h-11 rounded-2xl border-[#ECDCC6] bg-[#FFF6EA]"
                      placeholder="Mobile number"
                      value={phoneDraft}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                    />
                  ) : null}
                  <Button
                    className="h-11 w-full rounded-full bg-[#0E9A6A] text-[#FFFBF4] hover:bg-[#087A53]"
                    onClick={() => void confirmPending()}
                    disabled={busy}
                  >
                    Confirm booking
                  </Button>
                </div>
              </div>
            ) : null}

            {busy ? (
              <div className="flex items-center gap-2 pl-1 text-xs text-[#7A8B82]">
                <span className="flex gap-1 rounded-full bg-[#FFFEFB] px-3 py-2 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#0E9A6A] [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#0E9A6A] [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#0E9A6A]" />
                </span>
                Thinking…
              </div>
            ) : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            {unconfigured ? (
              <p className="text-xs text-[#7A8B82]">Set GROK_API_KEY on the server to enable replies.</p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            className="border-t border-[#ECDCC6] bg-[#FFFEFB]/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            {messages.length > 0 ? (
              <div className="mb-2.5">
                <SuggestionChips disabled={busy} onPick={pickSuggestion} />
              </div>
            ) : null}
            <div className="flex items-end gap-2 rounded-[22px] border border-[#ECDCC6] bg-[#FFF6EA] p-1.5 pl-3.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about parts, your car, or a booking…"
                rows={1}
                className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-sm text-[#1A241F] outline-none placeholder:text-[#7A8B82]"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                disabled={busy}
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full bg-[#0E9A6A] text-[#FFFBF4] hover:bg-[#087A53] disabled:bg-[#D3F6E6] disabled:text-[#7A8B82]"
                disabled={busy || !input.trim()}
                aria-label="Send"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
