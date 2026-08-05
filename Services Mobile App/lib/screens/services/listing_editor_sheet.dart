import 'package:flutter/material.dart';

import '../../api/api_client.dart';
import '../../models/service_listing.dart';
import '../../theme/app_theme.dart';
import '../../theme/service_accents.dart';
import '../../utils/format.dart';

/// Edit listing options only — select / toggle, no free typing.
class ListingEditorSheet extends StatefulWidget {
  const ListingEditorSheet({super.key, required this.initial});

  final ServiceListing initial;

  @override
  State<ListingEditorSheet> createState() => _ListingEditorSheetState();
}

class _ListingEditorSheetState extends State<ListingEditorSheet> {
  static const _etaPresets = [30, 45, 60, 90, 120];

  final _client = ApiClient();
  late int? _eta;
  late String _status;
  late bool _mobile;
  late bool _emergency;
  double? _platformPrice;
  bool _pricesLoading = true;

  @override
  void initState() {
    super.initState();
    final i = widget.initial;
    _eta = i.etaMinutes ?? 60;
    _status = i.status;
    _mobile = i.mobileAvailable;
    _emergency = i.emergency;
    _loadPrice();
  }

  Future<void> _loadPrice() async {
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
      final key = '${widget.initial.categoryId}::${widget.initial.serviceName.toLowerCase()}';
      setState(() {
        _platformPrice = prices[key] ?? widget.initial.priceUgx;
        _pricesLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _platformPrice = widget.initial.priceUgx;
        _pricesLoading = false;
      });
    }
  }

  void _save() {
    final i = widget.initial;
    Navigator.of(context).pop(
      ServiceListing(
        id: i.id,
        vendorId: i.vendorId,
        categoryId: i.categoryId,
        serviceName: i.serviceName,
        priceUgx: _platformPrice ?? i.priceUgx,
        status: _status,
        etaMinutes: _eta,
        description: i.description,
        mobileAvailable: _mobile,
        emergency: _emergency,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final i = widget.initial;
    final accent = accentForCategory(i.categoryId, seed: i.serviceName.hashCode);
    final bottom = MediaQuery.of(context).padding.bottom;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadii.xxl)),
      ),
      padding: EdgeInsets.fromLTRB(20, 12, 20, 16 + bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderStrong,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Service options',
              style: AppTheme.host(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.35,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Prices are set by MyGarage. Update how you deliver this service.',
              style: AppTheme.host(fontSize: 13, color: AppColors.textMuted, height: 1.4),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [accent.fill, AppColors.surface],
                ),
                borderRadius: BorderRadius.circular(AppRadii.xl),
                border: Border.all(color: accent.border),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: accent.iconBg,
                      borderRadius: BorderRadius.circular(AppRadii.md),
                    ),
                    child: Icon(iconForCategory(i.categoryId), color: accent.accent, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          categoryTitle(i.categoryId).toUpperCase(),
                          style: AppTheme.host(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: accent.accent,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          i.serviceName,
                          style: AppTheme.host(
                            fontSize: 16.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                            height: 1.25,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.surfaceMuted,
                borderRadius: BorderRadius.circular(AppRadii.md),
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
                          style: AppTheme.host(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _pricesLoading
                              ? 'Loading…'
                              : formatUgx(_platformPrice ?? i.priceUgx),
                          style: AppTheme.host(fontSize: 18, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.lock_outline_rounded,
                    size: 18,
                    color: AppColors.textMuted.withValues(alpha: 0.9),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Typical arrival',
              style: AppTheme.host(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final eta in _etaPresets)
                  _SelectChip(
                    label: '$eta min',
                    selected: _eta == eta,
                    color: accent.accent,
                    onTap: () => setState(() => _eta = eta),
                  ),
              ],
            ),
            const SizedBox(height: 18),
            _ToggleCard(
              icon: Icons.visibility_outlined,
              title: 'Active',
              subtitle: 'Shown to customers and dispatch',
              value: _status == 'active',
              accent: AppColors.success,
              onChanged: (v) => setState(() => _status = v ? 'active' : 'paused'),
            ),
            const SizedBox(height: 10),
            _ToggleCard(
              icon: Icons.directions_car_outlined,
              title: 'Mobile service',
              subtitle: 'You can travel to the customer',
              value: _mobile,
              accent: accent.accent,
              onChanged: (v) => setState(() => _mobile = v),
            ),
            const SizedBox(height: 10),
            _ToggleCard(
              icon: Icons.emergency_outlined,
              title: 'Emergency ready',
              subtitle: 'Available for urgent jobs',
              value: _emergency,
              accent: AppColors.danger,
              onChanged: (v) => setState(() => _emergency = v),
            ),
            const SizedBox(height: 22),
            ElevatedButton(
              onPressed: _save,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Save options'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SelectChip extends StatelessWidget {
  const _SelectChip({
    required this.label,
    required this.selected,
    required this.onTap,
    required this.color,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? color : AppColors.background,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected ? color : AppColors.border,
            ),
          ),
          child: Text(
            label,
            style: AppTheme.host(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

class _ToggleCard extends StatelessWidget {
  const _ToggleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
    required this.accent,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: value ? accent.withValues(alpha: 0.06) : AppColors.background,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => onChanged(!value),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: value ? accent.withValues(alpha: 0.28) : AppColors.border,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: value ? accent.withValues(alpha: 0.12) : AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 20, color: value ? accent : AppColors.textMuted),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: AppTheme.host(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted, height: 1.3),
                    ),
                  ],
                ),
              ),
              Switch.adaptive(
                value: value,
                activeTrackColor: accent.withValues(alpha: 0.45),
                activeThumbColor: accent,
                onChanged: onChanged,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
