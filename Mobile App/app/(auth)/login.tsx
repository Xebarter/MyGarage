import { Ionicons } from '@expo/vector-icons';
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
        <View style={[styles.configCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.configLogoWrap, { backgroundColor: colors.primary + '12' }]}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Sign-in unavailable</Text>
          <Text style={[styles.pageHint, { color: colors.textMuted, textAlign: 'center' }]}>
            This app build is missing Supabase settings. If you installed a preview APK, ask the developer to run{' '}
            <Text style={{ fontFamily: 'monospace' }}>eas env:push preview --path .env</Text> and rebuild.
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
      <Stack.Screen options={{ title: mode === 'signin' ? 'Sign in' : 'Create account' }} />
      <KeyboardAvoidingView
        style={[styles.page, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.brandRow}>
              <View style={[styles.logoWrap, { backgroundColor: colors.primary + '12' }]}>
                <Image source={LOGO} style={styles.logo} resizeMode="contain" />
              </View>
              <View>
                <Text style={[styles.brandName, { color: colors.text }]}>MyGarage</Text>
                <Text style={[styles.brandTagline, { color: colors.textMuted }]}>Parts &amp; Services</Text>
              </View>
            </View>

            <View style={styles.heroCopy}>
              <Text style={[styles.heroEyebrow, { color: colors.primary }]}>WELCOME</Text>
              <Text style={[styles.pageTitle, { color: colors.text }]}>
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
              <Text style={[styles.pageHint, { color: colors.textMuted }]}>
                {mode === 'signin'
                  ? 'Manage orders and service requests'
                  : 'Track purchases and get help faster'}
              </Text>
            </View>
          </View>

          {/* Auth Card */}
          <View style={[styles.authCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Mode Toggle */}
            <View style={[styles.segment, { backgroundColor: colors.background, borderColor: colors.border }]}>
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

            {/* Google Button */}
            <Pressable
              onPress={() => void handleGoogleSignIn()}
              disabled={busy}
              style={({ pressed }) => [
                styles.googleBtn,
                {
                  backgroundColor: colors.background,
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
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Form */}
            <View style={styles.form}>
              {mode === 'signup' && (
                <InputRow
                  icon="person-outline"
                  colors={colors}
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  autoComplete="name"
                />
              )}

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
                secureTextEntry
                autoComplete={mode === 'signin' ? 'password' : 'new-password'}
              />

              {error && (
                <View style={[styles.errorCard, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive + '22' }]}>
                  <Ionicons name="alert-circle" size={18} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </View>
              )}

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

          {/* Footer */}
          <View style={styles.footerNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Secure sign-in • Protected by Supabase
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
}) {
  return (
    <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete as any}
        style={[styles.input, { color: colors.text }]}
      />
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
    paddingTop: 40,
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
  },
  logo: {
    width: 32,
    height: 32,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroCopy: {
    alignItems: 'center',
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
  },
  pageHint: {
    fontSize: 15.5,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 300,
  },
  authCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 18,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 12,
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
    borderRadius: 16,
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