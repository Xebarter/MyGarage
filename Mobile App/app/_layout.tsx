import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ActiveServiceRequestRestore } from '@/components/ActiveServiceRequestRestore';
import { ServiceRequestLiveNavigation } from '@/components/ServiceRequestLiveNavigation';
import { useColorScheme } from '@/components/useColorScheme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <CartProvider>
          <ActiveServiceRequestRestore />
          <ServiceRequestLiveNavigation />
          <RootStack />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const colorScheme = useColorScheme();

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: 'transparent' },
          headerShadowVisible: false,
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Sign in', presentation: 'modal' }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Product' }} />
        <Stack.Screen name="service/[categoryId]" options={{ title: 'Book service' }} />
        <Stack.Screen name="service/complete-pending" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="service/track/[requestId]" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ headerShown: false }} />
        <Stack.Screen name="orders/index" options={{ title: 'My orders' }} />
        <Stack.Screen name="orders/[id]" options={{ title: 'Order' }} />
      </Stack>
    </>
  );
}
