import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_CHECKOUT_KEY = 'mygarage_last_checkout_id_v1';

export async function setLastCheckoutId(checkoutId: string): Promise<void> {
  await AsyncStorage.setItem(LAST_CHECKOUT_KEY, checkoutId.trim());
}

export async function getLastCheckoutId(): Promise<string | null> {
  const id = await AsyncStorage.getItem(LAST_CHECKOUT_KEY);
  return id?.trim() ? id.trim() : null;
}

export async function clearLastCheckoutId(): Promise<void> {
  await AsyncStorage.removeItem(LAST_CHECKOUT_KEY);
}
