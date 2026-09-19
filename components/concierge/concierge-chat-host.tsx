'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Send, Sparkles, Trash2, Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { ConciergeActResult, ConciergePendingAction } from '@/lib/concierge/types';
import { resolveBuyerCustomerId } from '@/components/buyer/garage/utils';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  { label: 'What cars do I have?', prompt: 'What cars do I have?' },
  { label: 'Next service', prompt: 'When is my next service?' },
  { label: 'Oil filter', prompt: 'Find an oil filter for my car' },
  { label: 'Book oil service', prompt: 'Book an oil service' },
];

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pendingAction?: ConciergePendingAction | null;
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
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {SUGGESTIONS.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onPick(item.prompt)}
          disabled={disabled}
          className="shrink-0 rounded-full border border-[#E4DDD2] bg-white px-3.5 py-2 text-xs font-semibold text-[#16483E] shadow-sm transition hover:border-[#236B5C]/35 hover:bg-[#DDEEE8] disabled:opacity-50"
        >
          {item.label}
        </button>
      ))}
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
  const [phoneDraft, setPhoneDraft] = useState('');
  const [needLocation, setNeedLocation] = useState(false);
  const [needPhone, setNeedPhone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const applyActResult = useCallback((result: ConciergeActResult) => {
    if (!result.ok) {
      if (result.field === 'location') setNeedLocation(true);
      if (result.field === 'phone') setNeedPhone(true);
      if (result.field === 'sign_in') {
        router.push(`/auth?role=buyer&next=${encodeURIComponent(pathname || '/')}`);
      }
      setError(result.error);
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
            content: `Added ${count} item${count === 1 ? '' : 's'} to your cart.`,
            actDone: true,
          },
        ],
      });
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

  const confirmPending = useCallback(async () => {
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
          phone: phoneDraft.trim() || undefined,
        }),
      });
      const json = (await response.json()) as ConciergeActResult;
      applyActResult(json);
    } catch {
      setError('Could not complete that action.');
    } finally {
      setBusy(false);
    }
  }, [applyActResult, busy, locationDraft, pendingAction, phoneDraft]);

  const sendMessage = useCallback(async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    if (pendingAction && isConciergeConfirmPhrase(text)) {
      setInput('');
      await confirmPending();
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
          },
        ],
      });
    } catch {
      setError('Could not reach concierge.');
    } finally {
      setBusy(false);
    }
  }, [busy, confirmPending, input, messages, pendingAction, persist, vehicleId]);

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
  }, [persist]);

  if (hide) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed z-40 flex items-center justify-center gap-2 rounded-full bg-[#236B5C] text-[#F7FBF9] shadow-[0_14px_36px_rgba(22,72,62,0.38)] transition hover:scale-[1.03] hover:bg-[#16483E]',
          'right-4 h-14 w-14 bottom-[calc(5.75rem+env(safe-area-inset-bottom))]',
          'md:bottom-6 md:right-6 md:h-12 md:w-auto md:px-4',
          open && 'hidden',
        )}
        aria-label="Open Concierge"
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="hidden pr-1 text-sm font-semibold tracking-tight md:inline">Concierge</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={desktop ? 'right' : 'bottom'}
          className={cn(
            'flex flex-col gap-0 overflow-hidden bg-[#F5F2EB] p-0',
            '[&>button]:top-3.5 [&>button]:right-3 [&>button]:flex [&>button]:h-9 [&>button]:w-9 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-black/[0.05] [&>button]:opacity-100 [&>button]:hover:bg-black/[0.08]',
            desktop
              ? 'inset-y-0 h-full w-full border-l border-[#E4DDD2] sm:max-w-[420px]'
              : 'h-[min(92dvh,760px)] max-h-[92dvh] w-full rounded-t-[28px] border-x-0 border-[#E4DDD2] sm:max-w-none',
          )}
        >
          {!desktop ? (
            <div className="flex justify-center pt-2.5">
              <span className="h-1.5 w-12 rounded-full bg-black/15" />
            </div>
          ) : null}

          <SheetHeader className="space-y-0 border-b border-[#E4DDD2] bg-[#FFFDF9]/90 px-4 py-3 text-left backdrop-blur">
            <div className="flex items-center gap-3 pr-10">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#236B5C] text-[#F7FBF9] shadow-[0_8px_18px_rgba(22,72,62,0.28)]">
                <Sparkles className="h-5 w-5" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#FFFDF9]" />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-[17px] font-bold tracking-tight text-[#171C1A]">Concierge</SheetTitle>
                <SheetDescription className="text-xs text-[#7A8581]">
                  Online · garage, parts, and bookings
                </SheetDescription>
              </div>
              {messages.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full text-[#7A8581] hover:bg-black/[0.05] hover:text-[#171C1A]"
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
              <div className="rounded-[28px] border border-[#EFE9E0] bg-[#FFFDF9] p-5 shadow-[0_10px_30px_rgba(18,32,28,0.05)]">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DDEEE8] text-[#236B5C]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-[17px] font-semibold tracking-tight text-[#171C1A]">Hi — how can I help?</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#4A5551]">
                  Ask about your car, find a part, or book a mechanic. I will keep it short and clear.
                </p>
                <div className="mt-4">
                  <SuggestionChips disabled={busy} onPick={(prompt) => void sendMessage(prompt)} />
                </div>
              </div>
            ) : null}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'assistant' ? (
                  <div className="mr-2 mt-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DDEEE8] text-[#236B5C] sm:flex">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                ) : null}
                <div
                  className={cn(
                    'max-w-[86%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-[14px] leading-relaxed shadow-sm',
                    msg.role === 'user'
                      ? 'rounded-[20px] rounded-br-md bg-[#236B5C] text-[#F7FBF9]'
                      : 'rounded-[20px] rounded-bl-md border border-[#EFE9E0] bg-[#FFFDF9] text-[#171C1A]',
                  )}
                >
                  {msg.content}
                  {msg.actDone && msg.content.includes('/buyer/services/track/') ? (
                    <Link
                      href={msg.content.split('Track it here: ')[1] || '/buyer/services'}
                      className="mt-2 block text-xs font-semibold text-[#236B5C] underline"
                    >
                      Open request
                    </Link>
                  ) : null}
                  {msg.actDone && msg.content.includes('cart') ? (
                    <Link href="/cart" className="mt-2 block text-xs font-semibold text-[#236B5C] underline">
                      View cart
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}

            {visiblePending?.type === 'quote' ? (
              <div className="overflow-hidden rounded-[24px] border border-[#E4DDD2] bg-[#FFFDF9] shadow-[0_10px_24px_rgba(18,32,28,0.06)]">
                <div className="border-b border-[#EFE9E0] px-4 py-3">
                  <p className="text-sm font-bold text-[#171C1A]">Add to cart</p>
                  <p className="text-xs text-[#7A8581]">Confirm and I will drop these in your cart.</p>
                </div>
                <ul className="divide-y divide-[#EFE9E0]">
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
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1EBE3] text-[#7A8581]">
                          <Sparkles className="h-4 w-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#171C1A]">{line.name}</span>
                        <span className="text-xs text-[#7A8581]">Qty {line.quantity}</span>
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-[#16483E]">
                        {formatUgx(line.price * line.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 p-3">
                  <Button
                    className="h-11 flex-1 rounded-full bg-[#236B5C] text-[#F7FBF9] hover:bg-[#16483E]"
                    onClick={() => void confirmPending()}
                    disabled={busy}
                  >
                    Confirm quote
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-full border-[#E4DDD2]">
                    <Link href="/cart">Cart</Link>
                  </Button>
                </div>
              </div>
            ) : null}

            {visiblePending?.type === 'book' ? (
              <div className="overflow-hidden rounded-[24px] border border-[#E4DDD2] bg-[#FFFDF9] shadow-[0_10px_24px_rgba(18,32,28,0.06)]">
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DDEEE8] text-[#236B5C]">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#171C1A]">Book service</p>
                    <p className="text-sm text-[#4A5551]">{visiblePending.service}</p>
                    {visiblePending.location ? (
                      <p className="mt-0.5 text-xs text-[#7A8581]">{visiblePending.location}</p>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2 px-4 pb-3">
                  {needLocation ? (
                    <Input
                      className="h-11 rounded-2xl border-[#E4DDD2] bg-[#F5F2EB]"
                      placeholder="Area or address"
                      value={locationDraft}
                      onChange={(e) => setLocationDraft(e.target.value)}
                    />
                  ) : null}
                  {needPhone ? (
                    <Input
                      className="h-11 rounded-2xl border-[#E4DDD2] bg-[#F5F2EB]"
                      placeholder="Mobile number"
                      value={phoneDraft}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                    />
                  ) : null}
                  <Button
                    className="h-11 w-full rounded-full bg-[#236B5C] text-[#F7FBF9] hover:bg-[#16483E]"
                    onClick={() => void confirmPending()}
                    disabled={busy}
                  >
                    Confirm booking
                  </Button>
                </div>
              </div>
            ) : null}

            {busy ? (
              <div className="flex items-center gap-2 pl-1 text-xs text-[#7A8581]">
                <span className="flex gap-1 rounded-full bg-[#FFFDF9] px-3 py-2 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#236B5C] [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#236B5C] [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#236B5C]" />
                </span>
                Thinking…
              </div>
            ) : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            {unconfigured ? (
              <p className="text-xs text-[#7A8581]">Set GROK_API_KEY on the server to enable replies.</p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            className="border-t border-[#E4DDD2] bg-[#FFFDF9]/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            {messages.length > 0 ? (
              <div className="mb-2.5">
                <SuggestionChips disabled={busy} onPick={(prompt) => void sendMessage(prompt)} />
              </div>
            ) : null}
            <div className="flex items-end gap-2 rounded-[22px] border border-[#E4DDD2] bg-[#F5F2EB] p-1.5 pl-3.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your car…"
                rows={1}
                className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-sm text-[#171C1A] outline-none placeholder:text-[#7A8581]"
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
                className="h-10 w-10 shrink-0 rounded-full bg-[#236B5C] text-[#F7FBF9] hover:bg-[#16483E] disabled:bg-[#DDEEE8] disabled:text-[#7A8581]"
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
