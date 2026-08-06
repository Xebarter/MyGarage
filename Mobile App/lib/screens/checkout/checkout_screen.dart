import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../providers/auth_controller.dart';
import '../../providers/cart_controller.dart';
import '../../router/app_router.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _api = BuyerApi(ApiClient());
  bool _busy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final profile = context.read<AuthController>().profile;
    if (profile != null) {
      if (_name.text.isEmpty) _name.text = profile.name;
      if (_phone.text.isEmpty) _phone.text = profile.phone;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    final ok = await ensureSignedIn(context);
    if (!ok || !mounted) return;

    final cart = context.read<CartController>();
    if (cart.items.isEmpty) return;

    setState(() => _busy = true);
    try {
      final res = await _api.createPaytotaCheckout({
        'customerName': _name.text.trim(),
        'phone': _phone.text.trim(),
        'address': _address.text.trim(),
        'customerId': context.read<AuthController>().customerId,
        'items': cart.items
            .map(
              (e) => {
                'productId': e.productId,
                'name': e.name,
                'price': e.price,
                'quantity': e.quantity,
              },
            )
            .toList(),
      });

      final paymentUrl = res['paymentUrl']?.toString() ??
          res['checkoutUrl']?.toString() ??
          res['url']?.toString();
      if (paymentUrl == null || paymentUrl.isEmpty) {
        throw Exception(res['error']?.toString() ?? 'No payment URL returned');
      }

      final launched = await launchUrl(
        Uri.parse(paymentUrl),
        mode: LaunchMode.externalApplication,
      );
      if (!launched) throw Exception('Could not open payment page');

      if (!mounted) return;
      await cart.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Payment opened in browser. Complete there, then check Orders.')),
      );
      context.go('/orders');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Checkout failed.'))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartController>();
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Contact & delivery', style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 12),
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Full name')),
          const SizedBox(height: 12),
          TextField(
            controller: _phone,
            decoration: const InputDecoration(labelText: 'Phone'),
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _address,
            decoration: const InputDecoration(labelText: 'Delivery address'),
            maxLines: 2,
          ),
          const SizedBox(height: 20),
          Text('Order total: ${money.format(cart.subtotal)}',
              style: AppTheme.host(fontWeight: FontWeight.w700)),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _busy || cart.items.isEmpty ? null : _pay,
            child: _busy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Pay with mobile money'),
          ),
        ],
      ),
    );
  }
}
