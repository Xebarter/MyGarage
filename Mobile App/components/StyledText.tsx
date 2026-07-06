import { GOOGLE_SANS } from '@/constants/Fonts';

import { Text, TextProps } from './Themed';

export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: GOOGLE_SANS.regular }]} />;
}
