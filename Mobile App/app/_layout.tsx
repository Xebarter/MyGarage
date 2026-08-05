import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
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
import { NUNITO } from '@/constants/Fonts';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <CartProvider>
          <AppShell />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const [loaded, error] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
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
    <>
      <ActiveServiceRequestRestore />
      <ServiceRequestLiveNavigation />
      <RootStack />
    </>
  );
}

function RootStack() {
  const colorScheme = useColorScheme();

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { flex: 1, backgroundColor: '#F4F6F9' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { fontFamily: NUNITO.bold, fontSize: 17, letterSpacing: -0.2 },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Sign in', presentation: 'modal' }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Product' }} />
        <Stack.Screen name="service/[categoryId]" options={{ title: 'Book service' }} />
        <Stack.Screen name="service/complete-pending" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="service/requesting" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="service/track/[requestId]" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ headerShown: false }} />
        <Stack.Screen name="orders/index" options={{ title: 'My orders' }} />
        <Stack.Screen name="orders/[id]" options={{ title: 'Order' }} />
        <Stack.Screen name="garage/index" options={{ title: 'My Vehicles' }} />
        <Stack.Screen name="garage/[id]/index" options={{ title: 'Vehicle' }} />
        <Stack.Screen name="garage/[id]/records" options={{ title: 'Service records' }} />
        <Stack.Screen name="garage/add" options={{ title: 'Add vehicle' }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
