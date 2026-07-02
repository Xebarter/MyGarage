import { useCallback, useRef, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DraggableBottomSheetProps = {
  children: ReactNode;
  collapsedHeight?: number;
  expandedHeight?: number;
  backgroundColor: string;
  borderColor: string;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function DraggableBottomSheet({
  children,
  collapsedHeight = 300,
  expandedHeight = 460,
  backgroundColor,
  borderColor,
}: DraggableBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const dragStartY = useRef(0);
  const sheetHeightRef = useRef(collapsedHeight);
  const snapRangeRef = useRef(160);

  const expanded = Math.min(expandedHeight + insets.bottom, SCREEN_HEIGHT * 0.72);
  const collapsed = Math.min(collapsedHeight + insets.bottom, expanded - 80);
  const snapRange = expanded - collapsed;
  snapRangeRef.current = snapRange;

  const snapTo = useCallback(
    (open: boolean) => {
      Animated.spring(translateY, {
        toValue: open ? 0 : snapRangeRef.current,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
      }).start();
    },
    [translateY],
  );

  const snapToRef = useRef(snapTo);
  snapToRef.current = snapTo;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        translateY.stopAnimation((value) => {
          dragStartY.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const range = snapRangeRef.current;
        const next = Math.max(0, Math.min(range, dragStartY.current + gesture.dy));
        translateY.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const range = snapRangeRef.current;
        const current = dragStartY.current + gesture.dy;
        const shouldExpand = gesture.vy < -0.35 || current < range * 0.45;
        snapToRef.current(shouldExpand);
      },
    }),
  ).current;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    sheetHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.sheet,
        {
          backgroundColor,
          borderColor,
          paddingBottom: insets.bottom + 12,
          minHeight: collapsed,
          maxHeight: expanded,
          transform: [{ translateY }],
        },
      ]}>
      <View style={styles.handleArea} {...panResponder.panHandlers}>
        <View style={styles.handle} />
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 16,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },
});
