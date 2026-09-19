import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/app_brand_logo.dart';

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final _api = BuyerApi(ApiClient());
  OrderDetail? _order;
  bool _loading = true;
  String? _error;

  static const _steps = [
    ('Paid', 0),
    ('Processing', 1),
    ('In transit', 2),
    ('Delivered', 3),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final order = await _api.getOrder(widget.orderId);
      if (!mounted) return;
      setState(() {
        _order = order;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = userFacingError(e, fallback: 'Could not load this order.');
      });
    }
  }

  String? _stamp(OrderDetail order, int step) {
    switch (step) {
      case 0:
        return _pretty(order.paidAt ?? order.createdAt);
      case 1:
        return _pretty(order.processingAt);
      case 2:
        return _pretty(order.shippedAt);
      case 3:
        return _pretty(order.deliveredAt);
      default:
        return null;
    }
  }

  String? _pretty(String? value) {
    if (value == null || value.isEmpty) return null;
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return null;
    return DateFormat('d MMM, HH:mm').format(parsed.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);
    final order = _order;
    final current = order == null ? -1 : productOrderStepIndex(order.status);
    final cancelled = order != null &&
        (order.status == 'cancelled' || order.status == 'refunded');

    return Scaffold(
      appBar: AppBar(
        title: const AppBarTitle('Track order'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/orders');
            }
          },
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : order == null
                  ? const Center(child: Text('Order not found'))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        padding: const EdgeInsets.all(20),
                        children: [
                          Text(
                            'Order ${order.id.length > 12 ? '…${order.id.substring(order.id.length - 10)}' : order.id}',
                            style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 18),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            productOrderStatusLabel(order.status),
                            style: AppTheme.host(color: AppColors.primary, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 16),
                          if (cancelled)
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppColors.dangerSoft,
                                borderRadius: BorderRadius.circular(AppRadii.lg),
                              ),
                              child: Text(
                                'This order is ${productOrderStatusLabel(order.status).toLowerCase()}.',
                                style: AppTheme.host(color: AppColors.danger),
                              ),
                            )
                          else
                            ..._steps.map((step) {
                              final done = current >= step.$2;
                              final when = _stamp(order, step.$2);
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: done ? AppColors.primarySoft : AppColors.surfaceMuted,
                                    borderRadius: BorderRadius.circular(AppRadii.lg),
                                    border: Border.all(
                                      color: done ? AppColors.primary.withValues(alpha: 0.25) : AppColors.border,
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        done ? Icons.check_circle : Icons.radio_button_unchecked,
                                        color: done ? AppColors.primary : AppColors.textMuted,
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(step.$1, style: AppTheme.host(fontWeight: FontWeight.w700)),
                                            Text(
                                              when ?? (done ? 'Complete' : 'Waiting'),
                                              style: AppTheme.host(
                                                fontSize: 12,
                                                color: AppColors.textMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }),
                          if ((order.trackingNumber ?? '').isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text('Tracking', style: AppTheme.host(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 4),
                            Text(
                              [
                                if ((order.carrier ?? '').isNotEmpty) order.carrier,
                                order.trackingNumber,
                              ].whereType<String>().join(' · '),
                            ),
                          ],
                          const SizedBox(height: 20),
                          Text('Items', style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 16)),
                          const SizedBox(height: 8),
                          ...order.items.map(
                            (item) => ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(item.productName),
                              subtitle: Text('Qty ${item.quantity}'),
                              trailing: Text(
                                money.format(item.price * item.quantity),
                                style: AppTheme.host(fontWeight: FontWeight.w700),
                              ),
                            ),
                          ),
                          const Divider(),
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text('Total', style: AppTheme.host(fontWeight: FontWeight.w700)),
                            trailing: Text(
                              money.format(order.total),
                              style: AppTheme.host(fontWeight: FontWeight.w700),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text('Delivery', style: AppTheme.host(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text(
                            order.shippingAddress.isEmpty ? 'Not provided' : order.shippingAddress,
                            style: AppTheme.host(color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
    );
  }
}
