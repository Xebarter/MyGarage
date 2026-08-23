import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../models/buyer_control_center.dart';
import '../../providers/auth_controller.dart';
import '../../router/app_router.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/app_brand_logo.dart';

mixin _CustomerListMixin<T extends StatefulWidget> on State<T> {
  final api = BuyerApi(ApiClient());
  bool loading = true;
  String? error;

  Future<void> guardedLoad(Future<void> Function(String id) load) async {
    final ok = await ensureSignedIn(context);
    if (!ok || !mounted) return;
    final id = context.read<AuthController>().customerId;
    if (id == null) {
      setState(() {
        loading = false;
        error = 'Sign in required';
      });
      return;
    }
    setState(() {
      loading = true;
      error = null;
    });
    try {
      await load(id);
      if (mounted) setState(() => loading = false);
    } catch (e) {
      if (mounted) {
        setState(() {
          loading = false;
          error = userFacingError(e, fallback: 'Load failed');
        });
      }
    }
  }
}

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> with _CustomerListMixin {
  List<BuyerAddress> _items = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() => guardedLoad((id) async {
        _items = await api.listAddresses(customerId: id);
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const AppBarTitle('Addresses')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showEditor(),
        child: const Icon(Icons.add),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(
                          children: [
                            SizedBox(
                              height: MediaQuery.sizeOf(context).height * 0.4,
                              child: Center(
                                child: Text(
                                  'No saved addresses',
                                  style: AppTheme.host(color: AppColors.textMuted),
                                ),
                              ),
                            ),
                          ],
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
                          itemCount: _items.length,
                          itemBuilder: (context, i) {
                            final a = _items[i];
                            return Card(
                              child: ListTile(
                                title: Text(
                                  a.label.isEmpty ? 'Address' : a.label,
                                  style: AppTheme.host(fontWeight: FontWeight.w700),
                                ),
                                subtitle: Text(a.fullAddress),
                                trailing: a.isDefault
                                    ? Chip(
                                        label: Text('Default', style: AppTheme.host(fontSize: 11)),
                                        visualDensity: VisualDensity.compact,
                                        backgroundColor: AppColors.primarySoft,
                                        side: BorderSide.none,
                                      )
                                    : PopupMenuButton<String>(
                                        onSelected: (v) async {
                                          final id = context.read<AuthController>().customerId!;
                                          if (v == 'default') {
                                            await api.setDefaultAddress(id: a.id, customerId: id);
                                          } else if (v == 'delete') {
                                            await api.deleteAddress(a.id);
                                          }
                                          await _load();
                                        },
                                        itemBuilder: (_) => const [
                                          PopupMenuItem(value: 'default', child: Text('Make default')),
                                          PopupMenuItem(value: 'delete', child: Text('Delete')),
                                        ],
                                      ),
                              ),
                            );
                          },
                        ),
                ),
    );
  }

  Future<void> _showEditor() async {
    final label = TextEditingController();
    final address = TextEditingController();
    var isDefault = false;
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.viewInsetsOf(ctx).bottom + 16),
          child: StatefulBuilder(
            builder: (ctx, setModal) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Add address', style: AppTheme.host(fontSize: 17, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  TextField(controller: label, decoration: const InputDecoration(labelText: 'Label (Home)')),
                  const SizedBox(height: 8),
                  TextField(
                    controller: address,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Full address'),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Set as default'),
                    value: isDefault,
                    onChanged: (v) => setModal(() => isDefault = v),
                  ),
                  FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('Save'),
                  ),
                ],
              );
            },
          ),
        );
      },
    );
    if (ok != true || !mounted) return;
    final id = context.read<AuthController>().customerId!;
    await api.createAddress(
      customerId: id,
      label: label.text.trim().isEmpty ? 'Home' : label.text.trim(),
      fullAddress: address.text.trim(),
      isDefault: isDefault,
    );
    await _load();
  }
}

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> with _CustomerListMixin {
  List<WishlistItem> _items = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() => guardedLoad((id) async {
        _items = await api.listWishlist(customerId: id);
      });

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);
    return Scaffold(
      appBar: AppBar(title: const AppBarTitle('Wishlist')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(
                          children: [
                            SizedBox(
                              height: MediaQuery.sizeOf(context).height * 0.4,
                              child: Center(
                                child: Text(
                                  'Your wishlist is empty',
                                  style: AppTheme.host(color: AppColors.textMuted),
                                ),
                              ),
                            ),
                          ],
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                          itemCount: _items.length,
                          itemBuilder: (context, i) {
                            final w = _items[i];
                            return Card(
                              child: ListTile(
                                leading: w.imageUrl != null && w.imageUrl!.isNotEmpty
                                    ? ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Image.network(
                                          w.imageUrl!,
                                          width: 48,
                                          height: 48,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) => const Icon(Icons.image),
                                        ),
                                      )
                                    : const Icon(Icons.favorite_border),
                                title: Text(w.productName, style: AppTheme.host(fontWeight: FontWeight.w600)),
                                subtitle: Text(
                                  [
                                    if (w.categorySnapshot.isNotEmpty) w.categorySnapshot,
                                    money.format(w.priceSnapshot),
                                  ].join(' · '),
                                ),
                                trailing: IconButton(
                                  icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                                  onPressed: () async {
                                    await api.deleteWishlistItem(w.id);
                                    await _load();
                                  },
                                ),
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> with _CustomerListMixin {
  List<SupportTicket> _items = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() => guardedLoad((id) async {
        _items = await api.listSupportTickets(customerId: id);
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const AppBarTitle('Support')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createTicket,
        icon: const Icon(Icons.add),
        label: const Text('New ticket'),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                    children: [
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(AppRadii.md),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Contact MyGarage', style: AppTheme.host(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 6),
                            Text('support@mygarage.ug', style: AppTheme.host(fontSize: 13.5)),
                            Text('+256 support line', style: AppTheme.host(fontSize: 13.5, color: AppColors.textMuted)),
                            Text('Hours: Mon–Sat 8am–6pm', style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (_items.isEmpty)
                        Text('No tickets yet', style: AppTheme.host(color: AppColors.textMuted))
                      else
                        ..._items.map(
                          (t) => Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              title: Text(t.subject, style: AppTheme.host(fontWeight: FontWeight.w600)),
                              subtitle: Text('${t.status} · ${t.priority}\n${t.message}', maxLines: 3),
                              isThreeLine: true,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
    );
  }

  Future<void> _createTicket() async {
    final subject = TextEditingController();
    final message = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.viewInsetsOf(ctx).bottom + 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('New support ticket', style: AppTheme.host(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            TextField(controller: subject, decoration: const InputDecoration(labelText: 'Subject')),
            const SizedBox(height: 8),
            TextField(
              controller: message,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Message'),
            ),
            const SizedBox(height: 12),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Submit')),
          ],
        ),
      ),
    );
    if (ok != true || !mounted) return;
    final id = context.read<AuthController>().customerId!;
    await api.createSupportTicket(
      customerId: id,
      subject: subject.text.trim(),
      message: message.text.trim(),
    );
    await _load();
  }
}
