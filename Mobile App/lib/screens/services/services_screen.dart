import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../models/models.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/active_service_request.dart';
import '../../utils/service_search.dart';
import '../../widgets/app_brand_logo.dart';
import '../../widgets/concierge_entry.dart';

class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  final _api = BuyerApi(ApiClient());
  final _search = TextEditingController();
  final _searchFocus = FocusNode();
  BuyerServiceRequest? _openRequest;
  bool _loadedOpen = false;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _search.addListener(() {
      final next = _search.text;
      if (next == _query) return;
      setState(() => _query = next);
    });
  }

  @override
  void dispose() {
    _search.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loadedOpen) return;
    _loadedOpen = true;
    unawaited(_loadOpenRequest());
  }

  Future<void> _loadOpenRequest() async {
    final customerId = context.read<AuthController>().customerId;
    if (customerId == null || customerId.isEmpty) return;
    try {
      final list = await _api.listServiceRequests(customerId);
      if (!mounted) return;
      setState(() => _openRequest = firstOpenBuyerServiceRequest(list));
    } catch (_) {
      // Catalog still works; create/restart APIs enforce one-at-a-time.
    }
  }

  bool get _isSearching => _query.trim().length >= 2;

  void _clearSearch() {
    _search.clear();
    _searchFocus.unfocus();
  }

  void _guardOpenRequestThen(VoidCallback action) {
    final open = _openRequest;
    if (open != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Only one service can run at a time.')),
      );
      context.go(requestingPathFor(open.id));
      return;
    }
    action();
  }

  void _openCategory(ServiceCategory cat) {
    HapticFeedback.lightImpact();
    _guardOpenRequestThen(() => context.push('/service/${cat.id}'));
  }

  void _openService(ServiceCategory cat, String serviceName) {
    HapticFeedback.lightImpact();
    _guardOpenRequestThen(() {
      context.push(
        '/service/${cat.id}/location?service=${Uri.encodeComponent(serviceName)}',
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final result = searchBuyerServicesCatalog(_query, serviceLimit: 20);
    final matchedCategories =
        result.categories.map((row) => row.category).toList();
    final matchedServices = result.services;
    final urgent = matchedCategories.where((c) => c.priority == 'urgent').toList();
    final rest = matchedCategories.where((c) => c.priority != 'urgent').toList();
    final noMatches =
        _isSearching && matchedServices.isEmpty && matchedCategories.isEmpty;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            const SliverToBoxAdapter(
              child: PageBrandHeader(
                title: 'Services',
                subtitle: 'Roadside and repairs',
              ),
            ),
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(16, 4, 16, 4),
                child: ConciergeAskCard(),
              ),
            ),
            SliverPersistentHeader(
              pinned: true,
              delegate: _PinnedServicesSearchDelegate(
                child: ListenableBuilder(
                  listenable: _searchFocus,
                  builder: (context, _) => _ServicesSearchField(
                    controller: _search,
                    focusNode: _searchFocus,
                    onClear: _query.isEmpty ? null : _clearSearch,
                  ),
                ),
              ),
            ),
            if (_isSearching)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
                  child: Text(
                    () {
                      final q = _query.trim();
                      if (noMatches) return 'No matches for “$q”';
                      final parts = <String>[
                        if (matchedServices.isNotEmpty)
                          '${matchedServices.length} ${matchedServices.length == 1 ? 'service' : 'services'}',
                        if (matchedCategories.isNotEmpty)
                          '${matchedCategories.length} ${matchedCategories.length == 1 ? 'category' : 'categories'}',
                      ];
                      return '${parts.join(' · ')} for “$q”';
                    }(),
                    style: AppTheme.host(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
              ),
            if (_openRequest != null && !_isSearching)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Material(
                    color: AppColors.primarySoft.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(AppRadii.md),
                    child: InkWell(
                      onTap: () =>
                          context.go(requestingPathFor(_openRequest!.id)),
                      borderRadius: BorderRadius.circular(AppRadii.md),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 14, 14, 14),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Active request',
                                    style: AppTheme.host(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primary,
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _openRequest!.service.isEmpty
                                        ? 'Service in progress'
                                        : _openRequest!.service,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppTheme.host(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'One request at a time',
                                    style: AppTheme.host(
                                      fontSize: 12,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.arrow_forward_rounded, size: 20),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            if (noMatches)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(AppRadii.lg),
                      border: Border.all(color: AppColors.borderSoft),
                    ),
                    child: Column(
                      children: [
                        Icon(
                          Icons.search_off_rounded,
                          size: 36,
                          color: AppColors.textMuted.withValues(alpha: 0.8),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'No services match',
                          style: AppTheme.host(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Try towing, tyre, oil change, wash, or tracker.',
                          textAlign: TextAlign.center,
                          style: AppTheme.host(
                            fontSize: 13,
                            color: AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextButton(
                          onPressed: _clearSearch,
                          child: const Text('Clear search'),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else ...[
              if (_isSearching && matchedServices.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                    child: Text(
                      'Matching services',
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
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, i) {
                        final hit = matchedServices[i];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _ServiceHitRow(
                            emoji: hit.category.emoji,
                            serviceName: hit.name,
                            categoryTitle:
                                cleanDisplayTitle(hit.category.title),
                            onTap: () =>
                                _openService(hit.category, hit.name),
                          ),
                        );
                      },
                      childCount: matchedServices.length,
                    ),
                  ),
                ),
              ],
              if (_isSearching && matchedCategories.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(
                      20,
                      matchedServices.isNotEmpty ? 8 : 12,
                      20,
                      10,
                    ),
                    child: Text(
                      'Categories',
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
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      mainAxisExtent: 124,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, i) {
                        final row = result.categories[i];
                        return _ServiceCategoryTile(
                          category: row.category,
                          matchCount: row.matchingServiceCount,
                          onTap: () => _openCategory(row.category),
                        );
                      },
                      childCount: result.categories.length,
                    ),
                  ),
                ),
              ],
              if (!_isSearching) ...[
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
                              onTap: () => _openCategory(cat),
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
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
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
                            onTap: () => _openCategory(cat),
                          );
                        },
                        childCount: rest.length,
                      ),
                    ),
                  ),
                ],
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _PinnedServicesSearchDelegate extends SliverPersistentHeaderDelegate {
  _PinnedServicesSearchDelegate({required this.child});

  final Widget child;

  static const double _height = 68;

  @override
  double get minExtent => _height;

  @override
  double get maxExtent => _height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Material(
      color: AppColors.background,
      elevation: overlapsContent || shrinkOffset > 0 ? 0.5 : 0,
      shadowColor: AppColors.ink.withValues(alpha: 0.08),
      child: Container(
        height: _height,
        alignment: Alignment.center,
        padding: const EdgeInsets.fromLTRB(16, 6, 16, 10),
        decoration: BoxDecoration(
          color: AppColors.background,
          border: Border(
            bottom: BorderSide(
              color: overlapsContent || shrinkOffset > 0
                  ? AppColors.borderSoft
                  : Colors.transparent,
            ),
          ),
        ),
        child: child,
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _PinnedServicesSearchDelegate oldDelegate) {
    return child != oldDelegate.child;
  }
}

class _ServicesSearchField extends StatelessWidget {
  const _ServicesSearchField({
    required this.controller,
    required this.focusNode,
    this.onClear,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.lg),
        border: Border.all(
          color: focusNode.hasFocus
              ? AppColors.primary.withValues(alpha: 0.45)
              : AppColors.border,
          width: focusNode.hasFocus ? 1.5 : 1,
        ),
        boxShadow: focusNode.hasFocus
            ? [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.10),
                  blurRadius: 18,
                  offset: const Offset(0, 6),
                ),
              ]
            : AppTheme.cardShadow,
      ),
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        textInputAction: TextInputAction.search,
        style: AppTheme.host(fontSize: 15.5, fontWeight: FontWeight.w500),
        cursorColor: AppColors.primary,
        decoration: InputDecoration(
          hintText: 'Search towing, oil, battery, wash…',
          hintStyle: AppTheme.host(fontSize: 14.5, color: AppColors.textMuted),
          filled: true,
          fillColor: Colors.transparent,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 4, vertical: 14),
          prefixIcon: const Icon(
            Icons.search_rounded,
            color: AppColors.textMuted,
            size: 22,
          ),
          suffixIcon: onClear == null
              ? null
              : IconButton(
                  tooltip: 'Clear',
                  onPressed: onClear,
                  icon: Container(
                    width: 22,
                    height: 22,
                    decoration: const BoxDecoration(
                      color: AppColors.borderSoft,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close_rounded,
                      size: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
        ),
      ),
    );
  }
}

class _ServiceHitRow extends StatelessWidget {
  const _ServiceHitRow({
    required this.emoji,
    required this.serviceName,
    required this.categoryTitle,
    required this.onTap,
  });

  final String emoji;
  final String serviceName;
  final String categoryTitle;
  final VoidCallback onTap;

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
            border: Border.all(color: AppColors.border),
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
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft.withValues(alpha: 0.65),
                    borderRadius: BorderRadius.circular(AppRadii.sm),
                  ),
                  child: Text(emoji, style: const TextStyle(fontSize: 22)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        serviceName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTheme.host(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        categoryTitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTheme.host(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_rounded,
                  size: 18,
                  color: AppColors.textMuted.withValues(alpha: 0.9),
                ),
              ],
            ),
          ),
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
    this.matchCount,
  });

  final ServiceCategory category;
  final VoidCallback onTap;
  final int? matchCount;

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
                if (matchCount != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    '$matchCount match${matchCount == 1 ? '' : 'es'}',
                    style: AppTheme.host(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
