import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  createBuyerVehicleDocument,
  deleteBuyerProfile,
  deleteBuyerVehicleDocument,
  fetchBuyerControlCenter,
  fetchBuyerVehicles,
  markBuyerNotificationsRead,
  sendServiceRequestMessage,
  fetchServiceRequestMessages,
  submitProviderRating,
  updateBuyerAccount,
  updateBuyerAppPreferences,
  updateBuyerNotificationPreferences,
  updateBuyerProfile,
  updateServiceRecommendation,
  subscribeBuyerPlan,
  cancelBuyerSubscription,
} from '@/lib/api';
import { SUBSCRIPTION_PLANS, TIER_COLORS, formatPlanPrice, type SubscriptionTier } from '@/lib/subscription-plans';
import * as Linking from 'expo-linking';
import { getSupabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import type { BuyerControlCenterData } from '@/types';

const TABS = [
  { id: 'account', label: 'Account', icon: 'person-outline' as const },
  { id: 'notifications', label: 'Alerts', icon: 'notifications-outline' as const },
  { id: 'billing', label: 'Billing', icon: 'card-outline' as const },
  { id: 'membership', label: 'Plans', icon: 'ribbon-outline' as const },
  { id: 'documents', label: 'Docs', icon: 'document-text-outline' as const },
  { id: 'services', label: 'Services', icon: 'construct-outline' as const },
  { id: 'insights', label: 'Insights', icon: 'stats-chart-outline' as const },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' as const },
] as const;

type TabId = (typeof TABS)[number]['id'];

type Props = {
  customerId: string;
  onRefreshProfile?: () => Promise<void>;
};

export function ProfileControlCenter({ customerId, onRefreshProfile }: Props) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [activeTab, setActiveTab] = useState<TabId>('account');
  const [data, setData] = useState<BuyerControlCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [password, setPassword] = useState('');
  const [vehicles, setVehicles] = useState<Array<{ id: string; make: string; model: string; nickname?: string | null }>>([]);
  const [docForm, setDocForm] = useState({ vehicleId: '', name: '', fileUrl: '', expiresAt: '', documentType: 'insurance' });
  const [messageRequestId, setMessageRequestId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; senderType: string; message: string }>>([]);
  const [messageDraft, setMessageDraft] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [center, vehicleList] = await Promise.all([
        fetchBuyerControlCenter(customerId),
        fetchBuyerVehicles(customerId),
      ]);
      setData(center);
      setVehicles(vehicleList);
      setForm({
        name: center.profile.customer.name,
        phone: center.profile.customer.phone,
        address: center.profile.customer.address,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateBuyerProfile(customerId, form);
      await load();
      await onRefreshProfile?.();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const upcoming = useMemo(
    () => data?.serviceRequests.filter((r) => !['completed', 'cancelled'].includes(r.status)) ?? [],
    [data],
  );
  const past = useMemo(
    () => data?.serviceRequests.filter((r) => ['completed', 'cancelled'].includes(r.status)) ?? [],
    [data],
  );

  if (loading && !data) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tabPill,
              {
                backgroundColor: activeTab === tab.id ? colors.primary : colors.card,
                borderColor: activeTab === tab.id ? colors.primary : colors.border,
              },
            ]}>
            <Ionicons name={tab.icon} size={14} color={activeTab === tab.id ? '#fff' : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === tab.id ? '#fff' : colors.text }]}>{tab.label}</Text>
            {tab.id === 'notifications' && data.unreadNotificationCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{data.unreadNotificationCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {activeTab === 'account' ? (
          <AccountTab
            colors={colors}
            data={data}
            form={form}
            editing={editing}
            saving={saving}
            password={password}
            onChangeForm={setForm}
            onChangePasswordText={setPassword}
            onEdit={() => setEditing(true)}
            onCancel={() => setEditing(false)}
            onSave={() => void saveProfile()}
            onPreferredContact={(v) => void updateBuyerAccount(customerId, { preferredContactMethod: v }).then(load)}
            onSubmitPassword={async () => {
              const supabase = getSupabase();
              if (!supabase || password.length < 8) {
                Alert.alert('Password', 'Use at least 8 characters.');
                return;
              }
              const { error } = await supabase.auth.updateUser({ password });
              Alert.alert('Password', error?.message ?? 'Password updated.');
              if (!error) setPassword('');
            }}
            onDeactivate={() => {
              Alert.alert('Deactivate account', 'You can contact support to reactivate.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Deactivate',
                  style: 'destructive',
                  onPress: () => void updateBuyerAccount(customerId, { accountStatus: 'deactivated' }).then(load),
                },
              ]);
            }}
            onDelete={() => {
              Alert.alert('Delete account', 'This permanently removes your data.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => void deleteBuyerProfile(customerId).then(() => router.replace('/(auth)/login')),
                },
              ]);
            }}
            onOpenVehicles={() => router.push('/garage/index')}
          />
        ) : null}

        {activeTab === 'notifications' ? (
          <NotificationsTab
            colors={colors}
            data={data}
            onMarkAll={() => void markBuyerNotificationsRead(customerId, { markAll: true }).then(load)}
            onMark={(id) => void markBuyerNotificationsRead(customerId, { notificationId: id }).then(load)}
            onToggle={(key, value) =>
              void updateBuyerNotificationPreferences(customerId, { [key]: value }).then(load)
            }
          />
        ) : null}

        {activeTab === 'billing' ? <BillingTab colors={colors} data={data} /> : null}

        {activeTab === 'membership' ? (
          <MembershipTab
            colors={colors}
            customerId={customerId}
            customerPhone={data.profile.customer.phone}
            subscription={data.subscription}
            subscriptionHistory={data.subscriptionHistory}
            onChanged={load}
          />
        ) : null}

        {activeTab === 'documents' ? (
          <DocumentsTab
            colors={colors}
            data={data}
            vehicles={vehicles}
            docForm={docForm}
            onChangeDocForm={setDocForm}
            onAdd={() => {
              if (!docForm.vehicleId || !docForm.name.trim()) return;
              setSaving(true);
              void createBuyerVehicleDocument({
                customerId,
                vehicleId: docForm.vehicleId,
                documentType: docForm.documentType,
                name: docForm.name,
                fileUrl: docForm.fileUrl || null,
                expiresAt: docForm.expiresAt || null,
              })
                .then(() => {
                  setDocForm({ vehicleId: '', name: '', fileUrl: '', expiresAt: '', documentType: 'insurance' });
                  return load();
                })
                .finally(() => setSaving(false));
            }}
            onDelete={(id) => {
              Alert.alert('Remove document?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => void deleteBuyerVehicleDocument(id, customerId).then(load) },
              ]);
            }}
          />
        ) : null}

        {activeTab === 'services' ? (
          <ServicesTab
            colors={colors}
            upcoming={upcoming}
            past={past}
            recommendations={data.recommendations}
            ratings={data.ratings}
            onRequest={() => router.push('/(tabs)/services')}
            onTrack={(id) => router.push(`/service/track/${id}`)}
            onRecommend={(id, status) => void updateServiceRecommendation(id, customerId, status).then(load)}
            onRate={(providerId, stars) => void submitProviderRating(customerId, providerId, stars).then(load)}
            onOpenMessages={async (requestId) => {
              setMessageRequestId(requestId);
              const msgs = await fetchServiceRequestMessages(requestId, customerId);
              setMessages(msgs);
            }}
            messageRequestId={messageRequestId}
            messages={messages}
            messageDraft={messageDraft}
            onChangeMessageDraft={setMessageDraft}
            onSendMessage={() => {
              if (!messageRequestId || !messageDraft.trim()) return;
              void sendServiceRequestMessage(messageRequestId, customerId, messageDraft).then(async () => {
                setMessageDraft('');
                const msgs = await fetchServiceRequestMessages(messageRequestId, customerId);
                setMessages(msgs);
              });
            }}
          />
        ) : null}

        {activeTab === 'insights' ? <InsightsTab colors={colors} data={data} /> : null}

        {activeTab === 'settings' ? (
          <SettingsTab
            colors={colors}
            preferences={data.preferences}
            onUpdate={(patch) => void updateBuyerAppPreferences(customerId, patch).then(load)}
          />
        ) : null}
      </View>
    </View>
  );
}

function SectionTitle({ children, colors }: { children: string; colors: (typeof Colors)['light'] }) {
  return <Text style={[styles.sectionTitle, { color: colors.text }]}>{children}</Text>;
}

function AccountTab({
  colors,
  data,
  form,
  editing,
  saving,
  password,
  onChangeForm,
  onChangePasswordText,
  onSubmitPassword,
  onEdit,
  onCancel,
  onSave,
  onPreferredContact,
  onDeactivate,
  onDelete,
  onOpenVehicles,
}: {
  colors: (typeof Colors)['light'];
  data: BuyerControlCenterData;
  form: { name: string; phone: string; address: string };
  editing: boolean;
  saving: boolean;
  password: string;
  onChangeForm: (v: typeof form) => void;
  onChangePasswordText: (v: string) => void;
  onSubmitPassword: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onPreferredContact: (v: string) => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onOpenVehicles: () => void;
}) {
  return (
    <View style={styles.sectionBody}>
      <View style={styles.rowBetween}>
        <SectionTitle colors={colors}>Personal details</SectionTitle>
        {!editing ? (
          <Pressable onPress={onEdit}><Text style={{ color: colors.primary, fontWeight: '700' }}>Edit</Text></Pressable>
        ) : null}
      </View>
      <Field label="Name" colors={colors} value={form.name} editable={editing} onChange={(name) => onChangeForm({ ...form, name })} />
      {data.profile.defaultAddress ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>Default address</Text>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{data.profile.defaultAddress.label}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{data.profile.defaultAddress.fullAddress}</Text>
        </View>
      ) : null}
      <Field label="Address" colors={colors} value={form.address} editable={editing} onChange={(address) => onChangeForm({ ...form, address })} multiline />
      {editing ? (
        <View style={styles.rowGap}>
          <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onSave} disabled={saving}>
            <Text style={styles.btnText}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
          <Pressable style={[styles.btnOutline, { borderColor: colors.border }]} onPress={onCancel}>
            <Text style={{ color: colors.text }}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      <SectionTitle colors={colors}>Verification</SectionTitle>
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>
        Email {data.account.emailVerified ? 'verified' : 'unverified'} · Phone {data.account.phoneVerified ? 'verified' : 'unverified'}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>Status: {data.account.accountStatus}</Text>

      <SectionTitle colors={colors}>Preferred contact</SectionTitle>
      <View style={styles.chipRow}>
        {(['email', 'phone', 'both'] as const).map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onPreferredContact(opt)}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: data.account.preferredContactMethod === opt ? colors.primary + '20' : colors.background }]}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>{opt}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle colors={colors}>Security</SectionTitle>
      <TextInput
        value={password}
        onChangeText={onChangePasswordText}
        placeholder="New password (8+ chars)"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
      />
      <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onSubmitPassword}>
        <Text style={styles.btnText}>Update password</Text>
      </Pressable>

      <Pressable style={[styles.linkRow, { borderColor: colors.border }]} onPress={onOpenVehicles}>
        <Ionicons name="car-sport-outline" size={18} color={colors.primary} />
        <Text style={[styles.linkLabel, { color: colors.text }]}>My Vehicles</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>

      <Pressable style={[styles.btnOutline, { borderColor: colors.destructive }]} onPress={onDeactivate}>
        <Text style={{ color: colors.destructive }}>Deactivate account</Text>
      </Pressable>
      <Pressable style={[styles.btnOutline, { borderColor: colors.destructive }]} onPress={onDelete}>
        <Text style={{ color: colors.destructive }}>Delete account permanently</Text>
      </Pressable>
    </View>
  );
}

function NotificationsTab({
  colors,
  data,
  onMarkAll,
  onMark,
  onToggle,
}: {
  colors: (typeof Colors)['light'];
  data: BuyerControlCenterData;
  onMarkAll: () => void;
  onMark: (id: string) => void;
  onToggle: (key: string, value: boolean) => void;
}) {
  const prefs = data.notificationPreferences;
  return (
    <View style={styles.sectionBody}>
      <View style={styles.rowBetween}>
        <SectionTitle colors={colors}>Notifications</SectionTitle>
        <Pressable onPress={onMarkAll}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Mark all read</Text></Pressable>
      </View>
      {data.notifications.length === 0 ? (
        <Text style={{ color: colors.textMuted }}>No notifications yet.</Text>
      ) : (
        data.notifications.map((n) => (
          <Pressable key={n.id} onPress={() => onMark(n.id)} style={[styles.listItem, { borderColor: colors.border, backgroundColor: n.readAt ? 'transparent' : colors.primary + '08' }]}>
            <Text style={[styles.itemTitle, { color: colors.text }]}>{n.title}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{n.body}</Text>
          </Pressable>
        ))
      )}
      <SectionTitle colors={colors}>Preferences</SectionTitle>
      {([
        ['emailEnabled', 'Email'],
        ['smsEnabled', 'SMS'],
        ['inAppEnabled', 'In-app'],
        ['serviceUpdates', 'Service updates'],
        ['maintenanceReminders', 'Maintenance reminders'],
        ['marketing', 'Marketing'],
      ] as const).map(([key, label]) => (
        <View key={key} style={styles.switchRow}>
          <Text style={{ color: colors.text }}>{label}</Text>
          <Switch value={prefs[key]} onValueChange={(v) => onToggle(key, v)} />
        </View>
      ))}
    </View>
  );
}

function BillingTab({ colors, data }: { colors: (typeof Colors)['light']; data: BuyerControlCenterData }) {
  return (
    <View style={styles.sectionBody}>
      <SectionTitle colors={colors}>Payment summary</SectionTitle>
      <Text style={{ color: colors.textMuted }}>
        {data.pendingPaymentTotal > 0
          ? `Outstanding: ${formatCurrency(data.pendingPaymentTotal)}`
          : 'No pending payments.'}
      </Text>
      <SectionTitle colors={colors}>History</SectionTitle>
      {data.payments.length === 0 ? (
        <Text style={{ color: colors.textMuted }}>No payments yet.</Text>
      ) : (
        data.payments.map((p) => (
          <View key={p.id} style={[styles.listItem, { borderColor: colors.border }]}>
            <Text style={[styles.itemTitle, { color: colors.text }]}>{p.label}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {formatCurrency(p.amount)} · {p.status}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function MembershipTab({
  colors,
  customerId,
  customerPhone,
  subscription,
  subscriptionHistory,
  onChanged,
}: {
  colors: (typeof Colors)['light'];
  customerId: string;
  customerPhone?: string;
  subscription: BuyerControlCenterData['subscription'];
  subscriptionHistory?: BuyerControlCenterData['subscriptionHistory'];
  onChanged: () => Promise<void>;
}) {
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
  const activeTier = subscription?.status === 'active' ? subscription.planTier : null;

  const subscribe = async (tier: SubscriptionTier) => {
    setLoadingTier(tier);
    try {
      const result = await subscribeBuyerPlan({ customerId, planTier: tier, customerPhone });
      if (result.checkoutUrl) {
        await Linking.openURL(result.checkoutUrl);
      } else {
        await onChanged();
        Alert.alert('Subscribed', `You are now on the ${tier} plan.`);
      }
    } catch (e) {
      Alert.alert('Subscription', e instanceof Error ? e.message : 'Could not subscribe');
    } finally {
      setLoadingTier(null);
    }
  };

  const cancel = () => {
    Alert.alert('Cancel membership?', 'Benefits remain until the end of your billing period.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: () => {
          void cancelBuyerSubscription(customerId).then(onChanged);
        },
      },
    ]);
  };

  return (
    <View style={styles.sectionBody}>
      {subscription?.status === 'active' ? (
        <View style={[styles.listItem, { borderColor: colors.primary }]}>
          <Text style={[styles.itemTitle, { color: colors.text }]}>Current: {subscription.planTier}</Text>
          <Pressable onPress={cancel}><Text style={{ color: colors.destructive, marginTop: 6 }}>Cancel membership</Text></Pressable>
        </View>
      ) : null}

      {SUBSCRIPTION_PLANS.map((plan) => {
        const tierStyle = TIER_COLORS[plan.tier];
        const isActive = activeTier === plan.tier;
        return (
          <View key={plan.tier} style={[styles.planCard, { borderColor: tierStyle.border }]}>
            <View style={[styles.planHeader, { backgroundColor: tierStyle.bg }]}>
              <Text style={{ color: tierStyle.text, fontSize: 18, fontWeight: '800' }}>{plan.name}</Text>
              <Text style={{ color: tierStyle.text, opacity: 0.9, fontSize: 12 }}>{plan.tagline}</Text>
              <Text style={{ color: tierStyle.text, fontSize: 22, fontWeight: '800', marginTop: 8 }}>
                {formatPlanPrice(plan)}{plan.monthlyPrice > 0 ? '/mo' : ''}
              </Text>
            </View>
            <View style={{ padding: 12, gap: 6 }}>
              {plan.features.map((f) => (
                <Text key={f} style={{ color: colors.textMuted, fontSize: 13 }}>• {f}</Text>
              ))}
              <Pressable
                disabled={isActive || loadingTier !== null}
                onPress={() => void subscribe(plan.tier)}
                style={[styles.btn, { backgroundColor: isActive ? colors.border : colors.primary, marginTop: 8 }]}>
                <Text style={styles.btnText}>
                  {loadingTier === plan.tier ? 'Please wait…' : isActive ? 'Current plan' : `Subscribe to ${plan.name}`}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {subscriptionHistory && subscriptionHistory.length > 0 ? (
        <>
          <SectionTitle colors={colors}>Subscription history</SectionTitle>
          {subscriptionHistory.map((sub) => (
            <View key={sub.id} style={[styles.listItem, { borderColor: colors.border }]}>
              <Text style={[styles.itemTitle, { color: colors.text, textTransform: 'capitalize' }]}>{sub.planTier} plan</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {sub.status} · {new Date(sub.startedAt ?? sub.createdAt).toLocaleDateString()}
                {sub.cancelledAt ? ` – ${new Date(sub.cancelledAt).toLocaleDateString()}` : ''}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

function DocumentsTab({
  colors,
  data,
  vehicles,
  docForm,
  onChangeDocForm,
  onAdd,
  onDelete,
}: {
  colors: (typeof Colors)['light'];
  data: BuyerControlCenterData;
  vehicles: Array<{ id: string; make: string; model: string; nickname?: string | null }>;
  docForm: { vehicleId: string; name: string; fileUrl: string; expiresAt: string; documentType: string };
  onChangeDocForm: (v: typeof docForm) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={styles.sectionBody}>
      {data.documentAlerts.length > 0 ? (
        <View style={[styles.alertBox, { borderColor: '#f59e0b' }]}>
          <Text style={{ color: '#b45309', fontWeight: '700' }}>{data.documentAlerts.length} document alert(s)</Text>
        </View>
      ) : null}
      <SectionTitle colors={colors}>Add document</SectionTitle>
      <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700' }}>Document type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {(['logbook', 'insurance', 'inspection', 'registration', 'warranty', 'other'] as const).map((type) => (
          <Pressable
            key={type}
            onPress={() => onChangeDocForm({ ...docForm, documentType: type })}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: docForm.documentType === type ? colors.primary + '20' : colors.background }]}>
            <Text style={{ color: colors.text, fontSize: 12, textTransform: 'capitalize' }}>{type}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Field label="Document name" colors={colors} value={docForm.name} onChange={(name) => onChangeDocForm({ ...docForm, name })} />
      <Field label="File URL" colors={colors} value={docForm.fileUrl} onChange={(fileUrl) => onChangeDocForm({ ...docForm, fileUrl })} />
      <Field label="Expiry (YYYY-MM-DD)" colors={colors} value={docForm.expiresAt} onChange={(expiresAt) => onChangeDocForm({ ...docForm, expiresAt })} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {vehicles.map((v) => (
          <Pressable
            key={v.id}
            onPress={() => onChangeDocForm({ ...docForm, vehicleId: v.id })}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: docForm.vehicleId === v.id ? colors.primary + '20' : colors.background }]}>
            <Text style={{ color: colors.text, fontSize: 12 }}>{v.nickname || `${v.make} ${v.model}`}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onAdd}>
        <Text style={styles.btnText}>Add document</Text>
      </Pressable>
      <SectionTitle colors={colors}>Your documents</SectionTitle>
      {data.documents.length === 0 ? (
        <Text style={{ color: colors.textMuted }}>No documents uploaded yet.</Text>
      ) : (
      data.documents.map((doc) => (
        <View key={doc.id} style={[styles.listItem, { borderColor: colors.border }]}>
          <Text style={[styles.itemTitle, { color: colors.text }]}>{doc.name}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{doc.documentType}</Text>
          <Pressable onPress={() => onDelete(doc.id)}><Text style={{ color: colors.destructive, marginTop: 4 }}>Remove</Text></Pressable>
        </View>
      ))
      )}
    </View>
  );
}

function ServicesTab({
  colors,
  upcoming,
  past,
  recommendations,
  ratings,
  onRequest,
  onTrack,
  onRecommend,
  onRate,
  onOpenMessages,
  messageRequestId,
  messages,
  messageDraft,
  onChangeMessageDraft,
  onSendMessage,
}: {
  colors: (typeof Colors)['light'];
  upcoming: BuyerControlCenterData['serviceRequests'];
  past: BuyerControlCenterData['serviceRequests'];
  recommendations: BuyerControlCenterData['recommendations'];
  ratings: BuyerControlCenterData['ratings'];
  onRequest: () => void;
  onTrack: (id: string) => void;
  onRecommend: (id: string, status: 'approved' | 'rejected') => void;
  onRate: (providerId: string, stars: number) => void;
  onOpenMessages: (id: string) => void;
  messageRequestId: string | null;
  messages: Array<{ id: string; senderType: string; message: string }>;
  messageDraft: string;
  onChangeMessageDraft: (v: string) => void;
  onSendMessage: () => void;
}) {
  return (
    <View style={styles.sectionBody}>
      <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onRequest}>
        <Text style={styles.btnText}>Request new service</Text>
      </Pressable>
      <SectionTitle colors={colors}>Active</SectionTitle>
      {upcoming.length === 0 ? (
        <Text style={{ color: colors.textMuted }}>No active service requests.</Text>
      ) : (
        upcoming.map((item) => (
          <ServiceRow key={item.id} item={item} colors={colors} onTrack={onTrack} onMessage={onOpenMessages} />
        ))
      )}
      <SectionTitle colors={colors}>Past</SectionTitle>
      {past.length === 0 ? (
        <Text style={{ color: colors.textMuted }}>No past service requests.</Text>
      ) : (
        past.map((item) => (
        <View key={item.id}>
          <ServiceRow item={item} colors={colors} onTrack={onTrack} onMessage={onOpenMessages} />
          {item.providerId && item.status === 'completed' ? (
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => onRate(item.providerId!, star)}>
                  <Ionicons
                    name={(ratings.find((r) => r.providerId === item.providerId)?.stars ?? 0) >= star ? 'star' : 'star-outline'}
                    size={18}
                    color="#f59e0b"
                  />
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ))
      )}
      {recommendations.length === 0 ? null : recommendations.map((rec) => (
        <View key={rec.id} style={[styles.listItem, { borderColor: colors.border }]}>
          <Text style={[styles.itemTitle, { color: colors.text }]}>{rec.title}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{rec.description}</Text>
          {rec.status === 'pending' ? (
            <View style={styles.rowGap}>
              <Pressable onPress={() => onRecommend(rec.id, 'approved')}><Text style={{ color: colors.primary }}>Approve</Text></Pressable>
              <Pressable onPress={() => onRecommend(rec.id, 'rejected')}><Text style={{ color: colors.destructive }}>Reject</Text></Pressable>
            </View>
          ) : null}
        </View>
      ))}
      {messageRequestId ? (
        <View style={[styles.messageBox, { borderColor: colors.border }]}>
          {messages.map((m) => (
            <Text key={m.id} style={{ color: colors.text, fontSize: 13, marginBottom: 4 }}>
              <Text style={{ fontWeight: '700' }}>{m.senderType}: </Text>{m.message}
            </Text>
          ))}
          <TextInput
            value={messageDraft}
            onChangeText={onChangeMessageDraft}
            placeholder="Message provider..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          />
          <Pressable style={[styles.btn, { backgroundColor: colors.primary, marginTop: 8 }]} onPress={onSendMessage}>
            <Text style={styles.btnText}>Send</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ServiceRow({
  item,
  colors,
  onTrack,
  onMessage,
}: {
  item: BuyerControlCenterData['serviceRequests'][number];
  colors: (typeof Colors)['light'];
  onTrack: (id: string) => void;
  onMessage: (id: string) => void;
}) {
  return (
    <View style={[styles.listItem, { borderColor: colors.border }]}>
      <Text style={[styles.itemTitle, { color: colors.text }]}>{item.service}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.status}</Text>
      <View style={styles.rowGap}>
        <Pressable onPress={() => onTrack(item.id)}><Text style={{ color: colors.primary }}>Track</Text></Pressable>
        <Pressable onPress={() => onMessage(item.id)}><Text style={{ color: colors.primary }}>Message</Text></Pressable>
      </View>
    </View>
  );
}

function InsightsTab({ colors, data }: { colors: (typeof Colors)['light']; data: BuyerControlCenterData }) {
  const maxSpend = Math.max(...data.analytics.monthlySpend.map((m) => m.amount), 1);
  return (
    <View style={styles.sectionBody}>
      <Text style={{ color: colors.textMuted }}>Total maintenance: {formatCurrency(data.analytics.totalMaintenanceCost)}</Text>
      <Text style={{ color: colors.textMuted, marginTop: 4 }}>Services: {data.analytics.totalServices}</Text>
      {data.analytics.monthlySpend.length > 0 ? (
        <>
          <SectionTitle colors={colors}>Monthly service spend</SectionTitle>
          {data.analytics.monthlySpend.map((row) => (
            <View key={row.month} style={{ gap: 4 }}>
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.text, fontSize: 12 }}>{row.month}</Text>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{formatCurrency(row.amount)}</Text>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.max(8, (row.amount / maxSpend) * 100)}%`,
                    backgroundColor: colors.primary,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          ))}
        </>
      ) : null}
      <SectionTitle colors={colors}>Vehicle health</SectionTitle>
      {data.analytics.vehicles.map((v) => (
        <View key={v.vehicleId} style={[styles.listItem, { borderColor: colors.border }]}>
          <Text style={[styles.itemTitle, { color: colors.text }]}>{v.vehicleLabel}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {v.healthStatus} · {v.serviceCount} services · {formatCurrency(v.totalMaintenanceCost)}
          </Text>
          {v.commonIssues.length > 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
              Common: {v.commonIssues.join(', ')}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function SettingsTab({
  colors,
  preferences,
  onUpdate,
}: {
  colors: (typeof Colors)['light'];
  preferences: BuyerControlCenterData['preferences'];
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <View style={styles.sectionBody}>
      <SectionTitle colors={colors}>Service mode</SectionTitle>
      <View style={styles.chipRow}>
        {(['mobile', 'workshop', 'both'] as const).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => onUpdate({ serviceMode: mode })}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: preferences.serviceMode === mode ? colors.primary + '20' : colors.background }]}>
            <Text style={{ color: colors.text, fontSize: 12, textTransform: 'capitalize' }}>{mode}</Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle colors={colors}>Units</SectionTitle>
      <View style={styles.chipRow}>
        {(['km', 'miles'] as const).map((unit) => (
          <Pressable
            key={unit}
            onPress={() => onUpdate({ distanceUnit: unit })}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: preferences.distanceUnit === unit ? colors.primary + '20' : colors.background }]}>
            <Text style={{ color: colors.text, fontSize: 12 }}>{unit}</Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle colors={colors}>Currency</SectionTitle>
      <View style={styles.chipRow}>
        {(['UGX'] as const).map((currency) => (
          <Pressable
            key={currency}
            onPress={() => onUpdate({ currency })}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: preferences.currency === currency ? colors.primary + '20' : colors.background }]}>
            <Text style={{ color: colors.text, fontSize: 12 }}>{currency}</Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle colors={colors}>Language</SectionTitle>
      <View style={styles.chipRow}>
        {(['en'] as const).map((language) => (
          <Pressable
            key={language}
            onPress={() => onUpdate({ language })}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: preferences.language === language ? colors.primary + '20' : colors.background }]}>
            <Text style={{ color: colors.text, fontSize: 12 }}>English</Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle colors={colors}>Region</SectionTitle>
      <TextInput
        value={preferences.region}
        onChangeText={(region) => onUpdate({ region })}
        placeholder="e.g. Kampala"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
      />
      <SectionTitle colors={colors}>Theme</SectionTitle>
      <View style={styles.chipRow}>
        {(['system', 'light', 'dark'] as const).map((theme) => (
          <Pressable
            key={theme}
            onPress={() => onUpdate({ theme })}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: preferences.theme === theme ? colors.primary + '20' : colors.background }]}>
            <Text style={{ color: colors.text, fontSize: 12, textTransform: 'capitalize' }}>{theme}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Field({
  label,
  colors,
  value,
  editable = true,
  onChange,
  multiline,
}: {
  label: string;
  colors: (typeof Colors)['light'];
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>{label}</Text>
      {editable ? (
        <TextInput
          value={value}
          onChangeText={onChange}
          multiline={multiline}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, minHeight: multiline ? 72 : 44 }]}
        />
      ) : (
        <Text style={{ color: colors.text }}>{value || '—'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  loadingWrap: { paddingVertical: 24, alignItems: 'center' },
  tabRow: { gap: 8, paddingHorizontal: 16 },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabLabel: { fontSize: 12, fontWeight: '700' },
  badge: { backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  panel: { marginHorizontal: 16, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  sectionBody: { padding: 14, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowGap: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnOutline: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  listItem: { borderWidth: 1, borderRadius: 12, padding: 10 },
  itemTitle: { fontWeight: '700', fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  linkLabel: { flex: 1, fontWeight: '700' },
  alertBox: { borderWidth: 1, borderRadius: 12, padding: 10 },
  starRow: { flexDirection: 'row', gap: 4, marginBottom: 8, marginLeft: 8 },
  planCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  planHeader: { padding: 14 },
  messageBox: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 8 },
});
