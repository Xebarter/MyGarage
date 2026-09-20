import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/orders_api.dart';
import '../../models/vendor_order.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/ui.dart';

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final _api = OrdersApi(ApiClient());
  VendorOrder? _order;
  bool _loading = true;
  bool _updating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await _api.list(vendorId);
      if (!mounted) return;
      setState(() {
        VendorOrder? match;
        for (final order in list) {
          if (order.id == widget.orderId) {
            match = order;
            break;
          }
        }
        _order = match;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = userFacingError(e, fallback: 'Could not load this order.');
        _loading = false;
      });
    }
  }

  Future<void> _transition(String next,
      {String? tracking, String? carrier}) async {
    final vendorId = context.read<AuthController>().vendorId;
    final order = _order;
    if (vendorId == null || order == null) return;
    setState(() => _updating = true);
    try {
      final updated = await _api.updateStatus(
        orderId: order.id,
        vendorId: vendorId,
        status: next,
        trackingNumber: tracking,
        carrier: carrier,
      );
      if (!mounted) return;
      setState(() {
        _order = updated;
        _updating = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _updating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content:
                Text(userFacingError(e, fallback: 'Could not update order.'))),
      );
    }
  }

  Future<void> _shipDialog() async {
    final tracking = TextEditingController();
    final carrier = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Mark shipped'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
                controller: tracking,
                decoration:
                    const InputDecoration(labelText: 'Tracking number')),
            const SizedBox(height: 12),
            TextField(
                controller: carrier,
                decoration: const InputDecoration(labelText: 'Carrier')),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Ship')),
        ],
      ),
    );
    if (ok == true) {
      await _transition('shipped',
          tracking: tracking.text.trim(), carrier: carrier.text.trim());
    }
    tracking.dispose();
    carrier.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final vendorId = context.watch<AuthController>().vendorId ?? '';
    final order = _order;
    final next = order == null
        ? <String>[]
        : allowedVendorTransitions(order.normalizedStatus);

    return AmbientBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: const Text('Order')),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : order == null
                ? EmptyState(
                    title: 'Order not found',
                    subtitle: _error ?? 'This order is not in your queue.',
                    icon: Icons.shopping_bag_outlined,
                  )
                : ListView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                    children: [
                      GlassCard(
                        highlight: true,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            StatusPill(
                              label: statusLabel(order.normalizedStatus),
                              color: orderStatusColor(order.normalizedStatus),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              formatUgx(order.vendorSubtotal(vendorId)),
                              style: AppTheme.host(
                                  fontSize: 28,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: -0.6),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '#${shortOrderId(order.id)} · ${formatRelativeTime(order.createdAt)}',
                              style: AppTheme.host(
                                  fontSize: 13, color: AppColors.textMuted),
                            ),
                          ],
                        ),
                      ),
                      const SectionLabel('CUSTOMER'),
                      GlassCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(order.customerName,
                                style: AppTheme.host(
                                    fontSize: 16, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 4),
                            Text(order.customerEmail,
                                style: AppTheme.host(
                                    fontSize: 13, color: AppColors.textMuted)),
                            if (order.shippingAddress.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Text(order.shippingAddress,
                                  style:
                                      AppTheme.host(fontSize: 14, height: 1.4)),
                            ],
                          ],
                        ),
                      ),
                      const SectionLabel('YOUR ITEMS'),
                      GlassCard(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 4),
                        child: Column(
                          children: [
                            for (final item in order.vendorItems(vendorId)) ...[
                              QuietRow(
                                title: item.productName,
                                subtitle:
                                    '${item.quantity} × ${formatUgx(item.price)}',
                                trailing: Text(
                                  formatUgx(item.quantity * item.price),
                                  style: AppTheme.host(
                                      fontWeight: FontWeight.w700),
                                ),
                              ),
                              const Divider(height: 1),
                            ],
                          ],
                        ),
                      ),
                      if (order.hasOtherVendors(vendorId)) ...[
                        const SizedBox(height: 12),
                        Text(
                          'This checkout also includes items from other suppliers.',
                          style: AppTheme.host(
                              fontSize: 13,
                              color: AppColors.textMuted,
                              height: 1.4),
                        ),
                      ],
                      if (order.trackingNumber != null &&
                          order.trackingNumber!.isNotEmpty) ...[
                        const SectionLabel('TRACKING'),
                        GlassCard(
                          child: QuietRow(
                            title: order.trackingNumber!,
                            subtitle: order.carrier ?? 'Carrier',
                          ),
                        ),
                      ],
                      if (next.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        for (final action in next) ...[
                          Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: action == 'cancelled'
                                ? OutlinedButton(
                                    onPressed: _updating
                                        ? null
                                        : () => _transition('cancelled'),
                                    child: const Text('Cancel order'),
                                  )
                                : ElevatedButton(
                                    onPressed: _updating
                                        ? null
                                        : () {
                                            if (action == 'shipped') {
                                              _shipDialog();
                                            } else {
                                              _transition(action);
                                            }
                                          },
                                    child: Text(_actionLabel(action)),
                                  ),
                          ),
                        ],
                      ],
                    ],
                  ),
      ),
    );
  }

  String _actionLabel(String status) {
    switch (status) {
      case 'processing':
        return 'Mark processing';
      case 'shipped':
        return 'Mark shipped';
      case 'delivered':
        return 'Mark delivered';
      default:
        return statusLabel(status);
    }
  }
}
