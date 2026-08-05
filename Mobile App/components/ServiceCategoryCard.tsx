import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import Colors from '@/constants/Colors';
import { AppTheme, appShadow } from '@/constants/AppTheme';
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
            appShadow('md'),
            {
              borderColor: accent.glassBorder,
              opacity: pressed ? 0.94 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <View style={[styles.glassBase, { backgroundColor: accent.glassBg }]} />
          <View pointerEvents="none" style={[styles.glassSheen, { backgroundColor: accent.sheen }]} />
          <View style={[styles.accentRail, { backgroundColor: accent.accent }]} pointerEvents="none" />

          <View style={styles.cardBody}>
            <View
              style={[
                styles.priorityPill,
                {
                  backgroundColor: AppTheme.colors.surface,
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
                  backgroundColor: AppTheme.colors.surface,
                  borderColor: AppTheme.colors.borderSoft,
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
                  },
                ]}
              >
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
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
    minHeight: 210,
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: AppTheme.colors.surface,
  },

  glassBase: {
    ...StyleSheet.absoluteFillObject,
  },

  glassSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '28%',
  },

  accentRail: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    opacity: 0.9,
  },

  cardBody: {
    flex: 1,
    padding: 15,
    paddingTop: 16,
    paddingLeft: 16,
    gap: 11,
    zIndex: 2,
  },

  priorityPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
  },

  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.25,
    textTransform: 'uppercase',
  },

  iconGlass: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  emoji: {
    fontSize: 26,
  },

  emojiScaled: {
    fontSize: 28,
  },

  content: {
    flex: 1,
    gap: 5,
    paddingRight: 2,
  },

  title: {
    fontSize: 15.5,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.25,
    paddingRight: 58,
  },

  titleScaled: {
    fontSize: 16,
  },

  description: {
    fontSize: 12.5,
    lineHeight: 17.5,
  },

  descriptionScaled: {
    fontSize: 13,
  },

  footerGlass: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 2,
  },

  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
      },
      default: {},
    }),
  },
});
