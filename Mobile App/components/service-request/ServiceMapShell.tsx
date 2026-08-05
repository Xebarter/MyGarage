import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

type ServiceMapShellProps = {
  children: ReactNode;
};

/** Ensures map screens fill the stack viewport (required for MapView to render). */
export function ServiceMapShell({ children }: ServiceMapShellProps) {
  const { width, height } = useWindowDimensions();

  return (
    <View style={[styles.shell, { width, height }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#F6F7F9',
  },
});
