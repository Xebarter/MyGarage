import { Redirect } from 'expo-router';

/** Default home route — opens on the Services tab. */
export default function TabsIndexRedirect() {
  return <Redirect href="/(tabs)/services" />;
}
