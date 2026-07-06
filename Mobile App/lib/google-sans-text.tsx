import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  TextInputProps,
  TextProps,
  TextStyle,
} from 'react-native';

import { GOOGLE_SANS, googleSansFamilyForWeight } from '@/constants/Fonts';

export function resolveGoogleSansStyle(style?: StyleProp<TextStyle>): TextStyle | undefined {
  const flat = StyleSheet.flatten(style);
  if (!flat) return { fontFamily: GOOGLE_SANS.regular };

  if (flat.fontFamily?.startsWith('GoogleSans_')) {
    return flat;
  }

  // Keep icon fonts (Ionicons, etc.) and any other explicit font choice.
  if (flat.fontFamily) {
    return flat;
  }

  const fontFamily = googleSansFamilyForWeight(flat.fontWeight);
  const { fontWeight: _fontWeight, ...rest } = flat;
  return { ...rest, fontFamily };
}

export function AppText(props: TextProps) {
  const { style, ...rest } = props;
  return <RNText {...rest} style={resolveGoogleSansStyle(style)} />;
}

export function AppTextInput(props: TextInputProps) {
  // Custom font families break TextInput on Android (characters may not appear).
  return <RNTextInput {...props} />;
}
