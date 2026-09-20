import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/products_api.dart';
import '../../api/promotions_api.dart';
import '../../models/product.dart';
import '../../models/promotion.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/ui.dart';

class PromotionsScreen extends StatefulWidget {
  const PromotionsScreen({super.key});

  @override
  State<PromotionsScreen> createState() => _PromotionsScreenState();
}

class _PromotionsScreenState extends State<PromotionsScreen> {
  final _promoApi = PromotionsApi(ApiClient());
  final _productsApi = ProductsApi(ApiClient());
  List<Promotion> _promotions = [];
  List<AdApplication> _apps = [];
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
      final results = await Future.wait([
        _promoApi.listPromotions(),
        _promoApi.listApplications(vendorId),
        _productsApi.list(vendorId),
      ]);
      if (!mounted) return;
      setState(() {
        _promotions = results[0] as List<Promotion>;
        _apps = results[1] as List<AdApplication>;
        _products = results[2] as List<SupplierProduct>;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = userFacingError(e, fallback: 'Could not load promotions.');
        _loading = false;
      });
    }
  }

  Future<void> _apply({String scope = 'all', SupplierProduct? product}) async {
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null) return;
    final message = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(scope == 'all' ? 'Apply for ads (all products)' : 'Apply for ads'),
        content: TextField(
          controller: message,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Optional message'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Submit')),
        ],
      ),
    );
    if (ok != true) {
      message.dispose();
      return;
    }
    try {
      await _promoApi.apply(
        vendorId: vendorId,
        scope: scope,
        productId: product?.id,
        productName: product?.name,
        message: message.text.trim(),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not submit application.'))),
      );
    } finally {
      message.dispose();
    }
  }

  Color _appColor(String status) {
    switch (status) {
      case 'approved':
        return AppColors.success;
      case 'rejected':
        return AppColors.danger;
      default:
        return AppColors.warning;
    }
  }

  @override
  Widget build(BuildContext context) {
    return PageScaffold(
      title: 'Promotions',
      subtitle: 'Campaigns and featured ads',
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _load,
        child: _loading
            ? ListView(children: const [SizedBox(height: 120), Center(child: CircularProgressIndicator())])
            : ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
                  children: [
                    if (_error != null && _promotions.isEmpty && _apps.isEmpty)
                      EmptyState(
                        title: 'Could not load promotions',
                        subtitle: _error,
                        action: OutlinedButton(onPressed: _load, child: const Text('Retry')),
                      ),
                    GlassCard(
                      highlight: true,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Advertise your listings', style: AppTheme.host(fontSize: 18, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          Text(
                            'Ask the MyGarage team to feature your products. You can apply for all listings or one SKU.',
                            style: AppTheme.host(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () => _apply(scope: 'all'),
                            child: const Text('Apply for all products'),
                          ),
                        ],
                      ),
                    ),
                    const SectionLabel('PLATFORM CODES'),
                    if (_promotions.isEmpty)
                      Text('No campaigns right now', style: AppTheme.host(color: AppColors.textMuted))
                    else
                      GlassCard(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        child: Column(
                          children: [
                            for (final promo in _promotions) ...[
                              QuietRow(
                                title: promo.code,
                                subtitle: [
                                  if (promo.description.isNotEmpty) promo.description,
                                  if (promo.discountType == 'percentage')
                                    '${promo.discountValue}% off'
                                  else
                                    formatUgx(promo.discountValue),
                                ].join(' · '),
                                trailing: StatusPill(
                                  label: promo.active ? 'Active' : 'Ended',
                                  color: promo.active ? AppColors.success : AppColors.textMuted,
                                ),
                              ),
                              const Divider(height: 1),
                            ],
                          ],
                        ),
                      ),
                    const SectionLabel('YOUR APPLICATIONS'),
                    if (_apps.isEmpty)
                      Text('No ad applications yet', style: AppTheme.host(color: AppColors.textMuted))
                    else
                      GlassCard(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        child: Column(
                          children: [
                            for (final app in _apps) ...[
                              QuietRow(
                                title: app.scope == 'all' ? 'All products' : (app.productName ?? 'Single product'),
                                subtitle: app.message?.isNotEmpty == true ? app.message : formatDate(app.createdAt),
                                trailing: StatusPill(label: app.status, color: _appColor(app.status)),
                              ),
                              const Divider(height: 1),
                            ],
                          ],
                        ),
                      ),
                    if (_products.isNotEmpty) ...[
                      const SectionLabel('APPLY FOR ONE PRODUCT'),
                      ..._products.take(8).map(
                            (product) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: GlassCard(
                                onTap: () => _apply(scope: 'single', product: product),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                child: QuietRow(
                                  title: product.name,
                                  subtitle: formatUgx(product.price),
                                  trailing: const Icon(Icons.campaign_outlined, color: AppColors.primary),
                                ),
                              ),
                            ),
                          ),
                    ],
                    ],
                  ),
      ),
    );
  }
}
