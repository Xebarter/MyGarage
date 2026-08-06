import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../providers/cart_controller.dart';
import '../../theme/app_theme.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartController>();
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(title: const Text('Cart')),
      body: !cart.hydrated
          ? const Center(child: CircularProgressIndicator())
          : cart.items.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.shopping_cart_outlined, size: 48, color: AppColors.textMuted),
                      const SizedBox(height: 12),
                      Text('Your cart is empty', style: AppTheme.host(color: AppColors.textSecondary)),
                      TextButton(onPressed: () => context.go('/shop'), child: const Text('Browse shop')),
                    ],
                  ),
                )
              : Column(
                  children: [
                    Expanded(
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: cart.items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final item = cart.items[i];
                          return Card(
                            child: ListTile(
                              title: Text(item.name, maxLines: 2, overflow: TextOverflow.ellipsis),
                              subtitle: Text(money.format(item.lineTotal)),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.remove_circle_outline),
                                    onPressed: () => cart.setQuantity(item.productId, item.quantity - 1),
                                  ),
                                  Text('${item.quantity}'),
                                  IconButton(
                                    icon: const Icon(Icons.add_circle_outline),
                                    onPressed: () => cart.setQuantity(item.productId, item.quantity + 1),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Subtotal', style: AppTheme.host(fontWeight: FontWeight.w600)),
                                Text(
                                  money.format(cart.subtotal),
                                  style: AppTheme.host(fontWeight: FontWeight.w700, fontSize: 16),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: () => context.push('/checkout'),
                              child: const Text('Checkout'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}
