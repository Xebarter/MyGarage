import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../models/models.dart';
import '../../providers/cart_controller.dart';
import '../../providers/shop_catalog_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/app_brand_logo.dart';
import '../../widgets/neighbor_tab_swipe.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({
    super.key,
    required this.productId,
    this.initialProduct,
  });

  final String productId;
  /// Optional product from the shop list for instant paint.
  final Product? initialProduct;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  final _api = BuyerApi(ApiClient());
  Product? _product;
  String? _error;
  /// True only when we have nothing to show yet.
  bool _blockingLoad = true;
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    // Prefer navigated seed, then catalog — so paint is synchronous when possible.
    final seed = widget.initialProduct;
    if (seed != null && seed.id == widget.productId) {
      _product = seed;
      _blockingLoad = false;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    final catalog = context.read<ShopCatalogController>();
    final cached = catalog.productById(widget.productId);
    if (cached != null && mounted) {
      setState(() {
        _product = cached;
        _blockingLoad = false;
        _error = null;
      });
      catalog.cacheProduct(cached);
    }

    // Network refresh: update quietly if UI already has data.
    if (_product != null) {
      setState(() => _refreshing = true);
      try {
        final fresh = await _api.getProduct(widget.productId);
        if (!mounted) return;
        catalog.cacheProduct(fresh);
        setState(() {
          _product = fresh;
          _refreshing = false;
          _error = null;
        });
      } catch (_) {
        if (!mounted) return;
        setState(() => _refreshing = false);
        // Keep cached product visible.
      }
      return;
    }

    // Cold open (deep link / no cache): wait for network.
    setState(() {
      _blockingLoad = true;
      _error = null;
    });
    try {
      final fresh = await catalog.fetchProduct(widget.productId, forceNetwork: true);
      if (!mounted) return;
      setState(() {
        _product = fresh;
        _blockingLoad = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _blockingLoad = false;
        _error = userFacingError(e, fallback: 'Could not load product.');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);
    final p = _product;

    return NeighborTabSwipe(
      child: Scaffold(
        appBar: AppBar(
          title: AppBarTitle(p?.name ?? 'Product'),
          actions: [
            if (_refreshing)
              const Padding(
                padding: EdgeInsets.only(right: 16),
                child: Center(
                  child: SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              ),
          ],
        ),
        body: _blockingLoad && p == null
            ? const Center(child: CircularProgressIndicator())
            : _error != null && p == null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(_error!, textAlign: TextAlign.center),
                          const SizedBox(height: 12),
                          OutlinedButton(
                            onPressed: _bootstrap,
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  )
                : p == null
                    ? const Center(child: Text('Not found'))
                    : ListView(
                        children: [
                          AspectRatio(
                            aspectRatio: 1.2,
                            child: p.image.isNotEmpty
                                ? Image.network(
                                    p.image,
                                    fit: BoxFit.cover,
                                    gaplessPlayback: true,
                                    filterQuality: FilterQuality.medium,
                                    // Decode at roughly phone-width to cut decode/network lag.
                                    cacheWidth: (MediaQuery.sizeOf(context).width *
                                            MediaQuery.devicePixelRatioOf(context))
                                        .round()
                                        .clamp(320, 1600),
                                    errorBuilder: (_, __, ___) => const ColoredBox(
                                      color: AppColors.surfaceMuted,
                                      child: Icon(Icons.image_not_supported, size: 48),
                                    ),
                                    loadingBuilder: (context, child, progress) {
                                      if (progress == null) return child;
                                      return ColoredBox(
                                        color: AppColors.surfaceMuted,
                                        child: Center(
                                          child: SizedBox(
                                            width: 28,
                                            height: 28,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2.2,
                                              value: progress.expectedTotalBytes != null
                                                  ? progress.cumulativeBytesLoaded /
                                                      progress.expectedTotalBytes!
                                                  : null,
                                            ),
                                          ),
                                        ),
                                      );
                                    },
                                  )
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
                                Text(
                                  p.name,
                                  style: AppTheme.host(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
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
                                  Text(
                                    p.brand,
                                    style: AppTheme.host(color: AppColors.textMuted),
                                  ),
                                ],
                                if (p.category.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    p.category,
                                    style: AppTheme.host(
                                      fontSize: 13,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 16),
                                Text(
                                  p.description.isEmpty
                                      ? 'No description available.'
                                      : p.description,
                                  style: AppTheme.host(height: 1.45),
                                ),
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
      ),
    );
  }
}
