import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../models/models.dart';
import '../../providers/auth_controller.dart';
import '../../router/app_router.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/app_brand_logo.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final _api = BuyerApi(ApiClient());
  List<OrderSummary> _orders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final ok = await ensureSignedIn(context);
    if (!ok || !mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthController>();
      final orders = await _api.listOrders(
        customerId: auth.customerId,
        email: auth.profile?.email ?? auth.user?.email,
      );
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = userFacingError(e, fallback: 'Could not load orders.');
      });
    }
  }

  String _shortId(String id) {
    if (id.length <= 10) return id;
    return '…${id.substring(id.length - 8)}';
  }

  String _when(String raw) {
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return '';
    return DateFormat('d MMM yyyy').format(parsed.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(title: const AppBarTitle('Orders')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _orders.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 120),
                            Center(child: Text('No orders yet')),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _orders.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, i) {
                            final o = _orders[i];
                            return Card(
                              child: ListTile(
                                title: Text('Order ${_shortId(o.id)}'),
                                subtitle: Text(
                                  '${productOrderStatusLabel(o.status)} · ${_when(o.createdAt)}',
                                ),
                                trailing: Text(
                                  money.format(o.total),
                                  style: AppTheme.host(fontWeight: FontWeight.w700),
                                ),
                                onTap: () => context.push('/orders/${o.id}'),
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}
