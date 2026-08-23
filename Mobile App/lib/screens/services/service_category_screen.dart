import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../data/services_catalog.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_brand_logo.dart';

class ServiceCategoryScreen extends StatelessWidget {
  const ServiceCategoryScreen({super.key, required this.categoryId});

  final String categoryId;

  @override
  Widget build(BuildContext context) {
    final cat = categoryById(categoryId);
    if (cat == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Column(
            children: [
              _ScrollableBackRow(onBack: () => context.pop()),
              const Expanded(child: Center(child: Text('Category not found'))),
            ],
          ),
        ),
      );
    }

    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);
    final urgent = cat.priority == 'urgent';
    final count = cat.services.length;
    final title = cleanDisplayTitle(cat.title);

    return Scaffold(
      backgroundColor: AppColors.background,
      // No sticky AppBar — chrome scrolls with content.
      body: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverSafeArea(
            bottom: false,
            sliver: SliverToBoxAdapter(
              child: Column(
                children: [
                  _ScrollableBackRow(onBack: () => context.pop()),
                  _CategoryCenteredHero(
                    emoji: cat.emoji,
                    title: title,
                    urgent: urgent,
                    serviceCount: count,
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            sliver: SliverToBoxAdapter(
              child: Text(
                'Choose a service',
                textAlign: TextAlign.center,
                style: AppTheme.host(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted,
                  letterSpacing: 0.2,
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 40),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, i) {
                  final s = cat.services[i];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _ServicePickRow(
                      service: s,
                      priceLabel: 'From ${money.format(s.defaultPriceUgx)}',
                      urgent: urgent,
                      onTap: () {
                        HapticFeedback.lightImpact();
                        context.push(
                          '/service/$categoryId/location?service=${Uri.encodeComponent(s.name)}',
                        );
                      },
                    ),
                  );
                },
                childCount: cat.services.length,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Scrolls away with content (non-persistent).
class _ScrollableBackRow extends StatelessWidget {
  const _ScrollableBackRow({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Material(
          color: AppColors.surface,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onBack,
            child: const SizedBox(
              width: 44,
              height: 44,
              child: Icon(Icons.arrow_back_rounded, size: 22),
            ),
          ),
        ),
      ),
    );
  }
}

class _CategoryCenteredHero extends StatelessWidget {
  const _CategoryCenteredHero({
    required this.emoji,
    required this.title,
    required this.urgent,
    required this.serviceCount,
  });

  final String emoji;
  final String title;
  final bool urgent;
  final int serviceCount;

  @override
  Widget build(BuildContext context) {
    final accent = urgent ? AppColors.danger : AppColors.primary;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 12),
      child: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: urgent
                  ? AppColors.dangerSoft.withValues(alpha: 0.75)
                  : AppColors.primarySoft.withValues(alpha: 0.7),
              shape: BoxShape.circle,
              border: Border.all(color: accent.withValues(alpha: 0.18)),
              boxShadow: AppTheme.cardShadow,
            ),
            child: Text(emoji, style: const TextStyle(fontSize: 34)),
          ),
          const SizedBox(height: 16),
          if (urgent) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.danger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppRadii.pill),
              ),
              child: Text(
                'Priority',
                style: AppTheme.host(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.danger,
                  letterSpacing: 0.2,
                ),
              ),
            ),
            const SizedBox(height: 10),
          ],
          Text(
            title,
            textAlign: TextAlign.center,
            style: AppTheme.host(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              height: 1.2,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            serviceCount == 1 ? '1 service' : '$serviceCount services',
            textAlign: TextAlign.center,
            style: AppTheme.host(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _ServicePickRow extends StatelessWidget {
  const _ServicePickRow({
    required this.service,
    required this.priceLabel,
    required this.urgent,
    required this.onTap,
  });

  final CatalogService service;
  final String priceLabel;
  final bool urgent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accent = urgent ? AppColors.danger : AppColors.primary;
    final chipBg = urgent
        ? AppColors.dangerSoft.withValues(alpha: 0.7)
        : AppColors.primarySoft.withValues(alpha: 0.55);

    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppRadii.md),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.md),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.md),
            border: Border.all(color: AppColors.borderSoft),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        service.name,
                        style: AppTheme.host(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        priceLabel,
                        style: AppTheme.host(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: accent,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: chipBg,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.arrow_forward_rounded,
                    size: 18,
                    color: accent,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
