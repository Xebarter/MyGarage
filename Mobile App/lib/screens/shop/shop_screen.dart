import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';

class ShopScreen extends StatefulWidget {
  const ShopScreen({super.key});

  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> {
  final _api = BuyerApi(ApiClient());
  final _search = TextEditingController();
  List<Product> _products = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final products = await _api.listProducts(q: _search.text.trim());
      if (!mounted) return;
      setState(() {
        _products = products;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = userFacingError(e, fallback: 'Could not load products.');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(title: const Text('Shop')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _search,
              decoration: InputDecoration(
                hintText: 'Search parts…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
              ),
              onSubmitted: (_) => _load(),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _error!,
                                textAlign: TextAlign.center,
                                style: AppTheme.host(color: AppColors.danger),
                              ),
                              const SizedBox(height: 12),
                              OutlinedButton.icon(
                                onPressed: _load,
                                icon: const Icon(Icons.refresh),
                                label: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : _products.isEmpty
                        ? const Center(child: Text('No products found'))
                        : RefreshIndicator(
                            onRefresh: _load,
                            child: GridView.builder(
                              padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                mainAxisSpacing: 10,
                                crossAxisSpacing: 10,
                                childAspectRatio: 0.72,
                              ),
                              itemCount: _products.length,
                              itemBuilder: (context, i) {
                                final p = _products[i];
                                return Card(
                                  clipBehavior: Clip.antiAlias,
                                  child: InkWell(
                                    onTap: () => context.push('/product/${p.id}'),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        Expanded(
                                          child: p.image.isNotEmpty
                                              ? Image.network(
                                                  p.image,
                                                  fit: BoxFit.cover,
                                                  errorBuilder: (_, __, ___) => const ColoredBox(
                                                    color: AppColors.surfaceMuted,
                                                    child: Icon(Icons.image_not_supported),
                                                  ),
                                                )
                                              : const ColoredBox(
                                                  color: AppColors.surfaceMuted,
                                                  child: Icon(Icons.inventory_2_outlined),
                                                ),
                                        ),
                                        Padding(
                                          padding: const EdgeInsets.all(10),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                p.name,
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                                style: AppTheme.host(
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 13,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                money.format(p.price),
                                                style: AppTheme.host(
                                                  color: AppColors.primary,
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
