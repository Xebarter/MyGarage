import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

type MapChromeProps = {
  bottomFadeHeight?: number;
  topFadeHeight?: number;
  scheme?: 'light' | 'dark';
};

/** Vignette overlays so the map blends into sheets and status areas. */
export function MapChrome({
  bottomFadeHeight = 140,
  topFadeHeight = 72,
  scheme = 'light',
}: MapChromeProps) {
  const topColors =
    scheme === 'dark'
      ? (['rgba(15,23,42,0.55)', 'rgba(15,23,42,0)'] as const)
      : (['rgba(248,250,252,0.72)', 'rgba(248,250,252,0)'] as const);
  const bottomColors =
    scheme === 'dark'
      ? (['rgba(15,23,42,0)', 'rgba(15,23,42,0.82)'] as const)
      : (['rgba(255,255,255,0)', 'rgba(255,255,255,0.92)'] as const);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={topColors} style={[styles.top, { height: topFadeHeight }]} />
      <LinearGradient colors={bottomColors} style={[styles.bottom, { height: bottomFadeHeight }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
