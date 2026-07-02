import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItem,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { PromoCarouselEntry } from '@/types';

/** Admin promo banners are uploaded at 1600×450. */
const BANNER_ASPECT = 1600 / 450;
const ROTATE_MS = 7000;
const RESUME_AUTO_MS = 12000;

type ShopPromoCarouselProps = {
  items: PromoCarouselEntry[];
};

export function ShopPromoCarousel({ items }: ShopPromoCarouselProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<PromoCarouselEntry>>(null);

  const pageWidth = screenWidth;
  const frameWidth = screenWidth - 32;
  const frameHeight = frameWidth / BANNER_ASPECT;

  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      if (!items.length) return;
      const clamped = ((index % items.length) + items.length) % items.length;
      listRef.current?.scrollToOffset({ offset: clamped * pageWidth, animated });
      setActiveIndex(clamped);
    },
    [items.length, pageWidth],
  );

  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;

    const timer = setInterval(() => {
      scrollToIndex(activeIndex + 1);
    }, ROTATE_MS);

    return () => clearInterval(timer);
  }, [activeIndex, autoPlay, items.length, scrollToIndex]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const pauseAutoPlay = useCallback(() => {
    setAutoPlay(false);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setAutoPlay(true), RESUME_AUTO_MS);
  }, []);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      setActiveIndex(index);
    },
    [pageWidth],
  );

  const renderItem: ListRenderItem<PromoCarouselEntry> = useCallback(
    ({ item }) => (
      <View style={[styles.page, { width: pageWidth }]}>
        <Link href={`/product/${item.product.id}`} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View promotion for ${item.product.name}`}
            style={({ pressed }) => StyleSheet.flatten([styles.pressable, pressed && styles.pressablePressed])}>
            <View
              style={[
                styles.frame,
                {
                  width: frameWidth,
                  height: frameHeight,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}>
              <Image
                source={{ uri: item.bannerUrl }}
                style={styles.bannerImage}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
              <View style={styles.topShine} pointerEvents="none" />
              <View style={styles.bottomGradient} pointerEvents="none" />
              <View style={styles.ctaDock} pointerEvents="none">
                <View style={styles.ctaPill}>
                  <Text style={styles.ctaText}>Shop now</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </View>
              </View>
            </View>
          </Pressable>
        </Link>
      </View>
    ),
    [colors.border, colors.card, frameHeight, frameWidth, pageWidth],
  );

  if (!items.length) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '14' }]}>
            <Ionicons name="megaphone-outline" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sponsored</Text>
        </View>
        {items.length > 1 ? (
          <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
            {activeIndex + 1} / {items.length}
          </Text>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        bounces={items.length > 1}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={pageWidth}
        snapToAlignment="start"
        disableIntervalMomentum
        onScrollBeginDrag={pauseAutoPlay}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
      />

      {items.length > 1 ? (
        <View style={styles.controls}>
          <Pressable
            onPress={() => {
              pauseAutoPlay();
              scrollToIndex(activeIndex - 1);
            }}
            hitSlop={8}
            style={({ pressed }) => [
              styles.navBtn,
              { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
            ]}
            accessibilityLabel="Previous banner">
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>

          <View style={styles.dots}>
            {items.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  pauseAutoPlay();
                  scrollToIndex(index);
                }}
                hitSlop={6}
                accessibilityLabel={`Show banner ${index + 1}`}
                style={[
                  styles.dot,
                  index === activeIndex
                    ? [styles.dotActive, { backgroundColor: colors.primary }]
                    : { backgroundColor: colors.border },
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={() => {
              pauseAutoPlay();
              scrollToIndex(activeIndex + 1);
            }}
            hitSlop={8}
            style={({ pressed }) => [
              styles.navBtn,
              { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
            ]}
            accessibilityLabel="Next banner">
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: -16,
    gap: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  page: {
    alignItems: 'center',
  },
  pressable: {
    alignItems: 'center',
  },
  pressablePressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  frame: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  topShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    opacity: 0.35,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
    backgroundColor: 'rgba(15,23,42,0.28)',
  },
  ctaDock: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ctaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 999,
  },
  dotActive: {
    width: 22,
  },
});
