import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../checkout/checkout_draft.dart';
import '../../providers/auth_controller.dart';
import '../../providers/cart_controller.dart';
import '../../router/app_router.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';
import '../../utils/settle_keyboard.dart';
import '../../widgets/app_brand_logo.dart';
import '../../widgets/place_autocomplete_field.dart';
import 'payment_webview_screen.dart';

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
  bool _seeded = false;

  @override
  void initState() {
    super.initState();
    _name.addListener(_persistDraft);
    _phone.addListener(_persistDraft);
    _address.addListener(_persistDraft);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_seedFields());
    });
  }

  Future<void> _seedFields() async {
    final draft = await CheckoutDraft.load();
    if (!mounted) return;
    if (draft != null) {
      if (draft.name.isNotEmpty) _name.text = draft.name;
      if (draft.phone.isNotEmpty) _phone.text = draft.phone;
      if (draft.address.isNotEmpty) _address.text = draft.address;
    }
    _applyProfileIfEmpty();
    _seeded = true;
  }

  void _applyProfileIfEmpty() {
    final profile = context.read<AuthController>().profile;
    if (profile == null) return;
    if (_name.text.isEmpty) _name.text = profile.name;
    if (_phone.text.isEmpty) _phone.text = profile.phone;
    if (_address.text.isEmpty && profile.address.isNotEmpty) {
      _address.text = profile.address;
    }
  }

  void _persistDraft() {
    if (!_seeded) return;
    unawaited(
      CheckoutDraft.save(
        name: _name.text,
        phone: _phone.text,
        address: _address.text,
      ),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_seeded) _applyProfileIfEmpty();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    await settleKeyboard();
    if (!mounted) return;
    await CheckoutDraft.save(
      name: _name.text,
      phone: _phone.text,
      address: _address.text,
    );
    if (!mounted) return;
    final ok = await ensureSignedIn(context);
    if (!ok || !mounted) return;

    final cart = context.read<CartController>();
    final auth = context.read<AuthController>();
    if (cart.items.isEmpty) return;

    final email = (auth.profile?.email ?? auth.user?.email ?? '').trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add an email on your profile before paying.')),
      );
      return;
    }
    if (_phone.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Phone is required for mobile money.')),
      );
      return;
    }

    setState(() => _busy = true);
    try {
      final res = await _api.createPaytotaCheckout({
        'customerName': _name.text.trim(),
        'customerEmail': email,
        'customerPhone': _phone.text.trim(),
        'shippingAddress': _address.text.trim(),
        'customerId': auth.customerId,
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

      await cart.holdAndClearForCheckout();
      if (!mounted) {
        cart.restoreHeldCheckout();
        return;
      }
      final result = await openHostedPayment(context, checkoutUrl: paymentUrl);
      if (!mounted) return;

      if (result == null || !result.success) {
        cart.restoreHeldCheckout();
        if (result == null || result.cancelled) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Payment cancelled.')),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Payment did not complete. You can try again.')),
          );
        }
        return;
      }

      cart.confirmHeldCheckout();
      unawaited(CheckoutDraft.clear());
      context.go(paymentResultLocation(result, auth));
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
      resizeToAvoidBottomInset: false,
      appBar: AppBar(title: const AppBarTitle('Checkout')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        children: [
          Text('Contact & delivery', style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            textInputAction: TextInputAction.next,
            onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
            decoration: const InputDecoration(labelText: 'Full name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phone,
            decoration: const InputDecoration(labelText: 'Phone'),
            keyboardType: TextInputType.phone,
            textInputAction: TextInputAction.next,
            onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
          ),
          const SizedBox(height: 12),
          PlaceAutocompleteField(
            controller: _address,
            maxLines: 2,
            decoration: const InputDecoration(
              labelText: 'Delivery address',
              hintText: 'Search e.g. Ntinda, Kololo, Acacia Mall...',
              prefixIcon: Icon(Icons.place_outlined),
            ),
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
