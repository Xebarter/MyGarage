import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/orders_api.dart';
import '../../models/vendor_order.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/ui.dart';

const _filters = <(String, String)>[
  ('all', 'All'),
  ('pending_fulfillment', 'New'),
  ('processing', 'Processing'),
  ('shipped', 'In transit'),
  ('delivered', 'Delivered'),
  ('cancelled', 'Cancelled'),
];

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final _api = OrdersApi(ApiClient());
  final _search = TextEditingController();
  List<VendorOrder> _orders = [];
  bool _loading = true;
  String? _error;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _search.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null) return;
    setState(() {
      if (_orders.isEmpty) _loading = true;
      _error = null;
    });
    try {
      final list = await _api.list(vendorId);
      if (!mounted) return;
      list.sort((a, b) {
        final aDate = a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bDate = b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        return bDate.compareTo(aDate);
      });
      setState(() {
        _orders = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      final message = userFacingError(e, fallback: 'Could not load orders.');
      setState(() {
        _error = message;
        _loading = false;
      });
      if (_orders.isNotEmpty) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(message)));
      }
    }
  }

  bool _matchesFilter(VendorOrder order, String filter) {
    final status = order.normalizedStatus;
    if (filter == 'all') return true;
    if (filter == 'pending_fulfillment') {
      return status == 'pending_fulfillment' || status == 'pending';
    }
    return status == filter;
  }

  List<VendorOrder> get _visible {
    final q = _search.text.trim().toLowerCase();
    return _orders.where((order) {
      if (!_matchesFilter(order, _filter)) return false;
      if (q.isEmpty) return true;
      return order.id.toLowerCase().contains(q) ||
          shortOrderId(order.id).toLowerCase().contains(q) ||
          order.customerName.toLowerCase().contains(q) ||
          order.customerEmail.toLowerCase().contains(q) ||
          order.items.any((item) => item.productName.toLowerCase().contains(q));
    }).toList();
  }

  int _countFor(String filter) =>
      _orders.where((order) => _matchesFilter(order, filter)).length;

  int get _needsActionCount =>
      _orders.where((o) => orderNeedsAction(o.normalizedStatus)).length;

  String get _subtitle {
    if (_loading && _orders.isEmpty) return 'Loading your queue';
    if (_search.text.trim().isNotEmpty || _filter != 'all') {
      return '${_visible.length} of ${_orders.length} in queue';
    }
    if (_needsActionCount > 0) {
      return '$_needsActionCount need attention';
    }
    return '${_orders.length} in queue';
  }

  void _clearSearchAndFilter() {
    HapticFeedback.selectionClick();
    _search.clear();
    setState(() => _filter = 'all');
  }

  @override
  Widget build(BuildContext context) {
    final vendorId = context.watch<AuthController>().vendorId ?? '';
    final visible = _visible;
    final searching = _search.text.trim().isNotEmpty || _filter != 'all';

    return PageScaffold(
      title: 'Orders',
      subtitle: _subtitle,
      actions: [
        SoftIconButton(
          icon: Icons.refresh_rounded,
          tooltip: 'Refresh',
          onPressed: _load,
        ),
      ],
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _load,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          slivers: [
            SliverPersistentHeader(
              pinned: true,
              delegate: _OrdersToolbar(
                search: _search,
                selected: _filter,
                counts: {
                  for (final filter in _filters) filter.$1: _countFor(filter.$1)
                },
                onSelected: (value) {
                  HapticFeedback.selectionClick();
                  setState(() => _filter = value);
                },
              ),
            ),
            if (_loading && _orders.isEmpty)
              const SliverPadding(
                padding: EdgeInsets.fromLTRB(20, 4, 20, 110),
                sliver: SliverToBoxAdapter(child: _OrdersSkeleton()),
              )
            else if (_error != null && _orders.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyState(
                  title: 'Could not load orders',
                  subtitle: _error,
                  icon: Icons.shopping_bag_outlined,
                  action: OutlinedButton(
                      onPressed: _load, child: const Text('Retry')),
                ),
              )
            else if (visible.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyState(
                  title: searching ? 'No matching orders' : 'No orders',
                  subtitle: searching
                      ? 'Try another name, product, or clear filters.'
                      : 'Paid checkouts that include your products appear here.',
                  icon: searching
                      ? Icons.search_off_rounded
                      : Icons.shopping_bag_outlined,
                  action: searching
                      ? TextButton(
                          onPressed: _clearSearchAndFilter,
                          child: const Text('Clear filters'))
                      : null,
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 110),
                sliver: SliverList.separated(
                  itemCount: visible.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final order = visible[index];
                    return _OrderCard(
                      order: order,
                      vendorId: vendorId,
                      onTap: () async {
                        HapticFeedback.selectionClick();
                        await context.push('/orders/${order.id}');
                        if (mounted) _load();
                      },
                    )
                        .animate()
                        .fadeIn(
                            delay: (40 * index.clamp(0, 8)).ms,
                            duration: 280.ms)
                        .slideY(begin: 0.04, curve: Curves.easeOutCubic);
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _OrdersToolbar extends SliverPersistentHeaderDelegate {
  _OrdersToolbar({
    required this.search,
    required this.selected,
    required this.counts,
    required this.onSelected,
  });

  final TextEditingController search;
  final String selected;
  final Map<String, int> counts;
  final ValueChanged<String> onSelected;

  @override
  double get minExtent => 118;

  @override
  double get maxExtent => 118;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.background,
        border: Border(
          bottom: BorderSide(
            color: overlapsContent
                ? AppColors.border.withValues(alpha: 0.7)
                : Colors.transparent,
          ),
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
            child: ValueListenableBuilder<TextEditingValue>(
              valueListenable: search,
              builder: (context, value, _) {
                return TextField(
                  controller: search,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Search orders, customers, products',
                    filled: true,
                    fillColor: AppColors.surface,
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
                    prefixIcon: const Icon(Icons.search_rounded),
                    suffixIcon: value.text.isEmpty
                        ? null
                        : IconButton(
                            tooltip: 'Clear search',
                            onPressed: search.clear,
                            icon: const Icon(Icons.close_rounded, size: 20),
                          ),
                  ),
                );
              },
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 8),
              scrollDirection: Axis.horizontal,
              itemCount: _filters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final filter = _filters[index];
                return _FilterChip(
                  label: filter.$2,
                  count: counts[filter.$1] ?? 0,
                  selected: selected == filter.$1,
                  onTap: () => onSelected(filter.$1),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _OrdersToolbar oldDelegate) {
    return selected != oldDelegate.selected ||
        search != oldDelegate.search ||
        !_sameCounts(counts, oldDelegate.counts);
  }

  bool _sameCounts(Map<String, int> a, Map<String, int> b) {
    if (a.length != b.length) return false;
    for (final entry in a.entries) {
      if (b[entry.key] != entry.value) return false;
    }
    return true;
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadii.pill),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (selected) ...[
              const Icon(Icons.check_rounded,
                  size: 15, color: AppColors.onPrimary),
              const SizedBox(width: 5),
            ],
            Text(
              label,
              style: AppTheme.host(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: selected ? AppColors.onPrimary : AppColors.textSecondary,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              '$count',
              style: AppTheme.host(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: selected
                    ? AppColors.onPrimary.withValues(alpha: 0.85)
                    : AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.order,
    required this.vendorId,
    required this.onTap,
  });

  final VendorOrder order;
  final String vendorId;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final status = order.normalizedStatus;
    final color = orderStatusColor(status);
    final items = order.vendorItems(vendorId);
    final qty = items.fold<int>(0, (sum, item) => sum + item.quantity);
    final firstName = items.isEmpty ? 'Items' : items.first.productName;
    final extra = items.length > 1 ? ' +${items.length - 1} more' : '';
    final needsAction = orderNeedsAction(status);

    return GlassCard(
      highlight: needsAction,
      padding: const EdgeInsets.fromLTRB(0, 14, 14, 14),
      onTap: onTap,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 4,
              margin: const EdgeInsets.only(right: 12),
              decoration: BoxDecoration(
                color: color,
                borderRadius:
                    const BorderRadius.horizontal(right: Radius.circular(8)),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          order.customerName.trim().isEmpty
                              ? 'Customer'
                              : order.customerName.trim(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTheme.host(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.2),
                        ),
                      ),
                      StatusPill(label: statusLabel(status), color: color),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '$firstName$extra',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTheme.host(
                        fontSize: 13.5,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        '#${shortOrderId(order.id)}',
                        style: AppTheme.host(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textMuted),
                      ),
                      _Dot(),
                      Text(
                        '$qty ${qty == 1 ? 'item' : 'items'}',
                        style: AppTheme.host(
                            fontSize: 12.5, color: AppColors.textMuted),
                      ),
                      _Dot(),
                      Flexible(
                        child: Text(
                          formatUgx(order.vendorSubtotal(vendorId)),
                          overflow: TextOverflow.ellipsis,
                          style: AppTheme.host(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(Icons.schedule_rounded,
                          size: 14, color: AppColors.textMuted),
                      const SizedBox(width: 4),
                      Text(
                        formatRelativeTime(order.createdAt),
                        style: AppTheme.host(
                            fontSize: 12, color: AppColors.textMuted),
                      ),
                      const Spacer(),
                      Text(
                        orderNextActionLabel(status),
                        style: AppTheme.host(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: needsAction
                              ? AppColors.primary
                              : AppColors.textMuted,
                        ),
                      ),
                      Icon(
                        Icons.chevron_right_rounded,
                        size: 18,
                        color: needsAction
                            ? AppColors.primary
                            : AppColors.textMuted,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6),
      child: Text('·',
          style: AppTheme.host(
              color: AppColors.textMuted, fontWeight: FontWeight.w700)),
    );
  }
}

class _OrdersSkeleton extends StatelessWidget {
  const _OrdersSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < 4; i++) ...[
          GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 16,
                  width: 140,
                  decoration: BoxDecoration(
                      color: AppColors.borderSoft,
                      borderRadius: BorderRadius.circular(8)),
                ),
                const SizedBox(height: 10),
                Container(
                  height: 12,
                  width: 220,
                  decoration: BoxDecoration(
                      color: AppColors.borderSoft,
                      borderRadius: BorderRadius.circular(8)),
                ),
                const SizedBox(height: 10),
                Container(
                  height: 12,
                  width: 160,
                  decoration: BoxDecoration(
                      color: AppColors.borderSoft,
                      borderRadius: BorderRadius.circular(8)),
                ),
              ],
            ),
          )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .fade(begin: 0.55, end: 1, duration: 900.ms),
          if (i < 3) const SizedBox(height: 10),
        ],
      ],
    );
  }
}
