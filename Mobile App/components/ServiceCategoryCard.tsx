import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import Colors from '@/constants/Colors';
import { getCategoryCardAccent } from '@/constants/ServiceCategoryAccents';
import { getPriorityPalette } from '@/constants/ServicePriorities';
import { useColorScheme } from '@/components/useColorScheme';
import { formatServiceCategoryTitle, formatServiceHint } from '@/lib/format';
import type { ServiceCategory } from '@/types';

type ServiceCategoryCardProps = {
  category: ServiceCategory;
  width: number;
  accentIndex: number;
};

export function ServiceCategoryCard({
  category,
  width,
  accentIndex,
}: ServiceCategoryCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const accent = getCategoryCardAccent(accentIndex, scheme);
  const priority = getPriorityPalette(category.priority, scheme);

  const title = formatServiceCategoryTitle(category.title);
  const hint = formatServiceHint(category.useWhen);
  const serviceCount = category.services.length;

  const { fontScale } = useWindowDimensions();
  const scaled = fontScale > 1.15;

  return (
    <View style={[styles.wrapper, { width }]}>
      <Link href={`/service/${category.id}`} asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${hint}. ${serviceCount} services.`}
          style={({ pressed }) => [
            styles.card,
            {
              borderColor: accent.glassBorder,
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.978 : 1 }],
            },
            Platform.select({
              ios: {
                shadowColor: '#0F172A',
                shadowOpacity: scheme === 'dark' ? 0.22 : 0.08,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 10,
              },
              default: {},
            }),
          ]}
        >
          <View style={[styles.glassBase, { backgroundColor: accent.glassBg }]} />

          <View pointerEvents="none" style={[styles.glassSheen, { backgroundColor: accent.sheen }]} />

          <View style={styles.cardBody}>
            <View
              style={[
                styles.priorityPill,
                {
                  backgroundColor: scheme === 'dark' ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.55)',
                  borderColor: accent.ring,
                },
              ]}
            >
              <View style={[styles.priorityDot, { backgroundColor: priority.accent }]} />
              <Text style={[styles.priorityText, { color: priority.accent }]}>{priority.label}</Text>
            </View>

            <View
              style={[
                styles.iconGlass,
                {
                  backgroundColor: accent.iconBg,
                  borderColor: accent.ring,
                },
              ]}
            >
              <View
                pointerEvents="none"
                style={[styles.iconGlassSheen, { backgroundColor: accent.sheen }]}
              />
              <Text style={[styles.emoji, scaled && styles.emojiScaled]}>{category.emoji}</Text>
            </View>

            <View style={styles.content}>
              <Text
                numberOfLines={2}
                style={[styles.title, { color: colors.text }, scaled && styles.titleScaled]}
              >
                {title}
              </Text>

              <Text
                numberOfLines={2}
                style={[
                  styles.description,
                  { color: colors.textMuted },
                  scaled && styles.descriptionScaled,
                ]}
              >
                {hint}
              </Text>
            </View>

            <View
              style={[
                styles.footerGlass,
                {
                  backgroundColor:
                    scheme === 'dark' ? 'rgba(15,23,42,0.38)' : 'rgba(255,255,255,0.48)',
                  borderColor: accent.ring,
                },
              ]}
            >
              <View style={styles.footerLeft}>
                <View style={[styles.countDot, { backgroundColor: accent.accent }]} />
                <Text style={[styles.countText, { color: colors.text }]}>
                  {serviceCount} service{serviceCount === 1 ? '' : 's'}
                </Text>
              </View>

              <View
                style={[
                  styles.arrowButton,
                  {
                    backgroundColor: accent.accent,
                    borderColor: accent.ring,
                  },
                ]}
              >
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },

  card: {
    minHeight: 204,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',

    ...Platform.select({
      ios: {},
      android: {
        elevation: 3,
      },
    }),
  },

  glassBase: {
    ...StyleSheet.absoluteFill,
  },

  glassSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '32%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  cardBody: {
    flex: 1,
    padding: 14,
    paddingTop: 16,
    gap: 10,
    zIndex: 2,
  },

  priorityPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },

  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  priorityText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  iconGlass: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },

  iconGlassSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
  },

  emoji: {
    fontSize: 26,
  },

  emojiScaled: {
    fontSize: 28,
  },

  content: {
    flex: 1,
    gap: 4,
    paddingRight: 2,
  },

  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingRight: 58,
  },

  titleScaled: {
    fontSize: 16,
  },

  description: {
    fontSize: 12.5,
    lineHeight: 17,
  },

  descriptionScaled: {
    fontSize: 13,
  },

  footerGlass: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 2,
  },

  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  countDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  countText: {
    fontSize: 12,
    fontWeight: '600',
  },

  arrowButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
