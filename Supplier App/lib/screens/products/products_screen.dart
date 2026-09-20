import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/products_api.dart';
import '../../models/product.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/ui.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _api = ProductsApi(ApiClient());
  List<SupplierProduct> _products = [];
  bool _loading = true;
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
        _products = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = userFacingError(e, fallback: 'Could not load products.');
        _loading = false;
      });
    }
  }

  Future<void> _confirmDelete(SupplierProduct product) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete listing?'),
        content: Text('${product.name} will be removed from the shop.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Delete', style: AppTheme.host(color: AppColors.danger, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null) return;
    try {
      await _api.delete(product.id, vendorId);
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not delete product.'))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return PageScaffold(
      title: 'Products',
      subtitle: '${_products.length} listings',
      actions: [
        SoftIconButton(
          icon: Icons.add_rounded,
          tooltip: 'Add product',
          onPressed: () async {
            await context.push('/products/new');
            if (mounted) _load();
          },
        ),
      ],
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _load,
        child: _loading
            ? ListView(children: const [SizedBox(height: 120), Center(child: CircularProgressIndicator())])
            : _error != null && _products.isEmpty
                ? ListView(
                    children: [
                      EmptyState(
                        title: 'Could not load products',
                        subtitle: _error,
                        icon: Icons.inventory_2_outlined,
                        action: OutlinedButton(onPressed: _load, child: const Text('Retry')),
                      ),
                    ],
                  )
                : _products.isEmpty
                    ? ListView(
                        children: [
                          EmptyState(
                            title: 'No products yet',
                            subtitle: 'Add your first listing to start selling.',
                            icon: Icons.inventory_2_outlined,
                            action: ElevatedButton(
                              onPressed: () => context.push('/products/new'),
                              child: const Text('Add product'),
                            ),
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
                        itemCount: _products.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final product = _products[index];
                          return GlassCard(
                            onTap: () async {
                              await context.push('/products/edit/${product.id}');
                              if (mounted) _load();
                            },
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: SizedBox(
                                    width: 64,
                                    height: 64,
                                    child: product.displayImage.isEmpty
                                        ? ColoredBox(
                                            color: AppColors.primarySoft,
                                            child: const Icon(Icons.inventory_2_outlined, color: AppColors.primary),
                                          )
                                        : Image.network(
                                            product.displayImage,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) => ColoredBox(
                                              color: AppColors.primarySoft,
                                              child: const Icon(Icons.inventory_2_outlined, color: AppColors.primary),
                                            ),
                                          ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        product.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: AppTheme.host(fontSize: 15.5, fontWeight: FontWeight.w700),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        [
                                          if (product.category.isNotEmpty) product.category,
                                          formatUgx(product.price),
                                        ].join(' · '),
                                        style: AppTheme.host(fontSize: 13, color: AppColors.textMuted),
                                      ),
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 6,
                                        children: [
                                          StatusPill(
                                            label: product.published ? 'Live' : 'Hidden',
                                            color: product.published ? AppColors.success : AppColors.textMuted,
                                          ),
                                          if (product.featured)
                                            const StatusPill(label: 'Featured', color: AppColors.glow),
                                          if (product.featuredRequestPending && !product.featured)
                                            const StatusPill(label: 'Feature requested', color: AppColors.warning),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  onPressed: () => _confirmDelete(product),
                                  icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
