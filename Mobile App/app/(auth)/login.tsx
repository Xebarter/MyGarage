import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { AppTheme, appShadow } from '@/constants/AppTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { isSupabaseConfigured } from '@/lib/config';
import { googleSignInErrorMessage } from '@/lib/googleAuth';
import { readPendingServiceRequest } from '@/lib/service-request-storage';

const LOGO = require('@/assets/images/icon.png');

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const { user, signIn, signUp, signInWithGoogle, loading: authLoading } = useAuth();
  const postAuthHandled = useRef(false);

  useEffect(() => {
    if (!user || authLoading || postAuthHandled.current) return;

    void (async () => {
      postAuthHandled.current = true;
      const pending = await readPendingServiceRequest();
      if (pending) {
        router.replace('/service/complete-pending');
        return;
      }
      router.back();
    })();
  }, [authLoading, router, user]);

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const busy = loading || googleLoading;

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(googleSignInErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Full name is required.');
        await signUp(email.trim(), password, name.trim());
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.configCard, appShadow('md'), { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.configLogoWrap, { backgroundColor: colors.primary + '12' }]}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Sign-in unavailable</Text>
          <Text style={[styles.pageHint, { color: colors.textMuted, textAlign: 'center' }]}>
            This app build is missing Supabase settings. Add production environment variables on expo.dev, then rebuild with{' '}
            <Text style={{ fontFamily: 'monospace' }}>eas build -p android --profile preview</Text>.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: mode === 'signin' ? 'Sign in' : 'Create account', headerShadowVisible: false }} />
      <KeyboardAvoidingView
        style={[styles.page, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LinearGradient
          colors={['#EEF4FF', colors.background, colors.background]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.brandRow}>
              <View style={[styles.logoWrap, appShadow('sm'), { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Image source={LOGO} style={styles.logo} resizeMode="contain" />
              </View>
              <View>
                <Text style={[styles.brandName, { color: colors.text }]}>MyGarage</Text>
                <Text style={[styles.brandTagline, { color: colors.textMuted }]}>Parts &amp; Services</Text>
              </View>
            </View>

            <View style={styles.heroCopy}>
              <Text style={[styles.pageTitle, { color: colors.text }]}>
                {mode === 'signin' ? 'Welcome back' : 'Create account'}
              </Text>
              <Text style={[styles.pageHint, { color: colors.textMuted }]}>
                {mode === 'signin'
                  ? 'Sign in to manage orders and service requests'
                  : 'Track purchases and get roadside help faster'}
              </Text>
            </View>
          </View>

          <View style={[styles.authCard, appShadow('md'), { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.segment, { backgroundColor: AppTheme.colors.surfaceMuted, borderColor: colors.border }]}>
              {(['signin', 'signup'] as const).map((tab) => {
                const active = mode === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => {
                      setMode(tab);
                      setError(null);
                      setName('');
                    }}
                    style={[styles.segmentBtn, active && { backgroundColor: colors.primary }]}>
                    <Text style={[styles.segmentText, { color: active ? '#FFFFFF' : colors.text }]}>
                      {tab === 'signin' ? 'Sign in' : 'Create account'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => void handleGoogleSignIn()}
              disabled={busy}
              style={({ pressed }) => [
                styles.googleBtn,
                {
                  backgroundColor: AppTheme.colors.surfaceMuted,
                  borderColor: colors.border,
                  opacity: busy ? 0.7 : pressed ? 0.9 : 1,
                },
              ]}>
              {googleLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <View style={styles.googleBtnContent}>
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                  <Text style={[styles.googleBtnText, { color: colors.text }]}>Continue with Google</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>or email</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.form}>
              {mode === 'signup' ? (
                <InputRow
                  icon="person-outline"
                  colors={colors}
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  autoComplete="name"
                />
              ) : null}

              <InputRow
                icon="mail-outline"
                colors={colors}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <InputRow
                icon="lock-closed-outline"
                colors={colors}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry={!showPassword}
                autoComplete={mode === 'signin' ? 'password' : 'new-password'}
                rightAction={{
                  icon: showPassword ? 'eye-off-outline' : 'eye-outline',
                  accessibilityLabel: showPassword ? 'Hide password' : 'View password',
                  onPress: () => setShowPassword((v) => !v),
                }}
              />

              {error ? (
                <View style={[styles.errorCard, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive + '22' }]}>
                  <Ionicons name="alert-circle" size={18} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => void handleSubmit()}
                disabled={busy || !email.trim() || !password.trim() || (mode === 'signup' && !name.trim())}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: busy ? 0.75 : pressed ? 0.9 : 1,
                  },
                ]}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {mode === 'signin' ? 'Sign in' : 'Create account'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.footerNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Secure sign-in · Protected by encryption
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function InputRow({
  icon,
  colors,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  rightAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  colors: (typeof Colors)['light'];
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'words';
  autoComplete?: string;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    accessibilityLabel: string;
    onPress: () => void;
  };
}) {
  return (
    <View style={[styles.inputRow, { backgroundColor: AppTheme.colors.surfaceMuted, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete as never}
        style={[styles.input, { color: colors.text }]}
      />
      {rightAction ? (
        <Pressable
          onPress={rightAction.onPress}
          accessibilityRole="button"
          accessibilityLabel={rightAction.accessibilityLabel}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 4 })}
        >
          <Ionicons name={rightAction.icon} size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 40,
    gap: 28,
  },
  hero: {
    gap: 20,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  configCard: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderRadius: 28,
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  configLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    alignSelf: 'flex-start',
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  logo: {
    width: 32,
    height: 32,
  },
  brandName: {
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.45,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '500',
  },
  heroCopy: {
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  pageHint: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
  },
  authCard: {
    borderWidth: 1,
    borderRadius: AppTheme.radius.xl,
    padding: 20,
    gap: 18,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 10,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 1.5,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  form: {
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
  },
  primaryBtn: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    alignSelf: 'stretch',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
