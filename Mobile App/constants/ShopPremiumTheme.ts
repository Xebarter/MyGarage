/**
 * Shop / commerce chrome — light professional, shared with cart/checkout/product.
 */
import { AppTheme } from '@/constants/AppTheme';

const C = AppTheme.colors;

export const SHOP_PREMIUM = {
  bg: C.surface,
  bgElevated: C.canvas,
  bgGlass: C.surface,
  borderGlass: C.border,
  borderGlow: C.primaryBorder,
  text: C.text,
  textMuted: C.textSecondary,
  accent: C.primary,
  accentSoft: C.primarySoft,
  accentDeep: C.primaryDeep,
  gold: C.warning,
};

/** Shop tab header shell — soft white with ambient blue. */
export const SHOP_HEADER = {
  shellTop: C.surface,
  shellBottom: '#F8FAFC',
  glowPrimary: C.glowBlue,
  glowSecondary: C.glowSoft,
};
