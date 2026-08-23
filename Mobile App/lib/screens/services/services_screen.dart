import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../data/services_catalog.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_brand_logo.dart';

class ServicesScreen extends StatelessWidget {
  const ServicesScreen({super.key});

  void _openCategory(BuildContext context, ServiceCategory cat) {
    HapticFeedback.lightImpact();
    context.push('/service/${cat.id}');
  }

  @override
  Widget build(BuildContext context) {
    final urgent = userServiceCategories
        .where((c) => c.priority == 'urgent')
        .toList();
    final rest = userServiceCategories
        .where((c) => c.priority != 'urgent')
        .toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: const PageBrandHeader(
                title: 'Services',
                subtitle: 'Get help now or book the right repair when you need it.',
              ),
            ),
            if (urgent.isNotEmpty)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    for (final cat in urgent)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _EmergencyHeroCard(
                          category: cat,
                          onTap: () => _openCategory(context, cat),
                        ),
                      ),
                  ]),
                ),
              ),
            if (rest.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    20,
                    urgent.isNotEmpty ? 12 : 8,
                    20,
                    10,
                  ),
                  child: Text(
                    urgent.isNotEmpty ? 'All services' : 'Browse services',
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
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    mainAxisExtent: 112,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, i) {
                      final cat = rest[i];
                      return _ServiceCategoryTile(
                        category: cat,
                        onTap: () => _openCategory(context, cat),
                      );
                    },
                    childCount: rest.length,
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

class _EmergencyHeroCard extends StatelessWidget {
  const _EmergencyHeroCard({
    required this.category,
    required this.onTap,
  });

  final ServiceCategory category;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.xl),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.xl),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFFFFF1F2),
                AppColors.dangerSoft,
                Color(0xFFFEE2E2),
              ],
            ),
            border: Border.all(
              color: AppColors.danger.withValues(alpha: 0.28),
            ),
            boxShadow: AppTheme.cardShadow,
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 16, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppColors.surface.withValues(alpha: 0.92),
                        borderRadius: BorderRadius.circular(AppRadii.md),
                        border: Border.all(
                          color: AppColors.danger.withValues(alpha: 0.15),
                        ),
                      ),
                      child: Text(
                        category.emoji,
                        style: const TextStyle(fontSize: 28),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.danger.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(AppRadii.pill),
                            ),
                            child: Text(
                              'Priority',
                              style: AppTheme.host(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.danger,
                                letterSpacing: 0.3,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            cleanDisplayTitle(category.title),
                            style: AppTheme.host(
                              fontSize: 19,
                              fontWeight: FontWeight.w700,
                              height: 1.2,
                              letterSpacing: -0.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.arrow_forward_rounded,
                      color: AppColors.danger.withValues(alpha: 0.85),
                      size: 22,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  category.useWhen,
                  style: AppTheme.host(
                    fontSize: 14,
                    height: 1.4,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Icon(
                      Icons.bolt_rounded,
                      size: 16,
                      color: AppColors.danger.withValues(alpha: 0.9),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        '${category.services.length} emergency options · fastest response',
                        style: AppTheme.host(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.danger.withValues(alpha: 0.85),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ServiceCategoryTile extends StatelessWidget {
  const _ServiceCategoryTile({
    required this.category,
    required this.onTap,
  });

  final ServiceCategory category;
  final VoidCallback onTap;

  bool get _muted => category.priority == 'optional';

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppRadii.md),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.md),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.md),
            border: Border.all(
              color: _muted ? AppColors.borderSoft : AppColors.border,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.ink.withValues(alpha: 0.035),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: _muted
                        ? AppColors.surfaceMuted
                        : AppColors.primarySoft.withValues(alpha: 0.65),
                    borderRadius: BorderRadius.circular(AppRadii.sm),
                  ),
                  child: Text(
                    category.emoji,
                    style: const TextStyle(fontSize: 20),
                  ),
                ),
                const Spacer(),
                Text(
                  cleanDisplayTitle(category.title),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: AppTheme.host(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    height: 1.25,
                    color: _muted
                        ? AppColors.textSecondary
                        : AppColors.textPrimary,
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
