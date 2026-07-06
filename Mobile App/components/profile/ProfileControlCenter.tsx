import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ProfileSection } from '@/components/profile/ProfileSection';
import {
  ChipSelect,
  EmptyState,
  Field,
  InlineActions,
  ListCard,
  OutlineButton,
  PanelInset,
  PrimaryButton,
  StatusPill,
  SwitchRow,
} from '@/components/profile/profile-control-ui';
import { ProfileLoadingState } from '@/components/profile/ProfileSubpageLayout';
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
import type { BuyerControlCenterData, BuyerVehicle } from '@/types';
import type { ProfileInlineSectionId } from '@/components/profile/profile-sections';

type Props = {
  customerId: string;
  activeTab: ProfileInlineSectionId;
  onRefreshProfile?: () => Promise<void>;
  onMetricsChange?: (metrics: { unreadNotificationCount: number }) => void;
  onRegisterRefresh?: (refresh: () => Promise<void>) => void;
};

export function ProfileControlCenter({
  customerId,
  activeTab,
  onRefreshProfile,
  onMetricsChange,
  onRegisterRefresh,
}: Props) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [data, setData] = useState<BuyerControlCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [password, setPassword] = useState('');
  const [vehicles, setVehicles] = useState<BuyerVehicle[]>([]);
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
      onMetricsChange?.({ unreadNotificationCount: center.unreadNotificationCount });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [customerId, onMetricsChange]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onRegisterRefresh?.(load);
  }, [load, onRegisterRefresh]);

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

  if (loading && !data) return <ProfileLoadingState />;
  if (!data) return null;

  const shared = { colors, data, vehicles, customerId, load, router, saving, setSaving };

  return (
    <View style={styles.wrap}>
      {activeTab === 'account' ? (
        <AccountTab
          {...shared}
          form={form}
          editing={editing}
          password={password}
          onChangeForm={setForm}
          onChangePasswordText={setPassword}
          onEdit={() => setEditing(true)}
          onCancel={() => setEditing(false)}
          onSave={() => void saveProfile()}
          onRefreshProfile={onRefreshProfile}
        />
      ) : null}
      {activeTab === 'notifications' ? <NotificationsTab {...shared} /> : null}
      {activeTab === 'billing' ? <BillingTab {...shared} /> : null}
      {activeTab === 'membership' ? <MembershipTab {...shared} /> : null}
      {activeTab === 'documents' ? (
        <DocumentsTab {...shared} docForm={docForm} onChangeDocForm={setDocForm} />
      ) : null}
      {activeTab === 'services' ? (
        <ServicesTab
          {...shared}
          upcoming={upcoming}
          past={past}
          messageRequestId={messageRequestId}
          messages={messages}
          messageDraft={messageDraft}
          onChangeMessageDraft={setMessageDraft}
          onOpenMessages={async (requestId) => {
            setMessageRequestId(requestId);
            const msgs = await fetchServiceRequestMessages(requestId, customerId);
            setMessages(msgs);
          }}
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
      {activeTab === 'insights' ? <InsightsTab {...shared} /> : null}
      {activeTab === 'settings' ? <SettingsTab {...shared} /> : null}
    </View>
  );
}

type TabBase = {
  colors: (typeof Colors)['light'];
  data: BuyerControlCenterData;
  vehicles: BuyerVehicle[];
  customerId: string;
  load: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
  saving: boolean;
  setSaving: (v: boolean) => void;
};

function AccountTab({
  colors,
  data,
  form,
  editing,
  saving,
  password,
  onChangeForm,
  onChangePasswordText,
  onEdit,
  onCancel,
  onSave,
  customerId,
  load,
  router,
}: TabBase & {
  form: { name: string; phone: string; address: string };
  editing: boolean;
  password: string;
  onChangeForm: (v: typeof form) => void;
  onChangePasswordText: (v: string) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onRefreshProfile?: () => Promise<void>;
}) {
  return (
    <>
      <ProfileSection
        title="Personal details"
        subtitle="Name, phone and delivery address"
        action={!editing ? { label: 'Edit', onPress: onEdit } : undefined}>
        <PanelInset>
          <Field label="Full name" colors={colors} value={form.name} editable={editing} onChange={(name) => onChangeForm({ ...form, name })} />
          <Field label="Phone" colors={colors} value={form.phone} editable={editing} onChange={(phone) => onChangeForm({ ...form, phone })} />
          {data.profile.defaultAddress ? (
            <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Default address</Text>
              <Text style={[styles.infoTitle, { color: colors.text }]}>{data.profile.defaultAddress.label}</Text>
              <Text style={[styles.infoBody, { color: colors.textMuted }]}>{data.profile.defaultAddress.fullAddress}</Text>
            </View>
          ) : null}
          <Field label="Address" colors={colors} value={form.address} editable={editing} multiline onChange={(address) => onChangeForm({ ...form, address })} />
          {editing ? (
            <View style={styles.btnRow}>
              <View style={styles.btnFlex}>
                <PrimaryButton colors={colors} label={saving ? 'Saving…' : 'Save changes'} onPress={onSave} disabled={saving} loading={saving} />
              </View>
              <OutlineButton colors={colors} label="Cancel" onPress={onCancel} />
            </View>
          ) : null}
        </PanelInset>
      </ProfileSection>

      <ProfileSection title="Verification" subtitle="Account trust and status">
        <PanelInset>
          <View style={styles.badgeRow}>
            <StatusPill colors={colors} label={data.account.emailVerified ? 'Email verified' : 'Email unverified'} tone={data.account.emailVerified ? 'success' : 'warning'} />
            <StatusPill colors={colors} label={data.account.phoneVerified ? 'Phone verified' : 'Phone unverified'} tone={data.account.phoneVerified ? 'success' : 'warning'} />
            <StatusPill colors={colors} label={data.account.accountStatus} tone="neutral" />
          </View>
        </PanelInset>
      </ProfileSection>

      <ProfileSection title="Preferred contact" subtitle="How providers should reach you">
        <PanelInset>
          <ChipSelect
            colors={colors}
            options={['email', 'phone', 'both'] as const}
            value={data.account.preferredContactMethod as 'email' | 'phone' | 'both'}
            onChange={(v) => void updateBuyerAccount(customerId, { preferredContactMethod: v }).then(load)}
            labels={{ both: 'Email & phone' }}
          />
        </PanelInset>
      </ProfileSection>

      <ProfileSection title="Security" subtitle="Update your password">
        <PanelInset>
          <Field label="New password" colors={colors} value={password} onChange={onChangePasswordText} secureTextEntry placeholder="At least 8 characters" />
          <PrimaryButton
            colors={colors}
            label="Update password"
            onPress={async () => {
              const supabase = getSupabase();
              if (!supabase || password.length < 8) {
                Alert.alert('Password', 'Use at least 8 characters.');
                return;
              }
              const { error } = await supabase.auth.updateUser({ password });
              Alert.alert('Password', error?.message ?? 'Password updated.');
              if (!error) onChangePasswordText('');
            }}
          />
        </PanelInset>
      </ProfileSection>

      <ProfileSection title="Danger zone" subtitle="Deactivate or permanently delete your account">
        <PanelInset>
          <OutlineButton colors={colors} label="Deactivate account" onPress={() => {
            Alert.alert('Deactivate account', 'You can contact support to reactivate.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Deactivate', style: 'destructive', onPress: () => void updateBuyerAccount(customerId, { accountStatus: 'deactivated' }).then(load) },
            ]);
          }} destructive />
          <OutlineButton colors={colors} label="Delete account permanently" onPress={() => {
            Alert.alert('Delete account', 'This permanently removes your data.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => void deleteBuyerProfile(customerId).then(() => router.replace('/(auth)/login')) },
            ]);
          }} destructive />
        </PanelInset>
      </ProfileSection>
    </>
  );
}

function NotificationsTab({ colors, data, customerId, load }: TabBase) {
  const prefs = data.notificationPreferences;
  return (
    <>
      <ProfileSection
        title="Inbox"
        subtitle={`${data.unreadNotificationCount} unread`}
        action={data.notifications.length > 0 ? { label: 'Mark all read', onPress: () => void markBuyerNotificationsRead(customerId, { markAll: true }).then(load) } : undefined}>
        <PanelInset>
          {data.notifications.length === 0 ? (
            <EmptyState colors={colors} icon="notifications-outline" title="No alerts yet" message="Service updates and reminders will appear here." />
          ) : (
            data.notifications.map((n) => (
              <ListCard
                key={n.id}
                colors={colors}
                title={n.title}
                subtitle={n.body}
                unread={!n.readAt}
                onPress={() => void markBuyerNotificationsRead(customerId, { notificationId: n.id }).then(load)}
              />
            ))
          )}
        </PanelInset>
      </ProfileSection>

      <ProfileSection title="Preferences" subtitle="Choose how we notify you">
        <PanelInset>
          <SwitchRow colors={colors} label="Email" value={prefs.emailEnabled} onValueChange={(v) => void updateBuyerNotificationPreferences(customerId, { emailEnabled: v }).then(load)} />
          <SwitchRow colors={colors} label="SMS" value={prefs.smsEnabled} onValueChange={(v) => void updateBuyerNotificationPreferences(customerId, { smsEnabled: v }).then(load)} />
          <SwitchRow colors={colors} label="In-app" value={prefs.inAppEnabled} onValueChange={(v) => void updateBuyerNotificationPreferences(customerId, { inAppEnabled: v }).then(load)} />
          <SwitchRow colors={colors} label="Service updates" value={prefs.serviceUpdates} onValueChange={(v) => void updateBuyerNotificationPreferences(customerId, { serviceUpdates: v }).then(load)} />
          <SwitchRow colors={colors} label="Maintenance reminders" value={prefs.maintenanceReminders} onValueChange={(v) => void updateBuyerNotificationPreferences(customerId, { maintenanceReminders: v }).then(load)} />
          <SwitchRow colors={colors} label="Marketing" value={prefs.marketing} onValueChange={(v) => void updateBuyerNotificationPreferences(customerId, { marketing: v }).then(load)} />
        </PanelInset>
      </ProfileSection>
    </>
  );
}

function BillingTab({ colors, data }: TabBase) {
  return (
    <>
      <ProfileSection title="Payment summary" subtitle="Outstanding balances">
        <PanelInset>
          <View style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Outstanding</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {data.pendingPaymentTotal > 0 ? formatCurrency(data.pendingPaymentTotal) : 'All clear'}
            </Text>
          </View>
        </PanelInset>
      </ProfileSection>

      <ProfileSection title="Payment history" subtitle="Recent transactions">
        <PanelInset>
          {data.payments.length === 0 ? (
            <EmptyState colors={colors} icon="card-outline" title="No payments yet" message="Your billing history will show here after your first purchase or subscription." />
          ) : (
            data.payments.map((p) => (
              <ListCard key={p.id} colors={colors} title={p.label} meta={`${formatCurrency(p.amount)} · ${p.status}`} />
            ))
          )}
        </PanelInset>
      </ProfileSection>
    </>
  );
}

function MembershipTab({ colors, customerId, data, load }: TabBase) {
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
  const subscription = data.subscription;
  const subscriptionHistory = data.subscriptionHistory;
  const activeTier = subscription?.status === 'active' ? subscription.planTier : null;

  const subscribe = async (tier: SubscriptionTier) => {
    setLoadingTier(tier);
    try {
      const result = await subscribeBuyerPlan({ customerId, planTier: tier, customerPhone: data.profile.customer.phone });
      if (result.checkoutUrl) await Linking.openURL(result.checkoutUrl);
      else {
        await load();
        Alert.alert('Subscribed', `You are now on the ${tier} plan.`);
      }
    } catch (e) {
      Alert.alert('Subscription', e instanceof Error ? e.message : 'Could not subscribe');
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <>
      {subscription?.status === 'active' ? (
        <ProfileSection title="Current plan" subtitle="Your active membership">
          <PanelInset>
            <ListCard
              colors={colors}
              title={`${subscription.planTier} plan`}
              subtitle="Active membership"
              meta={subscription.cancelledAt ? `Cancels ${new Date(subscription.cancelledAt).toLocaleDateString()}` : undefined}>
              <OutlineButton
                colors={colors}
                label="Cancel membership"
                destructive
                onPress={() => {
                  Alert.alert('Cancel membership?', 'Benefits remain until the end of your billing period.', [
                    { text: 'Keep', style: 'cancel' },
                    { text: 'Cancel', style: 'destructive', onPress: () => void cancelBuyerSubscription(customerId).then(load) },
                  ]);
                }}
              />
            </ListCard>
          </PanelInset>
        </ProfileSection>
      ) : null}

      <ProfileSection title="Choose a plan" subtitle="Unlock garage and service benefits">
        <PanelInset>
          {SUBSCRIPTION_PLANS.map((plan) => {
            const tierStyle = TIER_COLORS[plan.tier];
            const isActive = activeTier === plan.tier;
            return (
              <View key={plan.tier} style={[styles.planCard, { borderColor: tierStyle.border }]}>
                <View style={[styles.planHeader, { backgroundColor: tierStyle.bg }]}>
                  <Text style={[styles.planName, { color: tierStyle.text }]}>{plan.name}</Text>
                  <Text style={[styles.planTagline, { color: tierStyle.text }]}>{plan.tagline}</Text>
                  <Text style={[styles.planPrice, { color: tierStyle.text }]}>
                    {formatPlanPrice(plan)}{plan.monthlyPrice > 0 ? '/mo' : ''}
                  </Text>
                </View>
                <View style={styles.planBody}>
                  {plan.features.map((f) => (
                    <View key={f} style={styles.planFeatureRow}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                      <Text style={[styles.planFeature, { color: colors.textMuted }]}>{f}</Text>
                    </View>
                  ))}
                  <PrimaryButton
                    colors={colors}
                    label={loadingTier === plan.tier ? 'Please wait…' : isActive ? 'Current plan' : `Subscribe to ${plan.name}`}
                    onPress={() => void subscribe(plan.tier)}
                    disabled={isActive || loadingTier !== null}
                    loading={loadingTier === plan.tier}
                  />
                </View>
              </View>
            );
          })}
        </PanelInset>
      </ProfileSection>

      {subscriptionHistory && subscriptionHistory.length > 0 ? (
        <ProfileSection title="Subscription history" subtitle="Past and cancelled plans">
          <PanelInset>
            {subscriptionHistory.map((sub) => (
              <ListCard
                key={sub.id}
                colors={colors}
                title={`${sub.planTier} plan`}
                meta={`${sub.status} · ${new Date(sub.startedAt ?? sub.createdAt).toLocaleDateString()}${sub.cancelledAt ? ` – ${new Date(sub.cancelledAt).toLocaleDateString()}` : ''}`}
              />
            ))}
          </PanelInset>
        </ProfileSection>
      ) : null}
    </>
  );
}

function DocumentsTab({
  colors,
  data,
  vehicles,
  docForm,
  onChangeDocForm,
  customerId,
  load,
  setSaving,
}: TabBase & {
  docForm: { vehicleId: string; name: string; fileUrl: string; expiresAt: string; documentType: string };
  onChangeDocForm: (v: typeof docForm) => void;
}) {
  return (
    <>
      {data.documentAlerts.length > 0 ? (
        <View style={[styles.alertBanner, { backgroundColor: '#F59E0B14', borderColor: '#F59E0B55' }]}>
          <Ionicons name="warning-outline" size={18} color="#D97706" />
          <Text style={styles.alertBannerText}>{data.documentAlerts.length} document(s) need attention</Text>
        </View>
      ) : null}

      <ProfileSection title="Add document" subtitle="Insurance, logbook, inspection and more">
        <PanelInset>
          <Text style={[styles.fieldGroupLabel, { color: colors.textMuted }]}>Document type</Text>
          <ChipSelect
            colors={colors}
            options={['logbook', 'insurance', 'inspection', 'registration', 'warranty', 'other'] as const}
            value={docForm.documentType as 'logbook' | 'insurance' | 'inspection' | 'registration' | 'warranty' | 'other'}
            onChange={(documentType) => onChangeDocForm({ ...docForm, documentType })}
          />
          <Field label="Document name" colors={colors} value={docForm.name} onChange={(name) => onChangeDocForm({ ...docForm, name })} />
          <Field label="File URL" colors={colors} value={docForm.fileUrl} onChange={(fileUrl) => onChangeDocForm({ ...docForm, fileUrl })} placeholder="https://..." />
          <Field label="Expiry date" colors={colors} value={docForm.expiresAt} onChange={(expiresAt) => onChangeDocForm({ ...docForm, expiresAt })} placeholder="YYYY-MM-DD" />
          {vehicles.length > 0 ? (
            <>
              <Text style={[styles.fieldGroupLabel, { color: colors.textMuted }]}>Vehicle</Text>
              <ChipSelect
                colors={colors}
                options={vehicles.map((v) => v.id)}
                value={docForm.vehicleId}
                onChange={(vehicleId) => onChangeDocForm({ ...docForm, vehicleId })}
                labels={Object.fromEntries(vehicles.map((v) => [v.id, v.nickname || `${v.make} ${v.model}`]))}
              />
            </>
          ) : null}
          <PrimaryButton
            colors={colors}
            label="Save document"
            onPress={() => {
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
                  onChangeDocForm({ vehicleId: '', name: '', fileUrl: '', expiresAt: '', documentType: 'insurance' });
                  return load();
                })
                .finally(() => setSaving(false));
            }}
          />
        </PanelInset>
      </ProfileSection>

      <ProfileSection title="Your documents" subtitle={`${data.documents.length} on file`}>
        <PanelInset>
          {data.documents.length === 0 ? (
            <EmptyState colors={colors} icon="document-text-outline" title="No documents yet" message="Upload insurance, logbook, or inspection records for your vehicles." />
          ) : (
            data.documents.map((doc) => (
              <ListCard key={doc.id} colors={colors} title={doc.name} subtitle={doc.documentType} meta={doc.expiresAt ? `Expires ${doc.expiresAt}` : undefined}>
                <OutlineButton
                  colors={colors}
                  label="Remove"
                  destructive
                  onPress={() => {
                    Alert.alert('Remove document?', undefined, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => void deleteBuyerVehicleDocument(doc.id, customerId).then(load) },
                    ]);
                  }}
                />
              </ListCard>
            ))
          )}
        </PanelInset>
      </ProfileSection>
    </>
  );
}

function ServicesTab({
  colors,
  upcoming,
  past,
  data,
  customerId,
  load,
  router,
  messageRequestId,
  messages,
  messageDraft,
  onChangeMessageDraft,
  onOpenMessages,
  onSendMessage,
}: TabBase & {
  upcoming: BuyerControlCenterData['serviceRequests'];
  past: BuyerControlCenterData['serviceRequests'];
  messageRequestId: string | null;
  messages: Array<{ id: string; senderType: string; message: string }>;
  messageDraft: string;
  onChangeMessageDraft: (v: string) => void;
  onOpenMessages: (id: string) => void;
  onSendMessage: () => void;
}) {
  return (
    <>
      <ProfileSection title="Book a service" subtitle="Find providers near you">
        <PanelInset>
          <PrimaryButton colors={colors} label="Request new service" onPress={() => router.push('/(tabs)/services')} />
        </PanelInset>
      </ProfileSection>

      <ProfileSection title="Active requests" subtitle={`${upcoming.length} in progress`}>
        <PanelInset>
          {upcoming.length === 0 ? (
            <EmptyState colors={colors} icon="construct-outline" title="No active requests" message="When you book a service, you can track it here." actionLabel="Browse services" onAction={() => router.push('/(tabs)/services')} />
          ) : (
            upcoming.map((item) => (
              <ListCard key={item.id} colors={colors} title={item.service} meta={item.status}>
                <InlineActions colors={colors} actions={[
                  { label: 'Track', onPress: () => router.push(`/service/track/${item.id}`) },
                  { label: 'Message', onPress: () => void onOpenMessages(item.id) },
                ]} />
              </ListCard>
            ))
          )}
        </PanelInset>
      </ProfileSection>

      <ProfileSection title="Past services" subtitle="Completed and cancelled">
        <PanelInset>
          {past.length === 0 ? (
            <EmptyState colors={colors} icon="time-outline" title="No service history" message="Completed jobs will appear here for easy reference." />
          ) : (
            past.map((item) => (
              <View key={item.id} style={styles.gapSm}>
                <ListCard colors={colors} title={item.service} meta={item.status}>
                  <InlineActions colors={colors} actions={[
                    { label: 'Track', onPress: () => router.push(`/service/track/${item.id}`) },
                    { label: 'Message', onPress: () => void onOpenMessages(item.id) },
                  ]} />
                </ListCard>
                {item.providerId && item.status === 'completed' ? (
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable key={star} onPress={() => void submitProviderRating(customerId, item.providerId!, star).then(load)}>
                        <Ionicons
                          name={(data.ratings.find((r) => r.providerId === item.providerId)?.stars ?? 0) >= star ? 'star' : 'star-outline'}
                          size={20}
                          color="#f59e0b"
                        />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ))
          )}
        </PanelInset>
      </ProfileSection>

      {data.recommendations.length > 0 ? (
        <ProfileSection title="Provider recommendations" subtitle="Suggested maintenance">
          <PanelInset>
            {data.recommendations.map((rec) => (
              <ListCard key={rec.id} colors={colors} title={rec.title} subtitle={rec.description}>
                {rec.status === 'pending' ? (
                  <InlineActions colors={colors} actions={[
                    { label: 'Approve', onPress: () => void updateServiceRecommendation(rec.id, customerId, 'approved').then(load) },
                    { label: 'Reject', onPress: () => void updateServiceRecommendation(rec.id, customerId, 'rejected').then(load), destructive: true },
                  ]} />
                ) : null}
              </ListCard>
            ))}
          </PanelInset>
        </ProfileSection>
      ) : null}

      {messageRequestId ? (
        <ProfileSection title="Messages" subtitle="Chat with your provider">
          <PanelInset>
            <View style={[styles.messageBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              {messages.map((m) => (
                <Text key={m.id} style={[styles.messageLine, { color: colors.text }]}>
                  <Text style={{ fontWeight: '800' }}>{m.senderType}: </Text>
                  {m.message}
                </Text>
              ))}
              <TextInput
                value={messageDraft}
                onChangeText={onChangeMessageDraft}
                placeholder="Message provider…"
                placeholderTextColor={colors.textMuted}
                style={[styles.messageInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
              />
              <PrimaryButton colors={colors} label="Send message" onPress={onSendMessage} />
            </View>
          </PanelInset>
        </ProfileSection>
      ) : null}
    </>
  );
}

function InsightsTab({ colors, data }: TabBase) {
  const maxSpend = Math.max(...data.analytics.monthlySpend.map((m) => m.amount), 1);
  return (
    <>
      <ProfileSection title="Overview" subtitle="Your garage at a glance">
        <PanelInset>
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Maintenance</Text>
              <Text style={[styles.statBoxValue, { color: colors.text }]}>{formatCurrency(data.analytics.totalMaintenanceCost)}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Services</Text>
              <Text style={[styles.statBoxValue, { color: colors.text }]}>{data.analytics.totalServices}</Text>
            </View>
          </View>
        </PanelInset>
      </ProfileSection>

      {data.analytics.monthlySpend.length > 0 ? (
        <ProfileSection title="Monthly spend" subtitle="Service costs over time">
          <PanelInset>
            {data.analytics.monthlySpend.map((row) => (
              <View key={row.month} style={styles.chartRow}>
                <View style={styles.chartHeader}>
                  <Text style={[styles.chartMonth, { color: colors.text }]}>{row.month}</Text>
                  <Text style={[styles.chartAmount, { color: colors.text }]}>{formatCurrency(row.amount)}</Text>
                </View>
                <View style={[styles.chartTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.chartFill, { width: `${Math.max(8, (row.amount / maxSpend) * 100)}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            ))}
          </PanelInset>
        </ProfileSection>
      ) : null}

      <ProfileSection title="Vehicle health" subtitle="Per-vehicle insights">
        <PanelInset>
          {data.analytics.vehicles.length === 0 ? (
            <EmptyState colors={colors} icon="analytics-outline" title="No vehicle data" message="Add vehicles and complete services to see health insights." />
          ) : (
            data.analytics.vehicles.map((v) => (
              <ListCard
                key={v.vehicleId}
                colors={colors}
                title={v.vehicleLabel}
                subtitle={v.commonIssues.length > 0 ? `Common: ${v.commonIssues.join(', ')}` : undefined}
                meta={`${v.healthStatus} · ${v.serviceCount} services · ${formatCurrency(v.totalMaintenanceCost)}`}
              />
            ))
          )}
        </PanelInset>
      </ProfileSection>
    </>
  );
}

function SettingsTab({ colors, data, customerId, load }: TabBase) {
  const prefs = data.preferences;
  const update = (patch: Record<string, unknown>) => void updateBuyerAppPreferences(customerId, patch).then(load);

  return (
    <>
      <ProfileSection title="Service mode" subtitle="How you prefer to get help">
        <PanelInset>
          <ChipSelect colors={colors} options={['mobile', 'workshop', 'both'] as const} value={prefs.serviceMode} onChange={(v) => update({ serviceMode: v })} labels={{ both: 'Mobile & workshop' }} />
        </PanelInset>
      </ProfileSection>

      <ProfileSection title="Units & currency" subtitle="Localization preferences">
        <PanelInset>
          <Text style={[styles.fieldGroupLabel, { color: colors.textMuted }]}>Distance</Text>
          <ChipSelect colors={colors} options={['km', 'miles'] as const} value={prefs.distanceUnit} onChange={(v) => update({ distanceUnit: v })} />
          <Text style={[styles.fieldGroupLabel, { color: colors.textMuted }]}>Currency</Text>
          <ChipSelect colors={colors} options={['UGX'] as const} value={prefs.currency} onChange={(v) => update({ currency: v })} />
        </PanelInset>
      </ProfileSection>

      <ProfileSection title="Language & region" subtitle="App language and location">
        <PanelInset>
          <ChipSelect colors={colors} options={['en'] as const} value={prefs.language} onChange={(v) => update({ language: v })} labels={{ en: 'English' }} />
          <Field label="Region" colors={colors} value={prefs.region} onChange={(region) => update({ region })} placeholder="e.g. Kampala" />
        </PanelInset>
      </ProfileSection>

      <ProfileSection title="Appearance" subtitle="Theme preference">
        <PanelInset>
          <ChipSelect colors={colors} options={['system', 'light', 'dark'] as const} value={prefs.theme} onChange={(v) => update({ theme: v })} />
        </PanelInset>
      </ProfileSection>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 20 },
  panelInset: { padding: 16, gap: 12 },
  btnRow: { gap: 10, marginTop: 4 },
  btnFlex: { flex: 1 },
  infoCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  infoLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoTitle: { fontSize: 15, fontWeight: '800' },
  infoBody: { fontSize: 13, lineHeight: 18 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  summaryLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  planCard: { borderWidth: 1, borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  planHeader: { padding: 16, gap: 4 },
  planName: { fontSize: 18, fontWeight: '800' },
  planTagline: { fontSize: 13, opacity: 0.9 },
  planPrice: { fontSize: 24, fontWeight: '800', marginTop: 6 },
  planBody: { padding: 16, gap: 10 },
  planFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planFeature: { fontSize: 13, flex: 1 },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  alertBannerText: { color: '#B45309', fontWeight: '700', fontSize: 13, flex: 1 },
  fieldGroupLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: -4 },
  gapSm: { gap: 8 },
  starRow: { flexDirection: 'row', gap: 6, paddingLeft: 8, paddingBottom: 8 },
  messageBox: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  messageLine: { fontSize: 13, lineHeight: 19 },
  messageInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  statBoxLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statBoxValue: { fontSize: 18, fontWeight: '800' },
  chartRow: { gap: 6, marginBottom: 10 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartMonth: { fontSize: 13, fontWeight: '600' },
  chartAmount: { fontSize: 13, fontWeight: '800' },
  chartTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  chartFill: { height: '100%', borderRadius: 4 },
});
