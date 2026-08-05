import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import Colors from '@/constants/Colors';
import { AppTheme, appShadow } from '@/constants/AppTheme';
import { NUNITO } from '@/constants/Fonts';
import { useCart } from '@/contexts/CartContext';
import { useColorScheme } from '@/components/useColorScheme';

function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { itemCount } = useCart();

  return (
    <Tabs
      initialRouteName="services"
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: AppTheme.colors.surface,
          borderTopColor: AppTheme.colors.borderSoft,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 6,
          ...appShadow('tab'),
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: NUNITO.bold, fontSize: 17, letterSpacing: -0.2 },
        tabBarLabelStyle: {
          fontFamily: NUNITO.semiBold,
          fontSize: 11,
          letterSpacing: -0.1,
          marginTop: 2,
        },
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'construct' : 'construct-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'storefront' : 'storefront-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          headerShown: false,
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: AppTheme.colors.primary,
            color: '#FFFFFF',
            fontSize: 10,
            fontFamily: NUNITO.bold,
            minWidth: 18,
            height: 18,
            lineHeight: 16,
          },
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'cart' : 'cart-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: AppTheme.colors.primaryTint,
  },
});
