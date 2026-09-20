import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';

class AppMenuItem {
  const AppMenuItem({
    required this.path,
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.selectedIcon,
  });

  final String path;
  final String label;
  final String subtitle;
  final IconData icon;
  final IconData selectedIcon;
}

const kSupplierMenuItems = <AppMenuItem>[
  AppMenuItem(
    path: '/dashboard',
    label: 'Dashboard',
    subtitle: 'Sales, orders, and performance',
    icon: Icons.bar_chart_outlined,
    selectedIcon: Icons.bar_chart_rounded,
  ),
  AppMenuItem(
    path: '/funds',
    label: 'Funds',
    subtitle: 'Balance and payouts',
    icon: Icons.account_balance_wallet_outlined,
    selectedIcon: Icons.account_balance_wallet_rounded,
  ),
  AppMenuItem(
    path: '/promotions',
    label: 'Promotions',
    subtitle: 'Campaigns and featured ads',
    icon: Icons.campaign_outlined,
    selectedIcon: Icons.campaign_rounded,
  ),
];

Future<void> showSupplierAppMenu(BuildContext context) {
  HapticFeedback.selectionClick();
  final location = GoRouterState.of(context).uri.path;
  final router = GoRouter.of(context);
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: AppColors.ink.withValues(alpha: 0.28),
    builder: (ctx) => _SupplierAppMenuSheet(
      currentPath: location,
      onSelect: (path) {
        Navigator.of(ctx).pop();
        if (location != path) router.go(path);
      },
    ),
  );
}

class _SupplierAppMenuSheet extends StatelessWidget {
  const _SupplierAppMenuSheet({
    required this.currentPath,
    required this.onSelect,
  });

  final String currentPath;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surfaceHigh,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadii.xxl)),
        boxShadow: [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 32,
            offset: Offset(0, -8),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: AppColors.borderStrong,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 4, 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Menu',
                            style: AppTheme.host(
                              fontSize: 22,
                              fontWeight: FontWeight.w600,
                              letterSpacing: -0.4,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Dashboard, funds, and promotions',
                            style: AppTheme.host(
                              fontSize: 13.5,
                              color: AppColors.textMuted,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close_rounded),
                      color: AppColors.textSecondary,
                      tooltip: 'Close',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              for (final item in kSupplierMenuItems)
                _MenuTile(
                  item: item,
                  selected: currentPath == item.path,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    onSelect(item.path);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final AppMenuItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      selected: selected,
      selectedTileColor: AppColors.primarySoft,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: selected ? AppColors.surface : AppColors.primarySoft,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          selected ? item.selectedIcon : item.icon,
          color: AppColors.primary,
          size: 20,
        ),
      ),
      title: Text(
        item.label,
        style: AppTheme.host(
            fontWeight: FontWeight.w600, color: AppColors.textPrimary),
      ),
      subtitle: Text(
        item.subtitle,
        style: AppTheme.host(
            fontSize: 13, color: AppColors.textMuted, height: 1.3),
      ),
      trailing: Icon(
        Icons.chevron_right_rounded,
        color: selected ? AppColors.primary : AppColors.textMuted,
      ),
    );
  }
}
