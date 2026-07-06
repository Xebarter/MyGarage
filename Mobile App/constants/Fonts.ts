import type { TextStyle } from 'react-native';

export const NUNITO = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semiBold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
} as const;

export function nunitoFamilyForWeight(fontWeight?: TextStyle['fontWeight']): string {
  if (fontWeight === '500' || fontWeight === 500) return NUNITO.medium;
  if (fontWeight === '600' || fontWeight === 600) return NUNITO.semiBold;
  if (fontWeight === '700' || fontWeight === 'bold' || fontWeight === 700) {
    return NUNITO.bold;
  }
  if (fontWeight === '800' || fontWeight === 800) {
    return NUNITO.extraBold;
  }
  return NUNITO.regular;
}
