import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import Colors from '@/constants/Colors';
import { getCategoryCardAccent } from '@/constants/ServiceCategoryAccents';
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

  const title = formatServiceCategoryTitle(category.title);
  const hint = formatServiceHint(category.useWhen);

  const serviceCount = category.services.length;

  const { fontScale } = useWindowDimensions();
  const scaled = fontScale > 1.15;

  const accentColor = accent.ring;

  return (
    <View style={[styles.wrapper, { width }]}>
      <Link href={`/service/${category.id}`} asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${hint}. ${serviceCount} services.`}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: accent.iconBg,
              borderColor: accentColor,
              opacity: pressed ? 0.96 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            },
          ]}
        >
          {/* Accent Top Bar - Subtle & Professional */}
          <View
            style={[
              styles.accentBar,
              {
                backgroundColor: accentColor,
              },
            ]}
          />

          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: accent.iconBg,
                borderColor: accentColor + '55',
              },
            ]}
          >
            <Text
              style={[
                styles.emoji,
                scaled && styles.emojiScaled,
              ]}
            >
              {category.emoji}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text
              numberOfLines={2}
              style={[
                styles.title,
                {
                  color: colors.text,
                },
                scaled && styles.titleScaled,
              ]}
            >
              {title}
            </Text>

            <Text
              numberOfLines={3}
              style={[
                styles.description,
                {
                  color: colors.textMuted,
                },
                scaled && styles.descriptionScaled,
              ]}
            >
              {hint}
            </Text>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.serviceCount}>
                <Text style={[styles.countText, { color: accentColor }]}>
                  {serviceCount}
                </Text>
                <Text style={[styles.countLabel, { color: colors.textMuted }]}>services</Text>
              </View>

              <View
                style={[
                  styles.arrowButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: accentColor + '55',
                  },
                ]}
              >
                <Ionicons name="arrow-forward" size={16} color={accentColor} />
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
    marginBottom: 16,
  },

  card: {
    minHeight: 218,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',

    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  accentBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 6,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },

  emoji: {
    fontSize: 32,
  },

  emojiScaled: {
    fontSize: 34,
  },

  content: {
    flex: 1,
    justifyContent: 'space-between',
  },

  title: {
    fontSize: 16.5,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 8,
  },

  titleScaled: {
    fontSize: 17.5,
  },

  description: {
    fontSize: 13,
    lineHeight: 18.5,
    marginBottom: 16,
    flex: 1,
  },

  descriptionScaled: {
    fontSize: 13.5,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  serviceCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },

  countText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  countLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  arrowButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});