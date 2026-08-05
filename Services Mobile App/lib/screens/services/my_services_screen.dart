import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
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

    return PageScaffold(
      title: 'Services',
      subtitle: _listings.isEmpty ? 'What you offer' : '$activeCount active listing${activeCount == 1 ? '' : 's'}',
      actions: [
        IconButton(
          onPressed: _saving ? null : _openCatalogPicker,
          icon: _saving
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.add_rounded),
          tooltip: 'Manage services',
        ),
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
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
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
                        : ListView(
                            padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                            children: [
                              if (_offline) ...[
                                OfflineBanner(onRetry: _load),
                                const SizedBox(height: 14),
                              ],
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: const Color(0xFFBFDBFE)),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.touch_app_outlined, size: 18, color: AppColors.primary.withValues(alpha: 0.9)),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        'Tap + to select services you offer. Prices are set by MyGarage.',
                                        style: AppTheme.host(
                                          fontSize: 12.5,
                                          color: AppColors.primaryDeep,
                                          height: 1.35,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ).animate().fadeIn(duration: 300.ms),
                              const SizedBox(height: 12),
                              OutlinedButton.icon(
                                onPressed: _saving ? null : _openCatalogPicker,
                                icon: const Icon(Icons.checklist_rounded, size: 18),
                                label: const Text('Manage offerings'),
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size.fromHeight(46),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                ),
                              ),
                              const SizedBox(height: 16),
                              ...List.generate(_listings.length, (i) {
                                final item = _listings[i];
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: _ServiceColorCard(
                                    listing: item,
                                    onEdit: () => _editOptions(item),
                                    onDelete: () => _delete(item),
                                  )
                                      .animate()
                                      .fadeIn(delay: (35 + i * 50).ms, duration: 360.ms)
                                      .slideY(begin: 0.05, curve: Curves.easeOutCubic),
                                );
                              }),
                            ],
                          ),
      ),
    );
  }
}

class _ServiceColorCard extends StatelessWidget {
  const _ServiceColorCard({
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

    return PressableScale(
      onTap: onEdit,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: accent.fill,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: accent.border),
          boxShadow: [
            BoxShadow(
              color: accent.accent.withOpacity(0.08),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: accent.iconBg,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: accent.border),
                  ),
                  child: Icon(icon, color: accent.accent, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        catTitle,
                        style: AppTheme.host(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: accent.accent,
                          letterSpacing: 0.3,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        listing.serviceName,
                        style: AppTheme.host(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.2,
                          height: 1.25,
                        ),
                      ),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  icon: Icon(Icons.more_horiz_rounded, color: accent.accent.withOpacity(0.85)),
                  onSelected: (v) {
                    if (v == 'edit') onEdit();
                    if (v == 'delete') onDelete();
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'edit', child: Text('Edit')),
                    PopupMenuItem(value: 'delete', child: Text('Delete')),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _Chip(
                  label: formatUgx(listing.priceUgx),
                  color: accent.accent,
                  bg: Colors.white.withOpacity(0.75),
                  bold: true,
                ),
                if (listing.etaMinutes != null)
                  _Chip(
                    label: '${listing.etaMinutes} min',
                    color: AppColors.textSecondary,
                    bg: Colors.white.withOpacity(0.65),
                  ),
                _Chip(
                  label: listing.isActive ? 'Active' : 'Paused',
                  color: listing.isActive ? AppColors.success : AppColors.textMuted,
                  bg: Colors.white.withOpacity(0.65),
                ),
                if (listing.mobileAvailable)
                  _Chip(
                    label: 'Mobile',
                    color: accent.accent,
                    bg: Colors.white.withOpacity(0.65),
                  ),
                if (listing.emergency)
                  const _Chip(
                    label: 'Emergency',
                    color: Color(0xFFDC2626),
                    bg: Color(0xFFFFF1F2),
                  ),
              ],
            ),
            if (listing.description.trim().isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                listing.description.trim(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTheme.host(fontSize: 13, color: AppColors.textSecondary, height: 1.35),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.color,
    required this.bg,
    this.bold = false,
  });

  final String label;
  final Color color;
  final Color bg;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.16)),
      ),
      child: Text(
        label,
        style: AppTheme.host(
          fontSize: 12,
          fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
          color: color,
        ),
      ),
    );
  }
}
