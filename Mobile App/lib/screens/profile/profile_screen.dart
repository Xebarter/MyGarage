import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../models/buyer_control_center.dart';
import '../../models/models.dart';
import '../../providers/auth_controller.dart';
import '../../router/app_router.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/app_brand_logo.dart';

/// Profile hub — control center entry points + quick actions (mobile-native).
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
    final signedIn =
        auth.status == AuthStatus.authenticated && auth.user != null;
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);
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
              centerTitle: true,
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
              SliverToBoxAdapter(child: _GuestCard(onSignIn: () => context.push('/login')))
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
                  email: auth.user?.email ?? profile?.email ?? '',
                  money: money,
                  unread: unread,
                  membership: _cc?.subscription?.planTier,
                ),
              ),
              aSliver(
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                  child: Text(
                    'Quick access',
                    style: AppTheme.host(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textMuted,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
              ),
              aSliver(
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: _QuickGrid(
                    onGarage: () => context.push('/garage'),
                    onOrders: () => context.push('/orders'),
                    onCart: () => context.go('/cart'),
                    onWishlist: () => context.push('/wishlist'),
                    onAddresses: () => context.push('/addresses'),
                    onSupport: () => context.push('/support'),
                    onServices: () => context.go('/services'),
                  ),
                ),
              ),
              aSliver(
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
                  child: Text(
                    'Account center',
                    style: AppTheme.host(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textMuted,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
              ),
              ..._hubTiles(context, unread),
              aSliver(
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 40),
                  child: OutlinedButton.icon(
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
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.danger,
                      side: const BorderSide(color: AppColors.dangerSoft),
                      minimumSize: const Size.fromHeight(50),
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

  List<Widget> _hubTiles(BuildContext context, int unread) {
    final items = <({IconData icon, String title, String subtitle, String path})>[
      (
        icon: Icons.person_outline_rounded,
        title: 'Account',
        subtitle: 'Name, phone, password, security',
        path: '/profile/account',
      ),
      (
        icon: Icons.notifications_none_rounded,
        title: 'Alerts',
        subtitle: unread > 0 ? '$unread unread · preferences' : 'Notifications & preferences',
        path: '/profile/notifications',
      ),
      (
        icon: Icons.receipt_long_outlined,
        title: 'Billing',
        subtitle: 'Payments & pending totals',
        path: '/profile/billing',
      ),
      (
        icon: Icons.workspace_premium_outlined,
        title: 'Membership',
        subtitle: 'Plans & subscription',
        path: '/profile/membership',
      ),
      (
        icon: Icons.folder_outlined,
        title: 'Documents',
        subtitle: 'Logbooks, insurance & expiry',
        path: '/profile/documents',
      ),
      (
        icon: Icons.build_circle_outlined,
        title: 'Services activity',
        subtitle: 'Requests, ratings, tips from providers',
        path: '/profile/services',
      ),
      (
        icon: Icons.insights_outlined,
        title: 'Insights',
        subtitle: 'Spend & vehicle health',
        path: '/profile/insights',
      ),
      (
        icon: Icons.tune_rounded,
        title: 'Settings',
        subtitle: 'Service mode, units & theme',
        path: '/profile/settings',
      ),
    ];

    return items
        .map(
          (t) => aSliver(
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Material(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppRadii.md),
                child: InkWell(
                  borderRadius: BorderRadius.circular(AppRadii.md),
                  onTap: () => _requireAuthThen(() => context.push(t.path)),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(AppRadii.md),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: AppColors.primarySoft,
                            borderRadius: BorderRadius.circular(AppRadii.sm),
                          ),
                          child: Icon(t.icon, color: AppColors.primary, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t.title,
                                style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 15),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                t.subtitle,
                                style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                        if (t.path == '/profile/notifications' && unread > 0)
                          Container(
                            margin: const EdgeInsets.only(right: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.danger,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              '$unread',
                              style: AppTheme.host(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        )
        .toList();
  }
}

Widget aSliver(Widget child) =>
    SliverToBoxAdapter(child: child);

class _GuestCard extends StatelessWidget {
  const _GuestCard({required this.onSignIn});

  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF1E3A8A), Color(0xFF1E4ED8)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(AppRadii.xl),
          boxShadow: AppTheme.softShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Welcome to MyGarage',
              style: AppTheme.host(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Sign in to manage vehicles, orders, membership, documents, and preferences in one place.',
              style: AppTheme.host(color: Colors.white.withValues(alpha: 0.88), height: 1.4),
            ),
            const SizedBox(height: 18),
            FilledButton(
              onPressed: onSignIn,
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.primaryDeep,
                minimumSize: const Size.fromHeight(48),
              ),
              child: const Text('Sign in'),
            ),
            const SizedBox(height: 10),
            TextButton(
              onPressed: () => context.push('/garage'),
              child: Text(
                'Browse garage offline',
                style: AppTheme.host(color: Colors.white, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.profile,
    required this.email,
    required this.money,
    required this.unread,
    this.membership,
  });

  final BuyerProfile? profile;
  final String email;
  final NumberFormat money;
  final int unread;
  final String? membership;

  @override
  Widget build(BuildContext context) {
    final name = (profile?.name.isNotEmpty == true) ? profile!.name : 'Buyer';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'M';
    final phone = profile?.phone ?? '';

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadii.xl),
          border: Border.all(color: AppColors.border),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Column(
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: AppColors.primarySoft,
                  child: Text(
                    initial,
                    style: AppTheme.host(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: AppTheme.host(fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 2),
                      Text(email, style: AppTheme.host(fontSize: 13, color: AppColors.textMuted)),
                      if (phone.isNotEmpty)
                        Text(phone, style: AppTheme.host(fontSize: 13, color: AppColors.textSecondary)),
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
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _stat('Orders', '${profile?.totalOrders ?? 0}'),
                _stat('Spent', money.format(profile?.totalSpent ?? 0)),
                _stat('Vehicles', '${profile?.vehicleCount ?? 0}'),
                _stat('Wishlist', '${profile?.wishlistCount ?? 0}'),
              ],
            ),
            if (unread > 0) ...[
              const SizedBox(height: 12),
              Material(
                color: AppColors.warningSoft,
                borderRadius: BorderRadius.circular(AppRadii.sm),
                child: InkWell(
                  borderRadius: BorderRadius.circular(AppRadii.sm),
                  onTap: () => context.push('/profile/notifications'),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    child: Row(
                      children: [
                        const Icon(Icons.notifications_active_rounded, size: 18, color: AppColors.warning),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'You have $unread unread alert${unread == 1 ? '' : 's'}',
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
          ],
        ),
      ),
    );
  }

  Widget _stat(String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 13.5),
          ),
          const SizedBox(height: 2),
          Text(label, style: AppTheme.host(fontSize: 11, color: AppColors.textMuted)),
        ],
      ),
    );
  }
}

class _QuickGrid extends StatelessWidget {
  const _QuickGrid({
    required this.onGarage,
    required this.onOrders,
    required this.onCart,
    required this.onWishlist,
    required this.onAddresses,
    required this.onSupport,
    required this.onServices,
  });

  final VoidCallback onGarage;
  final VoidCallback onOrders;
  final VoidCallback onCart;
  final VoidCallback onWishlist;
  final VoidCallback onAddresses;
  final VoidCallback onSupport;
  final VoidCallback onServices;

  @override
  Widget build(BuildContext context) {
    final tiles = <(IconData, String, VoidCallback)>[
      (Icons.directions_car_outlined, 'Garage', onGarage),
      (Icons.receipt_long_outlined, 'Orders', onOrders),
      (Icons.shopping_cart_outlined, 'Cart', onCart),
      (Icons.favorite_border, 'Wishlist', onWishlist),
      (Icons.location_on_outlined, 'Addresses', onAddresses),
      (Icons.support_agent_outlined, 'Support', onSupport),
      (Icons.build_outlined, 'Services', onServices),
    ];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: tiles.map((t) {
        return SizedBox(
          width: (MediaQuery.sizeOf(context).width - 32 - 16) / 3,
          child: Material(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadii.md),
            child: InkWell(
              borderRadius: BorderRadius.circular(AppRadii.md),
              onTap: t.$3,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppRadii.md),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    Icon(t.$1, color: AppColors.primary, size: 22),
                    const SizedBox(height: 6),
                    Text(
                      t.$2,
                      textAlign: TextAlign.center,
                      style: AppTheme.host(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

// Re-export helper used by other profile files — url launch for plans.
Future<void> launchExternalUrl(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}
