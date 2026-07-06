import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';

type ColorsType = (typeof Colors)['light'];
type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function EmptyState({
  colors,
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  colors: ColorsType;
  icon: IoniconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '12' }]}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.emptyAction,
            { backgroundColor: colors.primary, opacity: pressed ? 0.92 : 1 },
          ]}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ListCard({
  colors,
  title,
  subtitle,
  meta,
  unread,
  children,
  onPress,
}: {
  colors: ColorsType;
  title: string;
  subtitle?: string;
  meta?: string;
  unread?: boolean;
  children?: ReactNode;
  onPress?: () => void;
}) {
  const body = (
    <>
      <View style={styles.listCardTop}>
        <View style={styles.listCardCopy}>
          <Text style={[styles.listCardTitle, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.listCardSubtitle, { color: colors.textMuted }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {meta ? <Text style={[styles.listCardMeta, { color: colors.textMuted }]}>{meta}</Text> : null}
        </View>
        {unread ? <View style={styles.unreadDot} /> : null}
      </View>
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.listCard,
          {
            backgroundColor: unread ? colors.primary + '08' : colors.background,
            borderColor: colors.border,
            opacity: pressed ? 0.94 : 1,
          },
        ]}>
        {body}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.listCard,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}>
      {body}
    </View>
  );
}

export function StatusPill({
  colors,
  label,
  tone = 'neutral',
}: {
  colors: ColorsType;
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'primary';
}) {
  const palette = {
    success: { bg: colors.success + '22', text: colors.success },
    warning: { bg: '#F59E0B22', text: '#D97706' },
    danger: { bg: colors.destructive + '18', text: colors.destructive },
    primary: { bg: colors.primary + '18', text: colors.primary },
    neutral: { bg: colors.border, text: colors.textMuted },
  }[tone];

  return (
    <View style={[styles.statusPill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.statusPillText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function ChipSelect<T extends string>({
  colors,
  options,
  value,
  onChange,
  labels,
}: {
  colors: ColorsType;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.chip,
              {
                borderColor: active ? colors.primary + '55' : colors.border,
                backgroundColor: active ? colors.primary + '14' : colors.background,
              },
            ]}>
            <Text
              style={[
                styles.chipText,
                { color: active ? colors.primary : colors.text, fontWeight: active ? '800' : '600' },
              ]}>
              {labels?.[opt] ?? opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SwitchRow({
  colors,
  label,
  description,
  value,
  onValueChange,
}: {
  colors: ColorsType;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={[styles.switchRow, { borderBottomColor: colors.border }]}>
      <View style={styles.switchCopy}>
        <Text style={[styles.switchLabel, { color: colors.text }]}>{label}</Text>
        {description ? (
          <Text style={[styles.switchDescription, { color: colors.textMuted }]}>{description}</Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.primary }} />
    </View>
  );
}

export function Field({
  label,
  colors,
  value,
  editable = true,
  onChange,
  multiline,
  placeholder,
  secureTextEntry,
}: {
  label: string;
  colors: ColorsType;
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      {editable ? (
        <TextInput
          value={value}
          onChangeText={onChange}
          multiline={multiline}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          style={[
            styles.input,
            {
              borderColor: colors.border,
              color: colors.text,
              backgroundColor: colors.background,
              minHeight: multiline ? 88 : 48,
            },
          ]}
        />
      ) : (
        <Text style={[styles.fieldValue, { color: colors.text }]}>{value || '—'}</Text>
      )}
    </View>
  );
}

export function PrimaryButton({
  colors,
  label,
  onPress,
  disabled,
  loading,
}: {
  colors: ColorsType;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        {
          backgroundColor: colors.primary,
          opacity: disabled ? 0.55 : pressed ? 0.9 : 1,
        },
      ]}>
      <Text style={styles.primaryBtnText}>{loading ? 'Please wait…' : label}</Text>
    </Pressable>
  );
}

export function OutlineButton({
  colors,
  label,
  onPress,
  destructive,
}: {
  colors: ColorsType;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const tone = destructive ? colors.destructive : colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.outlineBtn,
        {
          borderColor: destructive ? colors.destructive + '55' : colors.border,
          backgroundColor: destructive ? colors.destructive + '08' : colors.background,
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <Text style={[styles.outlineBtnText, { color: tone }]}>{label}</Text>
    </Pressable>
  );
}

export function InlineActions({
  colors,
  actions,
}: {
  colors: ColorsType;
  actions: Array<{ label: string; onPress: () => void; destructive?: boolean }>;
}) {
  return (
    <View style={styles.inlineActions}>
      {actions.map((action) => (
        <Pressable key={action.label} onPress={action.onPress} hitSlop={6}>
          <Text
            style={{
              color: action.destructive ? colors.destructive : colors.primary,
              fontWeight: '700',
              fontSize: 13,
            }}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function PanelInset({ children }: { children: ReactNode }) {
  return <View style={styles.panelInset}>{children}</View>;
}

const styles = StyleSheet.create({
  panelInset: { padding: 16, gap: 12 },
  empty: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyMessage: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 300 },
  emptyAction: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  emptyActionText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  listCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  listCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  listCardCopy: { flex: 1, gap: 4, minWidth: 0 },
  listCardTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.15 },
  listCardSubtitle: { fontSize: 13, lineHeight: 18 },
  listCardMeta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginTop: 4,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: { fontSize: 13, textTransform: 'capitalize' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  switchCopy: { flex: 1, gap: 2 },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  switchDescription: { fontSize: 12, lineHeight: 17 },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fieldValue: { fontSize: 15, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  outlineBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
  },
  outlineBtnText: { fontWeight: '700', fontSize: 14 },
  inlineActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
});
