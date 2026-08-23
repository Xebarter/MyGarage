import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../models/models.dart';
import '../../providers/cart_controller.dart';
import '../../providers/shop_catalog_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/product_search.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/app_brand_logo.dart';
import 'shop_browse_menu.dart';

class ShopScreen extends StatefulWidget {
  const ShopScreen({super.key});

  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> {
  final _api = BuyerApi(ApiClient());
  final _search = TextEditingController();
  final _focus = FocusNode();
  final _searchFieldKey = GlobalKey();

  List<Product> _catalog = [];
  List<Product> _visible = [];
  List<String> _categories = [];
  List<ShopCategoryNode> _categoryTree = [];
  String? _activeCategory;
  String _query = '';

  bool _loading = false;
  bool _suggestionsLoading = false;
  bool _panelOpen = false;
  String? _error;
  bool _catalogBound = false;
  ShopCatalogController? _shopCatalog;

  ShopSearchSuggestions? _suggestions;
  Timer? _suggestionsDebounce;
  int _suggestionsSeq = 0;

  @override
  void initState() {
    super.initState();
    _search.addListener(_onSearchTextChanged);
    _focus.addListener(_onFocusChanged);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_catalogBound) return;
    _catalogBound = true;
    final catalog = context.read<ShopCatalogController>();
    _shopCatalog = catalog;
    catalog.addListener(_onCatalogChanged);
    _syncFromCatalog(catalog);
    // ignore: discarded_futures
    catalog.ensureReady();
  }

  @override
  void dispose() {
    _shopCatalog?.removeListener(_onCatalogChanged);
    _suggestionsDebounce?.cancel();
    _search.removeListener(_onSearchTextChanged);
    _focus.removeListener(_onFocusChanged);
    _search.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onCatalogChanged() {
    final catalog = _shopCatalog;
    if (!mounted || catalog == null) return;
    _syncFromCatalog(catalog);
  }

  void _syncFromCatalog(ShopCatalogController catalog) {
    setState(() {
      _catalog = catalog.products;
      _categoryTree = catalog.categoryTree;
      _categories = catalogCategories(_catalog);
      _loading = catalog.showBlockingLoader;
      if (catalog.hasProducts) {
        _error = null;
      } else if (catalog.error != null && !catalog.networkLoading) {
        _error = userFacingError(
          Exception(catalog.error),
          fallback: 'Could not load products.',
        );
      }
      _recomputeVisible();
    });
  }

  void _onFocusChanged() {
    final open = _focus.hasFocus && _query.trim().length >= 2;
    if (open != _panelOpen) {
      setState(() => _panelOpen = open);
    }
    if (open && _suggestions == null && !_suggestionsLoading) {
      _scheduleSuggestions(_query.trim());
    }
  }

  void _onSearchTextChanged() {
    final q = _search.text;
    final normalized = q.trim();
    setState(() {
      _query = q;
      _recomputeVisible();
      _panelOpen = _focus.hasFocus && normalized.length >= 2;
      if (normalized.length < 2) {
        _suggestions = null;
        _suggestionsLoading = false;
      }
    });
    if (normalized.length >= 2) {
      _scheduleSuggestions(normalized);
    }
  }

  void _recomputeVisible() {
    _visible = filterProducts(
      _catalog,
      query: _query,
      category: _activeCategory,
    );
  }

  void _scheduleSuggestions(String q) {
    _suggestionsDebounce?.cancel();
    _suggestionsDebounce = Timer(const Duration(milliseconds: 220), () {
      unawaited(_fetchSuggestions(q));
    });
  }

  Future<void> _fetchSuggestions(String q) async {
    if (q.trim().length < 2) return;
    final seq = ++_suggestionsSeq;
    setState(() => _suggestionsLoading = true);
    try {
      final data = await _api.searchSuggestions(q.trim());
      if (!mounted || seq != _suggestionsSeq) return;
      if (_search.text.trim() != q.trim()) return;
      setState(() {
        _suggestions = data;
        _suggestionsLoading = false;
      });
    } catch (_) {
      if (!mounted || seq != _suggestionsSeq) return;
      setState(() {
        _suggestions = null;
        _suggestionsLoading = false;
      });
    }
  }

  Future<void> _load() async {
    await (_shopCatalog ?? context.read<ShopCatalogController>()).refresh(force: true);
  }

  Future<List<ShopCategoryNode>> _reloadCategoryTree() {
    return (_shopCatalog ?? context.read<ShopCatalogController>()).reloadCategoryTree();
  }

  void _openBrowseMenu() {
    _focus.unfocus();
    setState(() => _panelOpen = false);
    showShopBrowseMenu(
      context,
      tree: _categoryTree,
      onReloadTree: _reloadCategoryTree,
      onShopAll: () {
        _clearSearch();
        _selectCategory(null);
      },
    );
  }

  void _applyQuery(String value, {bool submit = false}) {
    final next = value.trim();
    _search.value = TextEditingValue(
      text: next,
      selection: TextSelection.collapsed(offset: next.length),
    );
    setState(() {
      _query = next;
      if (submit) _activeCategory = null;
      _recomputeVisible();
      _panelOpen = false;
    });
    _focus.unfocus();
  }

  void _clearSearch() {
    _search.clear();
    setState(() {
      _query = '';
      _suggestions = null;
      _panelOpen = false;
      _recomputeVisible();
    });
  }

  void _selectCategory(String? category) {
    setState(() {
      _activeCategory = category;
      _recomputeVisible();
      _panelOpen = false;
    });
    _focus.unfocus();
  }

  void _openProduct(Product product) {
    setState(() => _panelOpen = false);
    _focus.unfocus();
    context.push('/product/${product.id}', extra: product);
  }

  Future<void> _addToCart(Product product) async {
    final cart = context.read<CartController>();
    final wasEmpty = cart.quantityOf(product.id) == 0;
    await cart.add(product);
    if (!mounted) return;
    HapticFeedback.lightImpact();
    if (!wasEmpty) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          content: Text(
            '${product.name} added to cart',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(milliseconds: 1600),
          action: SnackBarAction(
            label: 'View',
            onPressed: () => context.go('/cart'),
          ),
        ),
      );
  }

  Future<void> _adjustCartQuantity(Product product, int nextQty) async {
    final cart = context.read<CartController>();
    HapticFeedback.selectionClick();
    if (nextQty <= 0) {
      await cart.remove(product.id);
    } else {
      await cart.setQuantity(product.id, nextQty);
    }
  }

  void _openCategory(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;
    setState(() => _panelOpen = false);
    _focus.unfocus();
    context.push('/shop/category/${Uri.encodeComponent(trimmed)}');
  }

  bool get _hasActiveFilters =>
      _query.trim().isNotEmpty || (_activeCategory != null && _activeCategory!.isNotEmpty);

  static const double _searchHeaderHeight = 72;

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);
    final qTrim = _query.trim();
    // So product-card qty UI updates when cart changes.
    final cart = context.watch<CartController>();

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Stack(
        clipBehavior: Clip.none,
        children: [
          RefreshIndicator(
            onRefresh: _load,
            // Offset past floating app bar + pinned search when pulling.
            edgeOffset: _searchHeaderHeight,
            child: CustomScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                _buildTitleSliver(),
                _buildPinnedSearchSliver(),
                if (!_loading && _error == null) ...[
                  SliverToBoxAdapter(
                    child: _CategoryChips(
                      categories: _categories,
                      active: _activeCategory,
                      onSelected: _selectCategory,
                      onBrowseMenu: _openBrowseMenu,
                    ),
                  ),
                  // Need bottom padding after chips which had top padding only
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              _resultLabel(qTrim),
                              style: AppTheme.host(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ),
                          if (_suggestionsLoading && _panelOpen)
                            const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
                ..._buildBodySlivers(money, cart),
              ],
            ),
          ),
            if (_panelOpen)
            Positioned(
              left: 16,
              right: 16,
              top: _searchHeaderHeight,
              child: _SuggestionsPanel(
                loading: _suggestionsLoading,
                suggestions: _suggestions,
                catalogFallback: _visible.take(6).toList(),
                query: qTrim,
                money: money,
                onDismiss: () => setState(() => _panelOpen = false),
                onCategory: _openCategory,
                onProduct: _openProduct,
                onSeeAll: () => _applyQuery(qTrim, submit: true),
              ),
            ),
        ],
        ),
      ),
    );
  }

  Widget _buildTitleSliver() {
    return SliverAppBar(
      floating: true,
      snap: true,
      pinned: false,
      centerTitle: true,
      elevation: 0,
      scrolledUnderElevation: 0,
      backgroundColor: AppColors.background,
      surfaceTintColor: Colors.transparent,
      title: const AppBarTitle('Shop'),
      actions: [
        if (_hasActiveFilters)
          TextButton(
            onPressed: () {
              _clearSearch();
              _selectCategory(null);
            },
            child: const Text('Reset'),
          ),
      ],
    );
  }

  Widget _buildPinnedSearchSliver() {
    return SliverPersistentHeader(
      pinned: true,
      delegate: _PinnedSearchHeaderDelegate(
        height: _searchHeaderHeight,
        child: ListenableBuilder(
          listenable: _focus,
          builder: (context, _) => _ShopSearchField(
            fieldKey: _searchFieldKey,
            controller: _search,
            focusNode: _focus,
            onSubmitted: (v) => _applyQuery(v, submit: true),
            onClear: _query.isEmpty ? null : _clearSearch,
          ),
        ),
      ),
    );
  }

  String _resultLabel(String qTrim) {
    final n = _visible.length;
    final count = n == 1 ? '1 product' : '$n products';
    if (qTrim.isNotEmpty && _activeCategory != null) {
      return '$count for “$qTrim” in ${_activeCategory!}';
    }
    if (qTrim.isNotEmpty) return '$count for “$qTrim”';
    if (_activeCategory != null) return '$count in ${_activeCategory!}';
    return count;
  }

  List<Widget> _buildBodySlivers(NumberFormat money, CartController cart) {
    if (_loading) {
      return [
        const SliverFillRemaining(
          hasScrollBody: false,
          child: Center(child: CircularProgressIndicator()),
        ),
      ];
    }
    if (_error != null) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: Center(
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
          ),
        ),
      ];
    }
    if (_visible.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      borderRadius: BorderRadius.circular(AppRadii.lg),
                    ),
                    child: const Icon(Icons.search_off_rounded, color: AppColors.primary, size: 30),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _hasActiveFilters ? 'No matches' : 'No products yet',
                    style: AppTheme.host(fontSize: 17, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _hasActiveFilters
                        ? 'Try a different keyword or clear filters.'
                        : 'Check back soon for parts and accessories.',
                    textAlign: TextAlign.center,
                    style: AppTheme.host(fontSize: 13.5, color: AppColors.textMuted, height: 1.4),
                  ),
                  if (_hasActiveFilters) ...[
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: () {
                        _clearSearch();
                        _selectCategory(null);
                      },
                      child: const Text('Clear search'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ];
    }

    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 0.72,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, i) {
              final p = _visible[i];
              final qty = cart.quantityOf(p.id);
              return _ProductCard(
                product: p,
                priceLabel: money.format(p.price),
                quantity: qty,
                onTap: () => _openProduct(p),
                onAdd: () => _addToCart(p),
                onRemove: () => _adjustCartQuantity(p, qty - 1),
              );
            },
            childCount: _visible.length,
          ),
        ),
      ),
    ];
  }
}

class _PinnedSearchHeaderDelegate extends SliverPersistentHeaderDelegate {
  _PinnedSearchHeaderDelegate({
    required this.height,
    required this.child,
  });

  final double height;
  final Widget child;

  @override
  double get minExtent => height;

  @override
  double get maxExtent => height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Material(
      color: AppColors.background,
      elevation: overlapsContent || shrinkOffset > 0 ? 0.5 : 0,
      shadowColor: AppColors.ink.withValues(alpha: 0.08),
      child: Container(
        height: height,
        alignment: Alignment.center,
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
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
  bool shouldRebuild(covariant _PinnedSearchHeaderDelegate oldDelegate) {
    return height != oldDelegate.height || child != oldDelegate.child;
  }
}

class _ShopSearchField extends StatelessWidget {
  const _ShopSearchField({
    required this.fieldKey,
    required this.controller,
    required this.focusNode,
    required this.onSubmitted,
    this.onClear,
  });

  final Key fieldKey;
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onSubmitted;
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
          color: focusNode.hasFocus ? AppColors.primary.withValues(alpha: 0.45) : AppColors.border,
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
        key: fieldKey,
        controller: controller,
        focusNode: focusNode,
        textInputAction: TextInputAction.search,
        onSubmitted: onSubmitted,
        style: AppTheme.host(fontSize: 15.5, fontWeight: FontWeight.w500),
        cursorColor: AppColors.primary,
        decoration: InputDecoration(
          hintText: 'Search parts, brands, categories…',
          hintStyle: AppTheme.host(fontSize: 14.5, color: AppColors.textMuted),
          filled: true,
          fillColor: Colors.transparent,
          contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 14),
          prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textMuted, size: 22),
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
                    child: const Icon(Icons.close_rounded, size: 14, color: AppColors.textSecondary),
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

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({
    required this.categories,
    required this.active,
    required this.onSelected,
    required this.onBrowseMenu,
  });

  final List<String> categories;
  final String? active;
  final ValueChanged<String?> onSelected;
  final VoidCallback onBrowseMenu;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 10, 0, 0),
      child: Row(
        children: [
          _BrowseHamburgerButton(onPressed: onBrowseMenu),
          const SizedBox(width: 8),
          Expanded(
            child: SizedBox(
              height: 40,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.only(right: 16),
                itemCount: categories.length + 1,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  if (i == 0) {
                    return _Chip(
                      label: 'All',
                      selected: active == null,
                      onTap: () => onSelected(null),
                    );
                  }
                  final name = categories[i - 1];
                  return _Chip(
                    label: name,
                    selected: active == name,
                    onTap: () => onSelected(active == name ? null : name),
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

class _BrowseHamburgerButton extends StatelessWidget {
  const _BrowseHamburgerButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Browse categories',
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.sm),
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(AppRadii.sm),
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadii.sm),
              border: Border.all(color: AppColors.border),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.menu_rounded, size: 22, color: AppColors.textPrimary),
          ),
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.primary : AppColors.surface,
      borderRadius: BorderRadius.circular(AppRadii.pill),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.pill),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.border,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: AppTheme.host(
              fontSize: 13,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: selected ? Colors.white : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

class _SuggestionsPanel extends StatelessWidget {
  const _SuggestionsPanel({
    required this.loading,
    required this.suggestions,
    required this.catalogFallback,
    required this.query,
    required this.money,
    required this.onDismiss,
    required this.onCategory,
    required this.onProduct,
    required this.onSeeAll,
  });

  final bool loading;
  final ShopSearchSuggestions? suggestions;
  final List<Product> catalogFallback;
  final String query;
  final NumberFormat money;
  final VoidCallback onDismiss;
  final ValueChanged<String> onCategory;
  final ValueChanged<Product> onProduct;
  final VoidCallback onSeeAll;

  @override
  Widget build(BuildContext context) {
    final cats = suggestions?.categories ?? const <ShopCategorySuggestion>[];
    final products = (suggestions?.products.isNotEmpty ?? false)
        ? suggestions!.products
        : catalogFallback;
    final empty = !loading && cats.isEmpty && products.isEmpty;

    return Material(
      elevation: 12,
      shadowColor: AppColors.ink.withValues(alpha: 0.18),
      borderRadius: BorderRadius.circular(AppRadii.lg),
      color: AppColors.surface,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * 0.48,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 8, 4),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Suggestions',
                      style: AppTheme.host(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textMuted,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    onPressed: onDismiss,
                    icon: const Icon(Icons.keyboard_arrow_up_rounded, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            if (loading && (suggestions == null || suggestions!.isEmpty))
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 28),
                child: SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.2),
                ),
              )
            else if (empty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
                child: Text(
                  'No suggestions for “$query”',
                  style: AppTheme.host(fontSize: 13.5, color: AppColors.textMuted),
                ),
              )
            else
              Flexible(
                child: ListView(
                  shrinkWrap: true,
                  padding: const EdgeInsets.only(bottom: 8),
                  children: [
                    if (cats.isNotEmpty) ...[
                      ...cats.map(
                        (c) => ListTile(
                          dense: true,
                          leading: CircleAvatar(
                            radius: 18,
                            backgroundColor: AppColors.primarySoft,
                            backgroundImage:
                                c.image.isNotEmpty ? NetworkImage(c.image) : null,
                            child: c.image.isEmpty
                                ? const Icon(Icons.grid_view_rounded,
                                    size: 16, color: AppColors.primary)
                                : null,
                          ),
                          title: Text(
                            c.headline.isNotEmpty ? c.headline : c.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTheme.host(fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                          subtitle: Text(
                            c.count == 1 ? '1 product' : '${c.count} products',
                            style: AppTheme.host(fontSize: 12, color: AppColors.textMuted),
                          ),
                          trailing: const Icon(Icons.north_west_rounded,
                              size: 16, color: AppColors.textMuted),
                          onTap: () => onCategory(c.name),
                        ),
                      ),
                      if (products.isNotEmpty)
                        const Divider(height: 12, indent: 16, endIndent: 16),
                    ],
                    ...products.map(
                      (p) => ListTile(
                        dense: true,
                        leading: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SizedBox(
                            width: 40,
                            height: 40,
                            child: p.image.isNotEmpty
                                ? Image.network(
                                    p.image,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const ColoredBox(
                                      color: AppColors.surfaceMuted,
                                      child: Icon(Icons.inventory_2_outlined, size: 18),
                                    ),
                                  )
                                : const ColoredBox(
                                    color: AppColors.surfaceMuted,
                                    child: Icon(Icons.inventory_2_outlined, size: 18),
                                  ),
                          ),
                        ),
                        title: Text(
                          p.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTheme.host(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        subtitle: Text(
                          [
                            if (p.brand.isNotEmpty) p.brand,
                            if (p.category.isNotEmpty) p.category,
                          ].join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTheme.host(fontSize: 12, color: AppColors.textMuted),
                        ),
                        trailing: Text(
                          money.format(p.price),
                          style: AppTheme.host(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                        onTap: () => onProduct(p),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
                      child: TextButton(
                        onPressed: onSeeAll,
                        child: Text(
                          'See all results for “$query”',
                          style: AppTheme.host(
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
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

class _ProductCard extends StatelessWidget {
  const _ProductCard({
    required this.product,
    required this.priceLabel,
    required this.quantity,
    required this.onTap,
    required this.onAdd,
    required this.onRemove,
  });

  final Product product;
  final String priceLabel;
  final int quantity;
  final VoidCallback onTap;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 0,
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadii.md),
        side: const BorderSide(color: AppColors.borderSoft),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  product.image.isNotEmpty
                      ? Image.network(
                          product.image,
                          fit: BoxFit.cover,
                          gaplessPlayback: true,
                          errorBuilder: (_, __, ___) => const ColoredBox(
                            color: AppColors.surfaceMuted,
                            child: Icon(Icons.image_not_supported),
                          ),
                        )
                      : const ColoredBox(
                          color: AppColors.surfaceMuted,
                          child: Icon(Icons.inventory_2_outlined),
                        ),
                  // Soft fade so the control stays readable on bright photos.
                  const Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 44,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Color(0x00000000),
                            Color(0x1A0B1220),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    right: 8,
                    bottom: 8,
                    child: _CartAddControl(
                      quantity: quantity,
                      onAdd: onAdd,
                      onRemove: onRemove,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 11),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppTheme.host(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    priceLabel,
                    style: AppTheme.host(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
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

/// Compact + control that expands into a − / qty / + stepper once in cart.
class _CartAddControl extends StatelessWidget {
  const _CartAddControl({
    required this.quantity,
    required this.onAdd,
    required this.onRemove,
  });

  final int quantity;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final inCart = quantity > 0;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      height: 34,
      decoration: BoxDecoration(
        color: inCart ? AppColors.primary : AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(
          color: inCart ? AppColors.primary : AppColors.border,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.ink.withValues(alpha: inCart ? 0.18 : 0.10),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: inCart
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _CartIconHit(
                    icon: Icons.remove_rounded,
                    color: Colors.white,
                    onTap: onRemove,
                    tooltip: 'Remove one',
                  ),
                  ConstrainedBox(
                    constraints: const BoxConstraints(minWidth: 22),
                    child: Text(
                      '$quantity',
                      textAlign: TextAlign.center,
                      style: AppTheme.host(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  _CartIconHit(
                    icon: Icons.add_rounded,
                    color: Colors.white,
                    onTap: onAdd,
                    tooltip: 'Add one',
                  ),
                ],
              )
            : _CartIconHit(
                icon: Icons.add_rounded,
                color: AppColors.primary,
                onTap: onAdd,
                tooltip: 'Add to cart',
                size: 34,
              ),
      ),
    );
  }
}

class _CartIconHit extends StatelessWidget {
  const _CartIconHit({
    required this.icon,
    required this.color,
    required this.onTap,
    required this.tooltip,
    this.size = 32,
  });

  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final String tooltip;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: SizedBox(
            width: size,
            height: size,
            child: Icon(icon, size: 20, color: color),
          ),
        ),
      ),
    );
  }
}
