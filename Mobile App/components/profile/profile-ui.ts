import { Platform } from 'react-native';

export const PROFILE_CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
  },
  android: { elevation: 3 },
  default: {},
});
