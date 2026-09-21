import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../auth/phone.dart';
import '../../models/buyer_control_center.dart';
import '../../models/models.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/app_brand_logo.dart';
import '../../router/app_router.dart';

String formatUgxCompact(num amount) {
  final n = amount.round();
  if (n >= 1000000) {
    final m = n / 1000000;
    final label = m >= 10 || m == m.roundToDouble()
        ? '${m.round()}'
        : m.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), '');
    return 'UGX ${label}M';
  }
  if (n >= 10000) return 'UGX ${(n / 1000).round()}K';
  return NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0).format(n);
}

String initialsFrom(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  return name.isNotEmpty ? name[0].toUpperCase() : 'M';
}

/// Profile hub — identity, daily shortcuts, grouped account lists.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = BuyerApi(ApiClient());
  BuyerControlCenter? _cc;
  bool _loadingCc = false;
  String? _ccError;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = context.read<AuthController>();
    if (auth.status == AuthStatus.authenticated &&
        auth.customerId != null &&
        _cc == null &&
        !_loadingCc) {
      // ignore: discarded_futures
      _loadControlCenter();
    }
  }

  Future<void> _loadControlCenter() async {
    final id = context.read<AuthController>().customerId;
    if (id == null || id.isEmpty) return;
    setState(() {
      _loadingCc = true;
      _ccError = null;
    });
    try {
      final cc = await _api.fetchControlCenter(customerId: id);
      if (!mounted) return;
      setState(() {
        _cc = cc;
        _loadingCc = false;
      });
      await context.read<AuthController>().updateLocalProfile(cc.profile);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingCc = false;
        _ccError = userFacingError(e, fallback: 'Could not load account details.');
      });
    }
  }

  Future<void> _requireAuthThen(VoidCallback action) async {
    final ok = await ensureSignedIn(context);
    if (!ok || !mounted) return;
    action();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final profile = auth.profile ?? _cc?.profile;
    final signedIn = auth.status == AuthStatus.authenticated && auth.user != null;
    final unread = _cc?.unreadNotificationCount ?? 0;

    if (signedIn && _cc == null && !_loadingCc && auth.customerId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _cc == null && !_loadingCc) {
          // ignore: discarded_futures
          _loadControlCenter();
        }
      });
    }

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          await auth.refreshProfile(quiet: true);
          if (signedIn) await _loadControlCenter();
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverAppBar(
              floating: true,
              snap: true,
              centerTitle: false,
              title: const AppBarTitle('Profile'),
              actions: [
                if (signedIn)
                  IconButton(
                    tooltip: 'Refresh',
                    onPressed: _loadingCc ? null : _loadControlCenter,
                    icon: _loadingCc
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.refresh_rounded),
                  ),
              ],
            ),
            if (!signedIn)
              SliverToBoxAdapter(child: _GuestCard(onSignIn: () {
                GoRouter.of(context).push('/login');
              }))
            else ...[
              if (_ccError != null)
                aSliver(
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: Text(_ccError!, style: AppTheme.host(color: AppColors.danger, fontSize: 13)),
                  ),
                ),
              aSliver(
                _HeroCard(
                  profile: profile,
                  email: () {
                    final raw = auth.user?.email ?? profile?.email ?? '';
                    return isPlaceholderEmail(raw) ? '' : raw;
                  }(),
                  membership: _cc?.subscription?.planTier,
                  loading: _loadingCc && _cc == null,
                ),
              ),
              aSliver(
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                  child: _ShortcutRow(
                    onGarage: () => context.push('/garage'),
                    onOrders: () => context.push('/orders'),
                    onServices: () => context.go('/services'),
                    onCart: () => context.go('/cart'),
                  ),
                ),
              ),
              aSliver(
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                  child: _ConciergeBanner(onTap: () => context.push('/concierge')),
                ),
              ),
              if (unread > 0)
                aSliver(
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                    child: Material(
                      color: AppColors.warningSoft,
                      borderRadius: BorderRadius.circular(AppRadii.md),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(AppRadii.md),
                        onTap: () => context.push('/profile/notifications'),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          child: Row(
                            children: [
                              const Icon(Icons.notifications_active_rounded, size: 18, color: AppColors.warning),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  '$unread unread alert${unread == 1 ? '' : 's'}',
                                  style: AppTheme.host(fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                              ),
                              const Icon(Icons.chevron_right, size: 18, color: AppColors.textMuted),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ..._groupedLists(context, unread),
              aSliver(
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
                  child: TextButton.icon(
                    onPressed: () async {
                      final yes = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Sign out?'),
                          content: const Text('You can sign back in anytime.'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                            TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sign out')),
                          ],
                        ),
                      );
                      if (yes == true && context.mounted) {
                        await auth.signOut();
                      }
                    },
                    icon: const Icon(Icons.logout_rounded, color: AppColors.danger),
                    label: Text(
                      'Sign out',
                      style: AppTheme.host(fontWeight: FontWeight.w600, color: AppColors.danger),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  List<Widget> _groupedLists(BuildContext context, int unread) {
    final groups = <({String title, List<_HubItem> items})>[
      (
        title: 'Your account',
        items: [
          _HubItem(
            icon: Icons.person_outline_rounded,
            title: 'Personal details',
            subtitle: 'Name, phone & security',
            path: '/profile/account',
          ),
          _HubItem(
            icon: Icons.location_on_outlined,
            title: 'Addresses',
            subtitle: 'Delivery & service locations',
            path: '/addresses',
          ),
          _HubItem(
            icon: Icons.folder_outlined,
            title: 'Documents',
            subtitle: 'Logbooks, insurance & expiry',
            path: '/profile/documents',
          ),
          _HubItem(
            icon: Icons.notifications_none_rounded,
            title: 'Alerts',
            subtitle: unread > 0 ? '$unread unread · preferences' : 'Notifications & preferences',
            path: '/profile/notifications',
            badge: unread,
          ),
        ],
      ),
      (
        title: 'Payments & plans',
        items: [
          _HubItem(
            icon: Icons.receipt_long_outlined,
            title: 'Billing',
            subtitle: 'Payments & pending totals',
            path: '/profile/billing',
          ),
          _HubItem(
            icon: Icons.workspace_premium_outlined,
            title: 'Membership',
            subtitle: 'Plans & subscription',
            path: '/profile/membership',
          ),
          _HubItem(
            icon: Icons.insights_outlined,
            title: 'Insights',
            subtitle: 'Spend & vehicle health',
            path: '/profile/insights',
          ),
        ],
      ),
      (
        title: 'More',
        items: [
          _HubItem(
            icon: Icons.favorite_border,
            title: 'Wishlist',
            subtitle: 'Saved parts',
            path: '/wishlist',
          ),
          _HubItem(
            icon: Icons.build_circle_outlined,
            title: 'Service history',
            subtitle: 'Requests, ratings & tips',
            path: '/profile/services',
          ),
          _HubItem(
            icon: Icons.tune_rounded,
            title: 'Settings',
            subtitle: 'Service mode, units & theme',
            path: '/profile/settings',
          ),
          _HubItem(
            icon: Icons.support_agent_outlined,
            title: 'Support',
            subtitle: 'Help & tickets',
            path: '/support',
          ),
        ],
      ),
    ];

    return [
      for (final group in groups) ...[
        aSliver(
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 22, 16, 8),
            child: Text(
              group.title.toUpperCase(),
              style: AppTheme.host(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.textMuted,
                letterSpacing: 1.4,
              ),
            ),
          ),
        ),
        aSliver(
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Material(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadii.xl),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppRadii.xl),
                  border: Border.all(color: AppColors.border.withValues(alpha: 0.95)),
                  boxShadow: AppTheme.cardShadow,
                  color: AppColors.surface,
                ),
                child: Column(
                  children: [
                    for (var i = 0; i < group.items.length; i++) ...[
                      if (i > 0)
                        const Divider(height: 1, indent: 66, color: AppColors.borderSoft),
                      _HubRow(
                        item: group.items[i],
                        onTap: () => _requireAuthThen(() => context.push(group.items[i].path)),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    ];
  }
}

class _HubItem {
  const _HubItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.path,
    this.badge = 0,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String path;
  final int badge;
}

class _HubRow extends StatelessWidget {
  const _HubRow({required this.item, required this.onTap});

  final _HubItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(item.icon, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.title, style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 14.5)),
                  const SizedBox(height: 2),
                  Text(item.subtitle, style: AppTheme.host(fontSize: 12, color: AppColors.textMuted)),
                ],
              ),
            ),
            if (item.badge > 0) ...[
              Container(
                margin: const EdgeInsets.only(right: 6),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.danger,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '${item.badge}',
                  style: AppTheme.host(color: AppColors.onPrimary, fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ],
            const Icon(Icons.chevron_right_rounded, color: Color(0xFFC5B8A4)),
          ],
        ),
      ),
    );
  }
}

Widget aSliver(Widget child) => SliverToBoxAdapter(child: child);

class _GuestCard extends StatelessWidget {
  const _GuestCard({required this.onSignIn});

  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 22, 20, 16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFE4F8EE), Color(0xFFFFF6EA), Colors.white],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(AppRadii.xl),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
          boxShadow: AppTheme.softShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 3,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: AppColors.glow,
                borderRadius: BorderRadius.circular(99),
              ),
            ),
            Text(
              'Your garage, in one place',
              style: AppTheme.host(
                color: AppColors.ink,
                fontSize: 22,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Sign in to keep vehicles, orders, documents, and membership together.',
              style: AppTheme.host(color: AppColors.textMuted, height: 1.4, fontSize: 14),
            ),
            const SizedBox(height: 16),
            _benefit(Icons.directions_car_outlined, 'Garage & service history'),
            _benefit(Icons.receipt_long_outlined, 'Orders and saved parts'),
            _benefit(Icons.workspace_premium_outlined, 'Membership and billing'),
            const SizedBox(height: 18),
            FilledButton(
              onPressed: onSignIn,
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
              child: const Text('Sign in'),
            ),
            TextButton(
              onPressed: () => context.go('/services'),
              child: Text(
                'Continue browsing',
                style: AppTheme.host(color: AppColors.primary, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _benefit(IconData icon, String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: 8),
          Text(label, style: AppTheme.host(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.profile,
    required this.email,
    this.membership,
    this.loading = false,
  });

  final BuyerProfile? profile;
  final String email;
  final String? membership;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
        child: Container(
          height: 168,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadii.xl),
            border: Border.all(color: AppColors.border),
          ),
        ),
      );
    }

    final rawName = profile?.name ?? '';
    final phone = profile?.phone ?? '';
    final name = isPlaceholderDisplayName(rawName, phone: phone, email: email)
        ? 'Buyer'
        : (rawName.isNotEmpty ? rawName : 'Buyer');
    final phoneLabel = phone.trim().isEmpty ? '' : formatE164Display(phone);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFE4F8EE), Color(0xFFFFF6EA), Colors.white],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(AppRadii.xl),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
          boxShadow: AppTheme.softShadow,
        ),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    initialsFrom(name),
                    style: AppTheme.host(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.primary),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: AppTheme.host(fontSize: 17, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      if (phoneLabel.isNotEmpty)
                        Text(phoneLabel, style: AppTheme.host(fontSize: 13, color: AppColors.textSecondary))
                      else
                        Text('Add a phone number', style: AppTheme.host(fontSize: 13, color: const Color(0xFFB45309))),
                      if (email.isNotEmpty)
                        Text(email, style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted)),
                      if (membership != null && membership!.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.primarySoft,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            '${membership![0].toUpperCase()}${membership!.substring(1)} plan',
                            style: AppTheme.host(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primaryDeep,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => context.push('/profile/account'),
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    foregroundColor: AppColors.primary,
                  ),
                  child: const Text('Edit'),
                ),
              ],
            ),
            if (phoneLabel.isEmpty) ...[
              const SizedBox(height: 12),
              Material(
                color: AppColors.warningSoft,
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => context.push('/profile/account'),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Add your mobile so providers can reach you',
                            style: AppTheme.host(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ),
                        const Icon(Icons.chevron_right, size: 18, color: AppColors.textMuted),
                      ],
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 14),
            Row(
              children: [
                _stat(context, 'Orders', '${profile?.totalOrders ?? 0}', '/orders'),
                _stat(context, 'Garage', '${profile?.vehicleCount ?? 0}', '/garage'),
                _stat(context, 'Saved', '${profile?.wishlistCount ?? 0}', '/wishlist'),
                _stat(context, 'Spent', formatUgxCompact(profile?.totalSpent ?? 0), '/profile/insights'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _stat(BuildContext context, String label, String value, String path) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 3),
        child: Material(
          color: Colors.white.withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => context.push(path),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
              child: Column(
                children: [
                  Text(
                    value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.ink),
                  ),
                  const SizedBox(height: 2),
                  Text(label, style: AppTheme.host(fontSize: 10.5, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ShortcutRow extends StatelessWidget {
  const _ShortcutRow({
    required this.onGarage,
    required this.onOrders,
    required this.onServices,
    required this.onCart,
  });

  final VoidCallback onGarage;
  final VoidCallback onOrders;
  final VoidCallback onServices;
  final VoidCallback onCart;

  @override
  Widget build(BuildContext context) {
    final tiles = <(IconData, String, VoidCallback)>[
      (Icons.directions_car_outlined, 'Garage', onGarage),
      (Icons.receipt_long_outlined, 'Orders', onOrders),
      (Icons.build_outlined, 'Services', onServices),
      (Icons.shopping_cart_outlined, 'Cart', onCart),
    ];

    return Row(
      children: [
        for (final t in tiles)
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Material(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppRadii.md),
                child: InkWell(
                  borderRadius: BorderRadius.circular(AppRadii.md),
                  onTap: t.$3,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(AppRadii.md),
                      border: Border.all(color: AppColors.border.withValues(alpha: 0.95)),
                      boxShadow: AppTheme.cardShadow,
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: AppColors.primarySoft,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(t.$1, color: AppColors.primary, size: 18),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          t.$2,
                          style: AppTheme.host(fontSize: 11, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _ConciergeBanner extends StatelessWidget {
  const _ConciergeBanner({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.primarySoft,
      borderRadius: BorderRadius.circular(AppRadii.xl),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadii.xl),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.xl),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.chat_bubble_outline, color: AppColors.onPrimary, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Ask Concierge', style: AppTheme.host(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primaryDeep)),
                    Text('Parts, bookings, and garage help', style: AppTheme.host(fontSize: 12, color: AppColors.textSecondary)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppColors.primaryDeep),
            ],
          ),
        ),
      ),
    );
  }
}

// Re-export helper used by other profile files — url launch for plans.
Future<void> launchExternalUrl(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}
