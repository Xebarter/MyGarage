import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/listings_api.dart';
import '../../models/service_listing.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../theme/service_accents.dart';
import '../../utils/format.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/connection_ui.dart';
import '../../widgets/ui.dart';
import 'catalog_services_picker_sheet.dart';
import 'listing_editor_sheet.dart';

class MyServicesScreen extends StatefulWidget {
  const MyServicesScreen({super.key});

  @override
  State<MyServicesScreen> createState() => _MyServicesScreenState();
}

class _MyServicesScreenState extends State<MyServicesScreen> {
  final _api = ListingsApi(ApiClient());
  List<ServiceListing> _listings = [];
  bool _loading = true;
  bool _saving = false;
  String? _error;
  bool _offline = false;

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
    final activeCount = _listings.where((l) => l.isActive).length;
    final subtitle = _listings.isEmpty
        ? 'Prices set by MyGarage'
        : '$activeCount active · prices set by MyGarage';

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
                            children: [
                              EmptyState(
                                title: 'No services listed',
                                subtitle: 'Add what you offer so customers and dispatch can find you.',
                                icon: Icons.handyman_outlined,
                                action: ElevatedButton(
                                  onPressed: _saving ? null : _openCatalogPicker,
                                  child: const Text('Choose services'),
                                ),
                              ),
                            ],
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
                            itemCount: _listings.length + (_offline ? 1 : 0),
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (context, i) {
                              if (_offline) {
                                if (i == 0) return OfflineBanner(onRetry: _load);
                                i -= 1;
                              }
                              final item = _listings[i];
                              return _ServiceRow(
                                listing: item,
                                onEdit: () => _editOptions(item),
                                onDelete: () => _delete(item),
                              );
                            },
                          ),
      ),
    );
  }
}

class _ServiceRow extends StatelessWidget {
  const _ServiceRow({
    required this.listing,
    required this.onEdit,
    required this.onDelete,
  });

  final ServiceListing listing;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final accent = accentForCategory(listing.categoryId, seed: listing.serviceName.hashCode);
    final catTitle = categoryTitle(listing.categoryId);
    final icon = iconForCategory(listing.categoryId);
    final meta = [
      formatUgx(listing.priceUgx),
      if (listing.etaMinutes != null) '${listing.etaMinutes} min',
      if (listing.mobileAvailable) 'Mobile',
    ].join(' · ');

    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppRadii.lg),
      child: InkWell(
        onTap: onEdit,
        borderRadius: BorderRadius.circular(AppRadii.lg),
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 14, 8, 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.lg),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: accent.iconBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: accent.accent, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      listing.serviceName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTheme.host(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      catTitle,
                      style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      meta,
                      style: AppTheme.host(fontSize: 12.5, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              StatusPill(
                label: listing.isActive ? 'Active' : 'Paused',
                color: listing.isActive ? AppColors.success : AppColors.textMuted,
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert_rounded, color: AppColors.textMuted, size: 20),
                onSelected: (v) {
                  if (v == 'edit') onEdit();
                  if (v == 'delete') onDelete();
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'edit', child: Text('Edit options')),
                  PopupMenuItem(value: 'delete', child: Text('Remove')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
