import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../api/api_client.dart';
import '../../models/service_listing.dart';
import '../../theme/app_theme.dart';
import '../../theme/service_accents.dart';
import '../../utils/format.dart';

/// Result of multi-select catalog management: create/update and delete ids.
class CatalogPickerResult {
  const CatalogPickerResult({
    required this.toUpsert,
    required this.toDeleteIds,
  });

  final List<ServiceListing> toUpsert;
  final List<String> toDeleteIds;

  bool get isEmpty => toUpsert.isEmpty && toDeleteIds.isEmpty;
}

/// Tap-to-select catalog of services — no free-text input.
class CatalogServicesPickerSheet extends StatefulWidget {
  const CatalogServicesPickerSheet({
    super.key,
    required this.existing,
  });

  final List<ServiceListing> existing;

  @override
  State<CatalogServicesPickerSheet> createState() => _CatalogServicesPickerSheetState();
}

class _CatalogServicesPickerSheetState extends State<CatalogServicesPickerSheet> {
  final _client = ApiClient();
  late String _categoryId;
  late final Set<String> _selected; // keys: categoryId::serviceName lower
  late final Map<String, ServiceListing> _existingByKey;
  Map<String, double> _platformPrices = {};
  bool _pricesLoading = true;

  /// Defaults applied only to newly selected listings.
  int _defaultEta = 60;
  bool _defaultMobile = true;
  bool _defaultEmergency = false;

  static const _etaPresets = [30, 45, 60, 90, 120];

  String _key(String categoryId, String serviceName) =>
      '$categoryId::${serviceName.trim().toLowerCase()}';

  @override
  void initState() {
    super.initState();
    _categoryId = kServiceCategories.first.id;
    _existingByKey = {
      for (final l in widget.existing)
        if (l.serviceName.trim().isNotEmpty) _key(l.categoryId, l.serviceName): l,
    };
    _selected = _existingByKey.keys.toSet();
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
            map[_key(cat, name)] = price;
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

  double _priceFor(String categoryId, String serviceName) {
    final k = _key(categoryId, serviceName);
    return _platformPrices[k] ?? _existingByKey[k]?.priceUgx ?? 0;
  }

  int get _selectedCount => _selected.length;

  int get _categorySelectedCount {
    final names = catalogServiceNamesFor(_categoryId);
    return names.where((n) => _selected.contains(_key(_categoryId, n))).length;
  }

  void _toggle(String categoryId, String serviceName) {
    final k = _key(categoryId, serviceName);
    setState(() {
      if (_selected.contains(k)) {
        _selected.remove(k);
      } else {
        _selected.add(k);
      }
    });
  }

  void _selectAllInCategory() {
    final names = catalogServiceNamesFor(_categoryId);
    setState(() {
      for (final n in names) {
        _selected.add(_key(_categoryId, n));
      }
    });
  }

  void _clearCategory() {
    final names = catalogServiceNamesFor(_categoryId);
    setState(() {
      for (final n in names) {
        _selected.remove(_key(_categoryId, n));
      }
    });
  }

  void _confirm() {
    final toUpsert = <ServiceListing>[];
    final toDeleteIds = <String>[];
    final keepKeys = <String>{};

    for (final key in _selected) {
      final parts = key.split('::');
      if (parts.length < 2) continue;
      final categoryId = parts.first;
      // recover case-correct name from catalog
      final nameLower = parts.sublist(1).join('::');
      String? serviceName;
      for (final n in catalogServiceNamesFor(categoryId)) {
        if (n.toLowerCase() == nameLower) {
          serviceName = n;
          break;
        }
      }
      // Legacy free-text names still selected via existing map
      final existing = _existingByKey[key];
      serviceName ??= existing?.serviceName;
      if (serviceName == null || serviceName.isEmpty) continue;

      keepKeys.add(key);
      if (existing != null) {
        // Keep existing listing as-is (no forced re-upsert of unchanged).
        continue;
      }
      final isEmergencyCategory = categoryId == 'emergency-help';
      toUpsert.add(
        ServiceListing(
          id: '',
          vendorId: '',
          categoryId: categoryId,
          serviceName: serviceName,
          priceUgx: _priceFor(categoryId, serviceName),
          status: 'active',
          etaMinutes: _defaultEta,
          description: '',
          mobileAvailable: _defaultMobile,
          emergency: _defaultEmergency || isEmergencyCategory,
        ),
      );
    }

    for (final entry in _existingByKey.entries) {
      if (!keepKeys.contains(entry.key) && entry.value.id.isNotEmpty) {
        toDeleteIds.add(entry.value.id);
      }
    }

    Navigator.of(context).pop(
      CatalogPickerResult(toUpsert: toUpsert, toDeleteIds: toDeleteIds),
    );
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final accent = accentForCategory(_categoryId);
    final names = catalogServiceNamesFor(_categoryId);
    final height = media.size.height * 0.92;

    return Container(
      height: height,
      decoration: const BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 0),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your services',
                        style: AppTheme.host(
                          fontSize: 22,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Tap to select what you offer. No typing needed.',
                        style: AppTheme.host(fontSize: 13.5, color: AppColors.textMuted, height: 1.35),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                  color: AppColors.textSecondary,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: kServiceCategories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final cat = kServiceCategories[i];
                final catAccent = accentForCategory(cat.id);
                final selected = cat.id == _categoryId;
                final count = catalogServiceNamesFor(cat.id)
                    .where((n) => _selected.contains(_key(cat.id, n)))
                    .length;
                return Material(
                  color: selected ? catAccent.accent : AppColors.surface,
                  borderRadius: BorderRadius.circular(999),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(999),
                    onTap: () => setState(() => _categoryId = cat.id),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: selected ? catAccent.accent : AppColors.border,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            iconForCategory(cat.id),
                            size: 16,
                            color: selected ? Colors.white : catAccent.accent,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            cat.title,
                            style: AppTheme.host(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: selected ? Colors.white : AppColors.textPrimary,
                            ),
                          ),
                          if (count > 0) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: selected
                                    ? Colors.white.withValues(alpha: 0.22)
                                    : catAccent.fill,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                '$count',
                                style: AppTheme.host(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: selected ? Colors.white : catAccent.accent,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    categoryTitle(_categoryId),
                    style: AppTheme.host(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: accent.accent,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: _selectAllInCategory,
                  style: TextButton.styleFrom(
                    foregroundColor: accent.accent,
                    visualDensity: VisualDensity.compact,
                  ),
                  child: const Text('Select all'),
                ),
                TextButton(
                  onPressed: _categorySelectedCount == 0 ? null : _clearCategory,
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.textMuted,
                    visualDensity: VisualDensity.compact,
                  ),
                  child: const Text('Clear'),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
              itemCount: names.length,
              itemBuilder: (context, i) {
                final name = names[i];
                final k = _key(_categoryId, name);
                final isOn = _selected.contains(k);
                final price = _priceFor(_categoryId, name);
                final alreadyListed = _existingByKey.containsKey(k);

                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Material(
                    color: isOn ? accent.fill : AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () => _toggle(_categoryId, name),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isOn ? accent.border : AppColors.border,
                            width: isOn ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              width: 26,
                              height: 26,
                              decoration: BoxDecoration(
                                color: isOn ? accent.accent : Colors.transparent,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isOn ? accent.accent : AppColors.border,
                                  width: 1.5,
                                ),
                              ),
                              child: isOn
                                  ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
                                  : null,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name,
                                    style: AppTheme.host(
                                      fontSize: 14.5,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                      height: 1.25,
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    alreadyListed
                                        ? 'Already listed'
                                        : (_pricesLoading
                                            ? 'Price loading…'
                                            : price > 0
                                                ? formatUgx(price)
                                                : 'Platform price'),
                                    style: AppTheme.host(
                                      fontSize: 12,
                                      color: alreadyListed ? accent.accent : AppColors.textMuted,
                                      fontWeight: alreadyListed ? FontWeight.w600 : FontWeight.w400,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Icon(
                              Icons.lock_outline_rounded,
                              size: 14,
                              color: AppColors.textMuted.withValues(alpha: 0.7),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                )
                    .animate()
                    .fadeIn(delay: (20 + i * 25).ms, duration: 280.ms)
                    .slideX(begin: 0.02, curve: Curves.easeOutCubic);
              },
            ),
          ),
          Container(
            padding: EdgeInsets.fromLTRB(20, 12, 20, 12 + media.padding.bottom),
            decoration: BoxDecoration(
              color: AppColors.surface,
              border: Border(top: BorderSide(color: AppColors.border.withValues(alpha: 0.9))),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0F172A).withValues(alpha: 0.05),
                  blurRadius: 16,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Defaults for newly selected',
                  style: AppTheme.host(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMuted,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final eta in _etaPresets) ...[
                        _OptionChip(
                          label: '$eta min',
                          selected: _defaultEta == eta,
                          onTap: () => setState(() => _defaultEta = eta),
                        ),
                        const SizedBox(width: 8),
                      ],
                      _OptionChip(
                        label: 'Mobile',
                        selected: _defaultMobile,
                        onTap: () => setState(() => _defaultMobile = !_defaultMobile),
                      ),
                      const SizedBox(width: 8),
                      _OptionChip(
                        label: 'Emergency',
                        selected: _defaultEmergency,
                        onTap: () => setState(() => _defaultEmergency = !_defaultEmergency),
                        activeColor: AppColors.danger,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                ElevatedButton(
                  onPressed: _confirm,
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(
                    _selectedCount == 0
                        ? 'Clear all offerings'
                        : 'Save · $_selectedCount selected',
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OptionChip extends StatelessWidget {
  const _OptionChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.activeColor = AppColors.primary,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Color activeColor;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? activeColor.withValues(alpha: 0.12) : AppColors.background,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected ? activeColor.withValues(alpha: 0.45) : AppColors.border,
            ),
          ),
          child: Text(
            label,
            style: AppTheme.host(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: selected ? activeColor : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
