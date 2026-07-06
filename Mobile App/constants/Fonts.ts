import type { TextStyle } from 'react-native';

export const GOOGLE_SANS = {
  regular: 'GoogleSans_400Regular',
  medium: 'GoogleSans_500Medium',
  semiBold: 'GoogleSans_600SemiBold',
  bold: 'GoogleSans_700Bold',
} as const;

export function googleSansFamilyForWeight(fontWeight?: TextStyle['fontWeight']): string {
  if (fontWeight === '500' || fontWeight === 500) return GOOGLE_SANS.medium;
  if (fontWeight === '600' || fontWeight === 600) return GOOGLE_SANS.semiBold;
  if (
    fontWeight === '700' ||
    fontWeight === 'bold' ||
    fontWeight === 700 ||
    fontWeight === '800' ||
    fontWeight === 800
  ) {
    return GOOGLE_SANS.bold;
  }
  return GOOGLE_SANS.regular;
}
