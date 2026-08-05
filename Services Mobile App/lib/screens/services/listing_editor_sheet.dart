import 'package:flutter/material.dart';

import '../../api/api_client.dart';
import '../../models/service_listing.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';

class ListingEditorSheet extends StatefulWidget {
  const ListingEditorSheet({super.key, this.initial});

  final ServiceListing? initial;

  @override
  State<ListingEditorSheet> createState() => _ListingEditorSheetState();
}

class _ListingEditorSheetState extends State<ListingEditorSheet> {
  late String _categoryId;
  late String _serviceName;
  late final TextEditingController _eta;
  late final TextEditingController _description;
  late String _status;
  late bool _mobile;
  late bool _emergency;
  final _formKey = GlobalKey<FormState>();

  final ApiClient _client = ApiClient();
  Map<String, double> _platformPrices = {};
  bool _pricesLoading = true;

  @override
  void initState() {
    super.initState();
    final i = widget.initial;
    _categoryId = i?.categoryId ?? kServiceCategories.first.id;
    final names = catalogServiceNamesFor(_categoryId);
    _serviceName = i?.serviceName ?? (names.isNotEmpty ? names.first : '');
    _eta = TextEditingController(text: i?.etaMinutes?.toString() ?? '');
    _description = TextEditingController(text: i?.description ?? '');
    _status = i?.status ?? 'active';
    _mobile = i?.mobileAvailable ?? true;
    _emergency = i?.emergency ?? false;
    _loadPrices();
  }

  Future<void> _loadPrices() async {
    try {
      final prices = await _client.get(
        '/api/services/catalog-prices',
        parser: (json) {
          final map = <String, double>{};
          final list = (json is Map ? json['prices'] : null) as List<dynamic>? ?? [];
          for (final raw in list) {
            if (raw is! Map) continue;
            final cat = raw['categoryId']?.toString() ?? '';
            final name = raw['serviceName']?.toString() ?? '';
            final price = (raw['priceUgx'] as num?)?.toDouble() ?? 0;
            if (cat.isEmpty || name.isEmpty) continue;
            map['$cat::${name.toLowerCase()}'] = price;
          }
          return map;
        },
      );
      if (!mounted) return;
      setState(() {
        _platformPrices = prices;
        _pricesLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _pricesLoading = false);
    }
  }

  double get _platformPrice {
    final key = '$_categoryId::${_serviceName.toLowerCase()}';
    final hit = _platformPrices[key];
    if (hit != null) return hit;
    // Fall back to existing listing amount while prices load.
    return widget.initial?.priceUgx ?? 0;
  }

  @override
  void dispose() {
    _eta.dispose();
    _description.dispose();
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    if (_serviceName.trim().isEmpty) return;
    Navigator.of(context).pop(
      ServiceListing(
        id: widget.initial?.id ?? '',
        vendorId: widget.initial?.vendorId ?? '',
        categoryId: _categoryId,
        serviceName: _serviceName.trim(),
        // Server forces admin price; keep a local value for display.
        priceUgx: _platformPrice,
        status: _status,
        etaMinutes: int.tryParse(_eta.text.trim()),
        description: _description.text.trim(),
        mobileAvailable: _mobile,
        emergency: _emergency,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final nameOptions = catalogServiceNamesFor(_categoryId);
    if (_serviceName.isNotEmpty && !nameOptions.contains(_serviceName) && nameOptions.isNotEmpty) {
      // Keep free-text legacy names visible in the dropdown.
    }

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(
        24,
        12,
        24,
        20 + MediaQuery.of(context).viewInsets.bottom + MediaQuery.of(context).padding.bottom,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                widget.initial == null ? 'Add service' : 'Edit service',
                style: AppTheme.host(fontSize: 22, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                'Prices are set by MyGarage admin and cannot be changed.',
                style: AppTheme.host(fontSize: 13, color: AppColors.textMuted, height: 1.35),
              ),
              const SizedBox(height: 20),
              DropdownButtonFormField<String>(
                value: _categoryId,
                decoration: const InputDecoration(labelText: 'Category'),
                items: [
                  for (final c in kServiceCategories)
                    DropdownMenuItem(value: c.id, child: Text(c.title)),
                ],
                onChanged: (v) {
                  final next = v ?? _categoryId;
                  final names = catalogServiceNamesFor(next);
                  setState(() {
                    _categoryId = next;
                    if (!names.contains(_serviceName)) {
                      _serviceName = names.isNotEmpty ? names.first : '';
                    }
                  });
                },
              ),
              DropdownButtonFormField<String>(
                value: nameOptions.contains(_serviceName)
                    ? _serviceName
                    : (_serviceName.isNotEmpty ? _serviceName : null),
                decoration: const InputDecoration(labelText: 'Service'),
                items: [
                  if (_serviceName.isNotEmpty && !nameOptions.contains(_serviceName))
                    DropdownMenuItem(value: _serviceName, child: Text(_serviceName)),
                  for (final name in nameOptions)
                    DropdownMenuItem(value: name, child: Text(name)),
                ],
                onChanged: (v) => setState(() => _serviceName = v ?? _serviceName),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.borderSoft,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Platform price',
                            style: AppTheme.host(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _pricesLoading ? 'Loading…' : formatUgx(_platformPrice),
                            style: AppTheme.host(fontSize: 18, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.lock_outline_rounded, size: 18, color: AppColors.textMuted.withValues(alpha: 0.9)),
                  ],
                ),
              ),
              TextFormField(
                controller: _eta,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'ETA (minutes)'),
              ),
              TextFormField(
                controller: _description,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Notes'),
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Active', style: AppTheme.host(fontSize: 15)),
                value: _status == 'active',
                onChanged: (v) => setState(() => _status = v ? 'active' : 'paused'),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Mobile available', style: AppTheme.host(fontSize: 15)),
                value: _mobile,
                onChanged: (v) => setState(() => _mobile = v),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Emergency', style: AppTheme.host(fontSize: 15)),
                value: _emergency,
                onChanged: (v) => setState(() => _emergency = v),
              ),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _save, child: const Text('Save')),
            ],
          ),
        ),
      ),
    );
  }
}
