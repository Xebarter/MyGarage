/** App is light-first; always return light for consistent professional chrome. */
export const useColorScheme = (): 'light' | 'dark' => {
  return 'light';
};
