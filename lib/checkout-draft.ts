const CHECKOUT_DRAFT_KEY = 'mygarage.checkoutDraft';

export type CheckoutDraft = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  promoCode?: string;
};

function emptyDraft(): CheckoutDraft {
  return {
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    promoCode: '',
  };
}

export function loadCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutDraft>;
    const draft: CheckoutDraft = {
      customerName: typeof parsed.customerName === 'string' ? parsed.customerName : '',
      customerEmail: typeof parsed.customerEmail === 'string' ? parsed.customerEmail : '',
      customerPhone: typeof parsed.customerPhone === 'string' ? parsed.customerPhone : '',
      shippingAddress: typeof parsed.shippingAddress === 'string' ? parsed.shippingAddress : '',
      promoCode: typeof parsed.promoCode === 'string' ? parsed.promoCode : '',
    };
    const hasValue = Object.values(draft).some((value) => value.trim().length > 0);
    return hasValue ? draft : null;
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function clearCheckoutDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function blankCheckoutDraft(): CheckoutDraft {
  return emptyDraft();
}
