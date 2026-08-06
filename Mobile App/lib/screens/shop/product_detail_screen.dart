import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../models/models.dart';
import '../../providers/cart_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final String productId;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  final _api = BuyerApi(ApiClient());
  Product? _product;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final p = await _api.getProduct(widget.productId);
      if (!mounted) return;
      setState(() {
        _product = p;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = userFacingError(e, fallback: 'Could not load product.');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);
    final p = _product;

    return Scaffold(
      appBar: AppBar(title: Text(p?.name ?? 'Product')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : p == null
                  ? const Center(child: Text('Not found'))
                  : ListView(
                      children: [
                        AspectRatio(
                          aspectRatio: 1.2,
                          child: p.image.isNotEmpty
                              ? Image.network(p.image, fit: BoxFit.cover)
                              : const ColoredBox(
                                  color: AppColors.surfaceMuted,
                                  child: Icon(Icons.image, size: 48),
                                ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(p.name, style: AppTheme.host(fontSize: 22, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 8),
                              Text(
                                money.format(p.price),
                                style: AppTheme.host(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                              if (p.brand.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Text(p.brand, style: AppTheme.host(color: AppColors.textMuted)),
                              ],
                              const SizedBox(height: 16),
                              Text(p.description, style: AppTheme.host(height: 1.45)),
                              const SizedBox(height: 24),
                              ElevatedButton(
                                onPressed: () async {
                                  await context.read<CartController>().add(p);
                                  if (!context.mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Added to cart')),
                                  );
                                },
                                child: const Text('Add to cart'),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
    );
  }
}
