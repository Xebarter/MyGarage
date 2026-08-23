import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../models/buyer_control_center.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/app_brand_logo.dart';
import 'profile_screen.dart' show launchExternalUrl;

/// Deep-linkable control-center sections for mobile (web parity).
class ProfileSectionScreen extends StatefulWidget {
  const ProfileSectionScreen({super.key, required this.section});

  final String section;

  @override
  State<ProfileSectionScreen> createState() => _ProfileSectionScreenState();
}

class _ProfileSectionScreenState extends State<ProfileSectionScreen> {
  final _api = BuyerApi(ApiClient());
  BuyerControlCenter? _cc;
  bool _loading = true;
  String? _error;
  bool _saving = false;

  String get _title {
    switch (widget.section) {
      case 'account':
        return 'Account';
      case 'notifications':
        return 'Alerts';
      case 'billing':
        return 'Billing';
      case 'membership':
        return 'Membership';
      case 'documents':
        return 'Documents';
      case 'services':
        return 'Services activity';
      case 'insights':
        return 'Insights';
      case 'settings':
        return 'Settings';
      default:
        return 'Profile';
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final id = context.read<AuthController>().customerId;
    if (id == null) {
      setState(() {
        _loading = false;
        _error = 'Sign in required.';
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final cc = await _api.fetchControlCenter(customerId: id);
      if (!mounted) return;
      setState(() {
        _cc = cc;
        _loading = false;
      });
      await context.read<AuthController>().updateLocalProfile(cc.profile);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = userFacingError(e, fallback: 'Could not load.');
      });
    }
  }

  Future<void> _withSave(Future<void> Function() action) async {
    setState(() => _saving = true);
    try {
      await action();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Saved')),
        );
      }
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(userFacingError(e, fallback: 'Save failed.'))),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: AppBarTitle(_title),
        actions: [
          if (_saving)
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        OutlinedButton(onPressed: _load, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : _buildSection(),
    );
  }

  Widget _buildSection() {
    final cc = _cc!;
    switch (widget.section) {
      case 'account':
        return _AccountSection(cc: cc, onSave: _withSave, onReload: _load);
      case 'notifications':
        return _NotificationsSection(cc: cc, api: _api, onReload: _load, onSave: _withSave);
      case 'billing':
        return _BillingSection(cc: cc);
      case 'membership':
        return _MembershipSection(cc: cc, api: _api, onReload: _load, onSave: _withSave);
      case 'documents':
        return _DocumentsSection(cc: cc, api: _api, onReload: _load);
      case 'services':
        return _ServicesSection(cc: cc, api: _api, onReload: _load, onSave: _withSave);
      case 'insights':
        return _InsightsSection(cc: cc);
      case 'settings':
        return _SettingsSection(cc: cc, onSave: _withSave);
      default:
        return const Center(child: Text('Unknown section'));
    }
  }
}

class _AccountSection extends StatefulWidget {
  const _AccountSection({
    required this.cc,
    required this.onSave,
    required this.onReload,
  });

  final BuyerControlCenter cc;
  final Future<void> Function(Future<void> Function()) onSave;
  final Future<void> Function() onReload;

  @override
  State<_AccountSection> createState() => _AccountSectionState();
}

class _AccountSectionState extends State<_AccountSection> {
  late final _name = TextEditingController(text: widget.cc.profile.name);
  late final _phone = TextEditingController(text: widget.cc.profile.phone);
  late final _address = TextEditingController(text: widget.cc.profile.address);
  late String _contact = widget.cc.account.preferredContactMethod;
  final _newPassword = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    _newPassword.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthController>();
    final p = widget.cc.profile;
    final a = widget.cc.account;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        _sectionLabel('Contact'),
        TextField(
          controller: _name,
          decoration: const InputDecoration(labelText: 'Full name'),
        ),
        const SizedBox(height: 10),
        TextField(
          enabled: false,
          decoration: InputDecoration(
            labelText: 'Email',
            hintText: p.email,
            helperText: 'Email is managed by your sign-in account',
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Phone'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _address,
          maxLines: 2,
          decoration: const InputDecoration(labelText: 'Address'),
        ),
        if (p.defaultAddress != null && p.defaultAddress!.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            'Default delivery: ${p.defaultAddress}',
            style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted),
          ),
        ],
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: _contact,
          decoration: const InputDecoration(labelText: 'Preferred contact'),
          items: const [
            DropdownMenuItem(value: 'email', child: Text('Email')),
            DropdownMenuItem(value: 'phone', child: Text('Phone')),
            DropdownMenuItem(value: 'both', child: Text('Both')),
          ],
          onChanged: (v) => setState(() => _contact = v ?? 'email'),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            _chip(a.emailVerified ? 'Email verified' : 'Email unverified', a.emailVerified),
            _chip(a.phoneVerified ? 'Phone verified' : 'Phone unverified', a.phoneVerified),
            _chip(a.accountStatus, a.accountStatus == 'active'),
          ],
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: () => widget.onSave(() async {
            await auth.updateProfileFields(
              name: _name.text,
              phone: _phone.text,
              address: _address.text,
            );
            final id = auth.customerId!;
            await BuyerApi(ApiClient()).patchAccount(
              customerId: id,
              preferredContactMethod: _contact,
            );
          }),
          child: const Text('Save account'),
        ),
        const SizedBox(height: 28),
        _sectionLabel('Security'),
        TextField(
          controller: _newPassword,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'New password'),
        ),
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: () => widget.onSave(() async {
            final pw = _newPassword.text.trim();
            if (pw.length < 6) throw Exception('Password must be at least 6 characters');
            await auth.changePassword(pw);
            _newPassword.clear();
          }),
          child: const Text('Update password'),
        ),
        const SizedBox(height: 28),
        _sectionLabel('Danger zone'),
        OutlinedButton(
          onPressed: () async {
            final yes = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                title: const Text('Deactivate account?'),
                content: const Text('You can contact support to reactivate later.'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                  TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Deactivate')),
                ],
              ),
            );
            if (yes != true) return;
            await widget.onSave(() async {
              await BuyerApi(ApiClient()).patchAccount(
                customerId: auth.customerId!,
                accountStatus: 'deactivated',
              );
              await auth.signOut();
              if (context.mounted) context.go('/profile');
            });
          },
          child: const Text('Deactivate account'),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () async {
            final yes = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                title: const Text('Delete account permanently?'),
                content: const Text('This cannot be undone.'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                  TextButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: Text('Delete', style: AppTheme.host(color: AppColors.danger)),
                  ),
                ],
              ),
            );
            if (yes != true) return;
            try {
              await auth.deleteAccount();
              if (context.mounted) context.go('/profile');
            } catch (e) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(userFacingError(e, fallback: 'Delete failed'))),
                );
              }
            }
          },
          child: Text(
            'Delete account',
            style: AppTheme.host(color: AppColors.danger, fontWeight: FontWeight.w600),
          ),
        ),
        TextButton(
          onPressed: () => context.push('/garage'),
          child: const Text('Open My Vehicles'),
        ),
      ],
    );
  }

  Widget _chip(String label, bool ok) {
    return Chip(
      label: Text(label, style: AppTheme.host(fontSize: 11.5)),
      backgroundColor: ok ? AppColors.successSoft : AppColors.surfaceMuted,
      side: BorderSide.none,
      visualDensity: VisualDensity.compact,
    );
  }
}

class _NotificationsSection extends StatelessWidget {
  const _NotificationsSection({
    required this.cc,
    required this.api,
    required this.onReload,
    required this.onSave,
  });

  final BuyerControlCenter cc;
  final BuyerApi api;
  final Future<void> Function() onReload;
  final Future<void> Function(Future<void> Function()) onSave;

  @override
  Widget build(BuildContext context) {
    final id = context.read<AuthController>().customerId!;
    final prefs = cc.notificationPreferences;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        if (cc.notifications.isNotEmpty)
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () => onSave(() => api.markNotifications(customerId: id, markAll: true)),
              child: const Text('Mark all read'),
            ),
          ),
        ...cc.notifications.map(
          (n) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            color: n.isRead ? AppColors.surface : AppColors.primarySoft.withValues(alpha: 0.35),
            child: ListTile(
              title: Text(n.title, style: AppTheme.host(fontWeight: FontWeight.w600)),
              subtitle: Text(n.body, maxLines: 3, overflow: TextOverflow.ellipsis),
              onTap: n.isRead
                  ? null
                  : () => onSave(
                        () => api.markNotifications(customerId: id, notificationId: n.id),
                      ),
            ),
          ),
        ),
        if (cc.notifications.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text(
              'No notifications yet',
              style: AppTheme.host(color: AppColors.textMuted),
              textAlign: TextAlign.center,
            ),
          ),
        const SizedBox(height: 12),
        _sectionLabel('Preferences'),
        _toggle(
          'Email',
          prefs.emailEnabled,
          (v) => onSave(
            () => api.patchNotificationPreferences(
              customerId: id,
              prefs: prefs.copyWith(emailEnabled: v).toJson(),
            ),
          ),
        ),
        _toggle(
          'SMS',
          prefs.smsEnabled,
          (v) => onSave(
            () => api.patchNotificationPreferences(
              customerId: id,
              prefs: prefs.copyWith(smsEnabled: v).toJson(),
            ),
          ),
        ),
        _toggle(
          'In-app',
          prefs.inAppEnabled,
          (v) => onSave(
            () => api.patchNotificationPreferences(
              customerId: id,
              prefs: prefs.copyWith(inAppEnabled: v).toJson(),
            ),
          ),
        ),
        _toggle(
          'Service updates',
          prefs.serviceUpdates,
          (v) => onSave(
            () => api.patchNotificationPreferences(
              customerId: id,
              prefs: prefs.copyWith(serviceUpdates: v).toJson(),
            ),
          ),
        ),
        _toggle(
          'Maintenance reminders',
          prefs.maintenanceReminders,
          (v) => onSave(
            () => api.patchNotificationPreferences(
              customerId: id,
              prefs: prefs.copyWith(maintenanceReminders: v).toJson(),
            ),
          ),
        ),
        _toggle(
          'Marketing',
          prefs.marketing,
          (v) => onSave(
            () => api.patchNotificationPreferences(
              customerId: id,
              prefs: prefs.copyWith(marketing: v).toJson(),
            ),
          ),
        ),
      ],
    );
  }

  Widget _toggle(String label, bool value, ValueChanged<bool> onChanged) {
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label, style: AppTheme.host(fontWeight: FontWeight.w600)),
      value: value,
      onChanged: onChanged,
    );
  }
}

class _BillingSection extends StatelessWidget {
  const _BillingSection({required this.cc});

  final BuyerControlCenter cc;

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.primarySoft,
            borderRadius: BorderRadius.circular(AppRadii.md),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Pending payments', style: AppTheme.host(fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text(
                money.format(cc.pendingPaymentTotal),
                style: AppTheme.host(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.primaryDeep),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _sectionLabel('History'),
        if (cc.payments.isEmpty)
          Text('No payments yet', style: AppTheme.host(color: AppColors.textMuted))
        else
          ...cc.payments.map(
            (p) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(p.label.isEmpty ? p.source : p.label),
              subtitle: Text('${p.status} · ${p.createdAt}'),
              trailing: Text(
                money.format(p.amount),
                style: AppTheme.host(fontWeight: FontWeight.w700),
              ),
            ),
          ),
      ],
    );
  }
}

class _MembershipSection extends StatelessWidget {
  const _MembershipSection({
    required this.cc,
    required this.api,
    required this.onReload,
    required this.onSave,
  });

  final BuyerControlCenter cc;
  final BuyerApi api;
  final Future<void> Function() onReload;
  final Future<void> Function(Future<void> Function()) onSave;

  @override
  Widget build(BuildContext context) {
    final id = context.read<AuthController>().customerId!;
    final active = cc.subscription;
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        if (active != null)
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadii.md),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
              color: AppColors.primarySoft,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Current: ${active.planTier.toUpperCase()} · ${active.status}',
                  style: AppTheme.host(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => onSave(() => api.cancelSubscription(customerId: id)),
                  child: const Text('Cancel membership'),
                ),
              ],
            ),
          ),
        ...kSubscriptionPlans.map((plan) {
          final isCurrent = active?.planTier.toLowerCase() == plan.tier;
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadii.md),
              side: BorderSide(
                color: plan.highlight || isCurrent ? AppColors.primary : AppColors.border,
                width: plan.highlight || isCurrent ? 1.5 : 1,
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(plan.name, style: AppTheme.host(fontSize: 17, fontWeight: FontWeight.w700)),
                      if (plan.badge != null) ...[
                        const SizedBox(width: 8),
                        Chip(
                          label: Text(plan.badge!, style: AppTheme.host(fontSize: 11)),
                          visualDensity: VisualDensity.compact,
                          backgroundColor: AppColors.primarySoft,
                          side: BorderSide.none,
                        ),
                      ],
                      const Spacer(),
                      Text(
                        plan.monthlyPrice == 0 ? 'Free' : money.format(plan.monthlyPrice),
                        style: AppTheme.host(fontWeight: FontWeight.w700, color: AppColors.primary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(plan.tagline, style: AppTheme.host(fontSize: 13, color: AppColors.textMuted)),
                  const SizedBox(height: 8),
                  ...plan.features.map(
                    (f) => Padding(
                      padding: const EdgeInsets.only(bottom: 3),
                      child: Row(
                        children: [
                          const Icon(Icons.check, size: 14, color: AppColors.success),
                          const SizedBox(width: 6),
                          Expanded(child: Text(f, style: AppTheme.host(fontSize: 12.5))),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  FilledButton(
                    onPressed: isCurrent
                        ? null
                        : () => onSave(() async {
                              final res = await api.createSubscription(
                                customerId: id,
                                planTier: plan.tier,
                              );
                              final url = res['checkoutUrl']?.toString();
                              if (url != null && url.isNotEmpty) {
                                await launchExternalUrl(url);
                              }
                            }),
                    child: Text(isCurrent ? 'Current plan' : 'Choose ${plan.name}'),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }
}

class _DocumentsSection extends StatelessWidget {
  const _DocumentsSection({
    required this.cc,
    required this.api,
    required this.onReload,
  });

  final BuyerControlCenter cc;
  final BuyerApi api;
  final Future<void> Function() onReload;

  @override
  Widget build(BuildContext context) {
    final id = context.read<AuthController>().customerId!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        if (cc.documentAlerts.isNotEmpty) ...[
          ...cc.documentAlerts.map(
            (a) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: a.status == 'expired' ? AppColors.dangerSoft : AppColors.warningSoft,
                borderRadius: BorderRadius.circular(AppRadii.sm),
              ),
              child: Text(
                '${a.name} · ${a.status}${a.expiresAt != null ? ' · ${a.expiresAt}' : ''}',
                style: AppTheme.host(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
        Text(
          'Upload new documents from Garage vehicle details on web, or manage files below.',
          style: AppTheme.host(fontSize: 13, color: AppColors.textMuted),
        ),
        const SizedBox(height: 12),
        if (cc.documents.isEmpty)
          Text('No documents stored', style: AppTheme.host(color: AppColors.textMuted))
        else
          ...cc.documents.map(
            (d) => Card(
              child: ListTile(
                title: Text(d.name, style: AppTheme.host(fontWeight: FontWeight.w600)),
                subtitle: Text('${d.documentType}${d.expiresAt != null ? ' · expires ${d.expiresAt}' : ''}'),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                  onPressed: () async {
                    await api.deleteVehicleDocument(id: d.id, customerId: id);
                    await onReload();
                  },
                ),
                onTap: d.fileUrl.isEmpty
                    ? null
                    : () => launchExternalUrl(d.fileUrl),
              ),
            ),
          ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: () => context.push('/garage'),
          child: const Text('Open garage for vehicle docs'),
        ),
      ],
    );
  }
}

class _ServicesSection extends StatelessWidget {
  const _ServicesSection({
    required this.cc,
    required this.api,
    required this.onReload,
    required this.onSave,
  });

  final BuyerControlCenter cc;
  final BuyerApi api;
  final Future<void> Function() onReload;
  final Future<void> Function(Future<void> Function()) onSave;

  @override
  Widget build(BuildContext context) {
    final id = context.read<AuthController>().customerId!;
    final pendingRecs = cc.recommendations.where((r) => r.status == 'pending');

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        if (pendingRecs.isNotEmpty) ...[
          _sectionLabel('Provider recommendations'),
          ...pendingRecs.map(
            (r) => Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(r.title, style: AppTheme.host(fontWeight: FontWeight.w700)),
                    if (r.description.isNotEmpty)
                      Text(r.description, style: AppTheme.host(fontSize: 13, color: AppColors.textMuted)),
                    Row(
                      children: [
                        TextButton(
                          onPressed: () => onSave(
                            () => api.respondRecommendation(
                              id: r.id,
                              status: 'approved',
                              customerId: id,
                            ),
                          ),
                          child: const Text('Approve'),
                        ),
                        TextButton(
                          onPressed: () => onSave(
                            () => api.respondRecommendation(
                              id: r.id,
                              status: 'rejected',
                              customerId: id,
                            ),
                          ),
                          child: const Text('Reject'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
        _sectionLabel('Service requests'),
        if (cc.serviceRequests.isEmpty)
          Text('No service requests yet', style: AppTheme.host(color: AppColors.textMuted))
        else
          ...cc.serviceRequests.map((r) {
            final completed = r.status == 'completed';
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(r.service.isEmpty ? 'Service' : r.service),
                subtitle: Text('${r.status}${r.location != null ? ' · ${r.location}' : ''}'),
                trailing: completed && r.providerId != null
                    ? IconButton(
                        icon: const Icon(Icons.star_outline),
                        onPressed: () async {
                          final stars = await showDialog<int>(
                            context: context,
                            builder: (ctx) => SimpleDialog(
                              title: const Text('Rate provider'),
                              children: List.generate(
                                5,
                                (i) => SimpleDialogOption(
                                  onPressed: () => Navigator.pop(ctx, i + 1),
                                  child: Text('${i + 1} star${i == 0 ? '' : 's'}'),
                                ),
                              ),
                            ),
                          );
                          if (stars == null) return;
                          await onSave(
                            () => api.rateProvider(
                              customerId: id,
                              providerId: r.providerId!,
                              stars: stars,
                            ),
                          );
                        },
                      )
                    : const Icon(Icons.chevron_right),
                onTap: () => context.push('/service/track/${r.id}'),
              ),
            );
          }),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () => context.go('/services'),
          child: const Text('Request a service'),
        ),
      ],
    );
  }
}

class _InsightsSection extends StatelessWidget {
  const _InsightsSection({required this.cc});

  final BuyerControlCenter cc;

  @override
  Widget build(BuildContext context) {
    final a = cc.analytics;
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        Row(
          children: [
            Expanded(child: _metric('Services', '${a.totalServices}')),
            const SizedBox(width: 8),
            Expanded(child: _metric('Maintenance', money.format(a.totalMaintenanceCost))),
          ],
        ),
        const SizedBox(height: 16),
        _sectionLabel('Vehicle health'),
        if (a.vehicles.isEmpty)
          Text('No vehicle insights yet', style: AppTheme.host(color: AppColors.textMuted))
        else
          ...a.vehicles.map(
            (v) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(v.vehicleLabel),
              subtitle: Text(
                '${v.healthStatus} · ${v.serviceCount} services · ${money.format(v.totalMaintenanceCost)}',
              ),
            ),
          ),
        const SizedBox(height: 12),
        _sectionLabel('Monthly spend'),
        if (a.monthlySpend.isEmpty)
          Text('No spend data yet', style: AppTheme.host(color: AppColors.textMuted))
        else
          ...a.monthlySpend.map(
            (m) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(m.month),
              trailing: Text(money.format(m.amount), style: AppTheme.host(fontWeight: FontWeight.w700)),
            ),
          ),
      ],
    );
  }

  Widget _metric(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppTheme.host(fontSize: 12, color: AppColors.textMuted)),
          const SizedBox(height: 4),
          Text(value, style: AppTheme.host(fontSize: 18, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _SettingsSection extends StatefulWidget {
  const _SettingsSection({required this.cc, required this.onSave});

  final BuyerControlCenter cc;
  final Future<void> Function(Future<void> Function()) onSave;

  @override
  State<_SettingsSection> createState() => _SettingsSectionState();
}

class _SettingsSectionState extends State<_SettingsSection> {
  late String _serviceMode = widget.cc.preferences.serviceMode;
  late String _distance = widget.cc.preferences.distanceUnit;
  late String _theme = widget.cc.preferences.theme;
  late final _region = TextEditingController(text: widget.cc.preferences.region);

  @override
  void dispose() {
    _region.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final id = context.read<AuthController>().customerId!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        DropdownButtonFormField<String>(
          value: _serviceMode,
          decoration: const InputDecoration(labelText: 'Service mode'),
          items: const [
            DropdownMenuItem(value: 'mobile', child: Text('Mobile / roadside')),
            DropdownMenuItem(value: 'workshop', child: Text('Workshop')),
            DropdownMenuItem(value: 'both', child: Text('Both')),
          ],
          onChanged: (v) => setState(() => _serviceMode = v ?? 'both'),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: _distance,
          decoration: const InputDecoration(labelText: 'Distance unit'),
          items: const [
            DropdownMenuItem(value: 'km', child: Text('Kilometers')),
            DropdownMenuItem(value: 'miles', child: Text('Miles')),
          ],
          onChanged: (v) => setState(() => _distance = v ?? 'km'),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: _theme,
          decoration: const InputDecoration(labelText: 'Theme preference'),
          items: const [
            DropdownMenuItem(value: 'system', child: Text('System')),
            DropdownMenuItem(value: 'light', child: Text('Light')),
            DropdownMenuItem(value: 'dark', child: Text('Dark')),
          ],
          onChanged: (v) => setState(() => _theme = v ?? 'system'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _region,
          decoration: const InputDecoration(labelText: 'Region'),
        ),
        const SizedBox(height: 8),
        Text(
          'Language: English · Currency: UGX',
          style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: () => widget.onSave(() async {
            final p = widget.cc.preferences.copyWith(
              serviceMode: _serviceMode,
              distanceUnit: _distance,
              theme: _theme,
              region: _region.text.trim(),
            );
            await BuyerApi(ApiClient()).patchPreferences(
              customerId: id,
              prefs: p.toJson(),
            );
          }),
          child: const Text('Save settings'),
        ),
      ],
    );
  }
}

Widget _sectionLabel(String text) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 8, top: 4),
    child: Text(
      text,
      style: AppTheme.host(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: AppColors.textMuted,
        letterSpacing: 0.3,
      ),
    ),
  );
}
