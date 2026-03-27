/**
 * Client-side cart line stored in localStorage (`cartItems`).
 * `id` is always the product id; `variantId` distinguishes multiple lines for the same product.
 */
export type CartLineItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  vendorId?: string;
  variantId?: string | null;
  /** Short label for the chosen variant (shown in cart/checkout). */
  variantLabel?: string;
};

export function cartLineKey(item: Pick<CartLineItem, "id" | "variantId">): string {
  return `${item.id}::${item.variantId ?? ""}`;
}
