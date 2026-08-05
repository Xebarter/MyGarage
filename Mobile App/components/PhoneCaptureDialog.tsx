import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { isValidBuyerPhone } from '@/lib/phone';

type Props = {
  visible: boolean;
  initialPhone?: string;
  title?: string;
  hint?: string;
  saveLabel?: string;
  saving?: boolean;
  onClose?: () => void;
  onSave: (phone: string) => void | Promise<void>;
};

export function PhoneCaptureDialog({
  visible,
  initialPhone = '',
  title = 'Phone number',
  hint = 'Providers use this number to reach you about your service request.',
  saveLabel = 'Save and continue',
  saving = false,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [value, setValue] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setValue(initialPhone);
      setError(null);
    }
  }, [initialPhone, visible]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!isValidBuyerPhone(trimmed)) {
      setError('Enter a valid phone number (at least 9 digits).');
      return;
    }
    setError(null);
    try {
      await onSave(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save phone number.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.avoid}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginBottom: insets.bottom + 16,
              },
            ]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '14' }]}>
              <Ionicons name="call-outline" size={22} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>

            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.background,
                  borderColor: error ? colors.destructive : colors.border,
                },
              ]}>
              <TextInput
                value={value}
                onChangeText={(text) => {
                  setValue(text);
                  if (error) setError(null);
                }}
                placeholder="e.g. +256 700 000000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                autoFocus
                editable={!saving}
                style={[styles.input, { color: colors.text }]}
              />
            </View>

            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: saving || pressed ? 0.88 : 1 },
              ]}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{saveLabel}</Text>
              )}
            </Pressable>

            {onClose ? (
              <Pressable onPress={onClose} disabled={saving} hitSlop={8} style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>Not now</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avoid: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 12,
    alignItems: 'stretch',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 50,
    justifyContent: 'center',
    marginTop: 4,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 12,
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
