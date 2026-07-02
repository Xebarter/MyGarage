import { Redirect } from 'expo-router';

/** Legacy home route — storefront lives on the Shop tab. */
export default function TabsIndexRedirect() {
  return <Redirect href="/(tabs)/shop" />;
}
