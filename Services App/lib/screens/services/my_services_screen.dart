import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/listings_api.dart';
import '../../models/service_listing.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../theme/service_accents.dart';
import '../../utils/format.dart';
import '../../utils/listing_search.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/connection_ui.dart';
import '../../widgets/ui.dart';
import 'catalog_services_picker_sheet.dart';
import 'listing_editor_sheet.dart';

enum _StatusFilter { all, active, paused }

class MyServicesScreen extends StatefulWidget {
  const MyServicesScreen({super.key});

  @override
  State<MyServicesScreen> createState() => _MyServicesScreenState();
}

class _MyServicesScreenState extends State<MyServicesScreen> {
  final _api = ListingsApi(ApiClient());
  final _search = TextEditingController();
  final _searchFocus = FocusNode();
  List<ServiceListing> _listings = [];
  bool _loading = true;
  bool _saving = false;
  String? _error;
  bool _offline = false;
  String _query = '';
  _StatusFilter _filter = _StatusFilter.all;
  /// Explicitly expanded categories. Empty = all collapsed by default.
  final Set<String> _expanded = {};

  @override
  void initState() {
    super.initState();
    _search.addListener(() {
      final next = _search.text;
      if (next == _query) return;
      setState(() => _query = next);
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _search.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  bool get _isSearching => _query.trim().length >= 2;

  List<ServiceListing> get _filtered {
    return filterListings(
      _listings,
      query: _isSearching ? _query : '',
      activeOnly: _filter == _StatusFilter.active,
      pausedOnly: _filter == _StatusFilter.paused,
    );
  }

  bool _isExpanded(String categoryId) {
    if (_isSearching) return true;
    return _expanded.contains(categoryId);
  }

  void _toggleExpand(String categoryId) {
    if (_isSearching) return;
    setState(() {
      if (_expanded.contains(categoryId)) {
        _expanded.remove(categoryId);
      } else {
        _expanded.add(categoryId);
      }
    });
  }

  Future<void> _load() async {
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null) return;
    setState(() {
      _loading = true;
      _error = null;
      _offline = false;
    });
    try {
      final list = await _api.list(vendorId);
      if (!mounted) return;
      setState(() {
        _listings = list;
        _loading = false;
        _offline = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (isTransientNetworkError(e)) {
          _offline = true;
          _error = null;
        } else if (_listings.isEmpty) {
          _error = userFacingError(e, fallback: 'Could not load services right now.');
        }
      });
    }
  }

  Future<void> _openCatalogPicker() async {
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null || _saving) return;
    final result = await showModalBottomSheet<CatalogPickerResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CatalogServicesPickerSheet(existing: _listings),
    );
    if (result == null || !mounted || result.isEmpty) return;

    setState(() => _saving = true);
    try {
      if (result.toUpsert.isNotEmpty) {
        await _api.upsert(vendorId: vendorId, listings: result.toUpsert);
      }
      for (final id in result.toDeleteIds) {
        await _api.delete(vendorId: vendorId, listingId: id);
      }
      if (!mounted) return;
      final added = result.toUpsert.length;
      final removed = result.toDeleteIds.length;
      final parts = <String>[
        if (added > 0) '$added added',
        if (removed > 0) '$removed removed',
      ];
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(parts.isEmpty ? 'Services updated' : 'Services updated · ${parts.join(', ')}')),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not update services.'))),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _editOptions(ServiceListing existing) async {
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null || _saving) return;
    final draft = await showModalBottomSheet<ServiceListing>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ListingEditorSheet(initial: existing),
    );
    if (draft == null || !mounted) return;
    setState(() => _saving = true);
    try {
      await _api.upsert(vendorId: vendorId, listings: [draft]);
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not save service.'))),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _toggleActive(ServiceListing listing) async {
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null || _saving) return;
    HapticFeedback.selectionClick();
    final next = listing.copyWith(status: listing.isActive ? 'paused' : 'active');
    setState(() {
      _saving = true;
      _listings = [
        for (final l in _listings) if (l.id == listing.id) next else l,
      ];
    });
    try {
      await _api.upsert(vendorId: vendorId, listings: [next]);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not update status.'))),
      );
      await _load();
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete(ServiceListing listing) async {
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null || _saving) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove service?'),
        content: Text('Remove “${listing.serviceName}” from your offerings.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Remove')),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _saving = true);
    try {
      await _api.delete(vendorId: vendorId, listingId: listing.id);
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not remove service.'))),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    final groups = groupListingsByCategory(filtered);
    final activeCount = _listings.where((l) => l.isActive).length;
    final pausedCount = _listings.length - activeCount;
    final categoryCount = groupListingsByCategory(_listings).length;
    final subtitle = _listings.isEmpty
        ? 'Offer what buyers browse for'
        : '$activeCount active · $categoryCount ${categoryCount == 1 ? 'bundle' : 'bundles'} · prices by MyGarage';

    return PageScaffold(
      title: 'Services',
      subtitle: subtitle,
      actions: [
        SoftIconButton(
          icon: Icons.add_rounded,
          tooltip: 'Manage services',
          onPressed: _saving ? () {} : _openCatalogPicker,
        ),
        const SizedBox(width: 12),
      ],
      floatingActionButton: _listings.isEmpty
          ? null
          : FloatingActionButton.extended(
              onPressed: _saving ? null : _openCatalogPicker,
              icon: const Icon(Icons.playlist_add_rounded),
              label: const Text('Manage'),
            ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _load,
        child: _loading
            ? ListView(
                children: const [
                  SizedBox(height: 120),
                  Center(child: CircularProgressIndicator()),
                ],
              )
            : _offline && _listings.isEmpty
                ? ListView(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 110),
                    children: [
                      OfflineBanner(onRetry: _load),
                      const SizedBox(height: 24),
                      const AnimatedWaitingState(
                        title: 'Services will load later',
                        subtitle: 'Reconnect and pull to refresh your listings.',
                      ),
                    ],
                  )
                : _error != null && _listings.isEmpty
                    ? ListView(
                        children: [
                          EmptyState(
                            title: 'Could not load services',
                            subtitle: _error,
                            icon: Icons.handyman_outlined,
                            action: OutlinedButton(onPressed: _load, child: const Text('Retry')),
                          ),
                        ],
                      )
                    : _listings.isEmpty
                        ? ListView(
                            padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
                            children: [
                              const _EmptyOfferingsIntro(),
                              const SizedBox(height: 20),
                              ElevatedButton(
                                onPressed: _saving ? null : _openCatalogPicker,
                                child: const Text('Choose services to offer'),
                              ),
                            ],
                          )
                        : ListView(
                            padding: const EdgeInsets.fromLTRB(20, 4, 20, 120),
                            children: [
                              if (_offline) ...[
                                OfflineBanner(onRetry: _load),
                                const SizedBox(height: 12),
                              ],
                              _SummaryStrip(
                                total: _listings.length,
                                active: activeCount,
                                paused: pausedCount,
                                bundles: categoryCount,
                              ),
                              const SizedBox(height: 14),
                              _SearchField(
                                controller: _search,
                                focusNode: _searchFocus,
                                matchCount: _isSearching ? filtered.length : null,
                                onClear: _query.isEmpty
                                    ? null
                                    : () {
                                        _search.clear();
                                        setState(() => _query = '');
                                      },
                              ),
                              const SizedBox(height: 12),
                              _FilterChips(
                                filter: _filter,
                                onChanged: (f) => setState(() => _filter = f),
                              ),
                              if (!_isSearching && groups.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton(
                                    onPressed: () {
                                      setState(() {
                                        if (_expanded.length >= groups.length) {
                                          _expanded.clear();
                                        } else {
                                          _expanded
                                            ..clear()
                                            ..addAll(groups.map((g) => g.category.id));
                                        }
                                      });
                                    },
                                    child: Text(
                                      _expanded.length >= groups.length ? 'Collapse all' : 'Expand all',
                                      style: AppTheme.host(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ),
                                ),
                              ] else
                                const SizedBox(height: 8),
                              if (filtered.isEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 36),
                                  child: EmptyState(
                                    title: 'No matches',
                                    subtitle: 'Try another search or clear filters.',
                                    icon: Icons.search_off_rounded,
                                    action: TextButton(
                                      onPressed: () {
                                        _search.clear();
                                        setState(() {
                                          _query = '';
                                          _filter = _StatusFilter.all;
                                        });
                                      },
                                      child: const Text('Clear filters'),
                                    ),
                                  ),
                                )
                              else
                                for (final group in groups) ...[
                                  const SizedBox(height: 10),
                                  _CategoryBundle(
                                    category: group.category,
                                    listings: group.listings,
                                    catalogCount: catalogServiceNamesFor(group.category.id).length,
                                    expanded: _isExpanded(group.category.id),
                                    onToggleExpand: () => _toggleExpand(group.category.id),
                                    onEdit: _editOptions,
                                    onToggleActive: _toggleActive,
                                    onDelete: _delete,
                                  ),
                                ],
                            ],
                          ),
      ),
    );
  }
}

class _SummaryStrip extends StatelessWidget {
  const _SummaryStrip({
    required this.total,
    required this.active,
    required this.paused,
    required this.bundles,
  });

  final int total;
  final int active;
  final int paused;
  final int bundles;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.lg),
        border: Border.all(color: AppColors.border),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Row(
        children: [
          _Stat(label: 'Offered', value: '$total'),
          _divider(),
          _Stat(label: 'Active', value: '$active', emphasize: true),
          _divider(),
          _Stat(label: 'Paused', value: '$paused'),
          _divider(),
          _Stat(label: 'Bundles', value: '$bundles'),
        ],
      ),
    );
  }

  Widget _divider() => Container(
        width: 1,
        height: 28,
        margin: const EdgeInsets.symmetric(horizontal: 8),
        color: AppColors.borderSoft,
      );
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, this.emphasize = false});

  final String label;
  final String value;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: AppTheme.host(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: emphasize ? AppColors.primary : AppColors.textPrimary,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTheme.host(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({
    required this.controller,
    this.focusNode,
    this.onClear,
    this.matchCount,
  });

  final TextEditingController controller;
  final FocusNode? focusNode;
  final VoidCallback? onClear;
  final int? matchCount;

  @override
  Widget build(BuildContext context) {
    final hint = matchCount == null
        ? 'Search to find, edit, or pause services…'
        : '$matchCount ${matchCount == 1 ? 'match' : 'matches'}';
    return TextField(
      controller: controller,
      focusNode: focusNode,
      textInputAction: TextInputAction.search,
      style: AppTheme.host(fontSize: 15, fontWeight: FontWeight.w500),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: AppTheme.host(fontSize: 14.5, color: AppColors.textMuted),
        filled: true,
        fillColor: AppColors.surface,
        prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textMuted),
        suffixIcon: onClear == null
            ? null
            : IconButton(
                tooltip: 'Clear',
                onPressed: onClear,
                icon: const Icon(Icons.close_rounded, size: 18),
              ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.lg),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.lg),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.lg),
          borderSide: BorderSide(color: AppColors.primary.withValues(alpha: 0.55), width: 1.5),
        ),
      ),
    );
  }
}

class _FilterChips extends StatelessWidget {
  const _FilterChips({required this.filter, required this.onChanged});

  final _StatusFilter filter;
  final ValueChanged<_StatusFilter> onChanged;

  @override
  Widget build(BuildContext context) {
    Widget chip(_StatusFilter value, String label) {
      final selected = filter == value;
      return FilterChip(
        selected: selected,
        label: Text(label),
        onSelected: (_) => onChanged(value),
        showCheckmark: false,
        selectedColor: AppColors.primarySoft,
        backgroundColor: AppColors.surface,
        side: BorderSide(color: selected ? AppColors.primary.withValues(alpha: 0.35) : AppColors.border),
        labelStyle: AppTheme.host(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: selected ? AppColors.primaryDeep : AppColors.textSecondary,
        ),
      );
    }

    return Wrap(
      spacing: 8,
      children: [
        chip(_StatusFilter.all, 'All'),
        chip(_StatusFilter.active, 'Active'),
        chip(_StatusFilter.paused, 'Paused'),
      ],
    );
  }
}

class _EmptyOfferingsIntro extends StatelessWidget {
  const _EmptyOfferingsIntro();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Offer services the way buyers browse them',
          style: AppTheme.host(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Pick from the same category bundles customers see — Emergency Help, Fix My Car, Wash, and more.',
          style: AppTheme.host(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final cat in kServiceCategories.take(6))
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: accentForCategory(cat.id).fill,
                  borderRadius: BorderRadius.circular(AppRadii.md),
                  border: Border.all(color: accentForCategory(cat.id).border),
                ),
                child: Text(
                  '${cat.emoji}  ${cat.title}',
                  style: AppTheme.host(fontSize: 12.5, fontWeight: FontWeight.w600),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _CategoryBundle extends StatelessWidget {
  const _CategoryBundle({
    required this.category,
    required this.listings,
    required this.catalogCount,
    required this.expanded,
    required this.onToggleExpand,
    required this.onEdit,
    required this.onToggleActive,
    required this.onDelete,
  });

  final ServiceCategoryOption category;
  final List<ServiceListing> listings;
  final int catalogCount;
  final bool expanded;
  final VoidCallback onToggleExpand;
  final ValueChanged<ServiceListing> onEdit;
  final ValueChanged<ServiceListing> onToggleActive;
  final ValueChanged<ServiceListing> onDelete;

  @override
  Widget build(BuildContext context) {
    final accent = accentForCategory(category.id);
    final active = listings.where((l) => l.isActive).length;
    final coverage = catalogCount > 0 ? '$active of ${listings.length} active' : '$active active';
    final catalogHint =
        catalogCount > 0 ? ' · ${listings.length}/$catalogCount in catalog' : '';

    return Container(
      decoration: BoxDecoration(
        color: category.isUrgent ? accent.fill : AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.xl),
        border: Border.all(
          color: category.isUrgent ? accent.border : AppColors.border,
        ),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        children: [
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onToggleExpand,
              borderRadius: BorderRadius.vertical(
                top: const Radius.circular(AppRadii.xl),
                bottom: Radius.circular(expanded ? 0 : AppRadii.xl),
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 10, 14),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: accent.iconBg,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(category.emoji, style: const TextStyle(fontSize: 22)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              if (category.isUrgent) ...[
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: accent.accent.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(AppRadii.pill),
                                  ),
                                  child: Text(
                                    'Priority',
                                    style: AppTheme.host(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: accent.accent,
                                      letterSpacing: 0.2,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                              ],
                              Expanded(
                                child: Text(
                                  category.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTheme.host(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: -0.25,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            category.useWhen,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$coverage$catalogHint',
                            style: AppTheme.host(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      expanded ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                      color: AppColors.textMuted,
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (expanded) ...[
            Divider(height: 1, color: accent.border.withValues(alpha: 0.6)),
            for (var i = 0; i < listings.length; i++) ...[
              _ServiceRow(
                listing: listings[i],
                onEdit: () => onEdit(listings[i]),
                onToggleActive: () => onToggleActive(listings[i]),
                onDelete: () => onDelete(listings[i]),
              ),
              if (i < listings.length - 1)
                const Divider(height: 1, indent: 16, endIndent: 16, color: AppColors.borderSoft),
            ],
          ],
        ],
      ),
    );
  }
}

class _ServiceRow extends StatelessWidget {
  const _ServiceRow({
    required this.listing,
    required this.onEdit,
    required this.onToggleActive,
    required this.onDelete,
  });

  final ServiceListing listing;
  final VoidCallback onEdit;
  final VoidCallback onToggleActive;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final meta = [
      formatUgx(listing.priceUgx),
      if (listing.etaMinutes != null) '${listing.etaMinutes} min',
      if (listing.mobileAvailable) 'Mobile',
      if (listing.emergency) 'Emergency',
    ].join(' · ');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onEdit,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 6, 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      listing.serviceName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTheme.host(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w600,
                        color: listing.isActive ? AppColors.textPrimary : AppColors.textMuted,
                        letterSpacing: -0.15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      meta,
                      style: AppTheme.host(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              StatusPill(
                label: listing.isActive ? 'Active' : 'Paused',
                color: listing.isActive ? AppColors.success : AppColors.textMuted,
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert_rounded, color: AppColors.textMuted, size: 20),
                onSelected: (v) {
                  if (v == 'edit') onEdit();
                  if (v == 'toggle') onToggleActive();
                  if (v == 'delete') onDelete();
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(value: 'edit', child: Text('Edit options')),
                  PopupMenuItem(
                    value: 'toggle',
                    child: Text(listing.isActive ? 'Pause' : 'Activate'),
                  ),
                  const PopupMenuItem(value: 'delete', child: Text('Remove')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
