import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/listings_api.dart';
import '../../models/service_listing.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../widgets/ui.dart';
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
        _listings = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  Future<void> _edit([ServiceListing? existing]) async {
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null) return;
    final draft = await showModalBottomSheet<ServiceListing>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ListingEditorSheet(initial: existing),
    );
    if (draft == null || !mounted) return;
    try {
      await _api.upsert(vendorId: vendorId, listings: [draft]);
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _delete(ServiceListing listing) async {
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete service?'),
        content: Text('Remove “${listing.serviceName}”.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _api.delete(vendorId: vendorId, listingId: listing.id);
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return PageScaffold(
      title: 'Services',
      actions: [
        IconButton(
          onPressed: () => _edit(),
          icon: const Icon(Icons.add_rounded),
          tooltip: 'Add',
        ),
      ],
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? ListView(children: const [SizedBox(height: 120), Center(child: CircularProgressIndicator())])
            : _error != null
                ? ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      Text(_error!, style: AppTheme.host(color: AppColors.danger)),
                      const SizedBox(height: 16),
                      OutlinedButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  )
                : _listings.isEmpty
                    ? ListView(
                        children: [
                          EmptyState(
                            title: 'No services listed',
                            subtitle: 'Add what you offer so dispatch can match you to jobs.',
                            icon: Icons.handyman_outlined,
                            action: TextButton(
                              onPressed: () => _edit(),
                              child: const Text('Add a service'),
                            ),
                          ),
                        ],
                      )
                    : ListView(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                        children: [
                          GlassCard(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            child: Column(
                              children: [
                                for (var i = 0; i < _listings.length; i++) ...[
                                  Builder(
                                    builder: (context) {
                                      final item = _listings[i];
                                      final meta = [
                                        formatUgx(item.priceUgx),
                                        if (item.etaMinutes != null) '${item.etaMinutes} min',
                                        if (!item.isActive) 'Paused',
                                      ].join(' · ');
                                      return QuietRow(
                                        title: item.serviceName,
                                        subtitle: meta,
                                        onTap: () => _edit(item),
                                        trailing: PopupMenuButton<String>(
                                          icon: const Icon(Icons.more_horiz_rounded, color: AppColors.textMuted),
                                          onSelected: (v) {
                                            if (v == 'edit') _edit(item);
                                            if (v == 'delete') _delete(item);
                                          },
                                          itemBuilder: (_) => const [
                                            PopupMenuItem(value: 'edit', child: Text('Edit')),
                                            PopupMenuItem(value: 'delete', child: Text('Delete')),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                                  if (i < _listings.length - 1) const Divider(height: 1),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
      ),
    );
  }
}
