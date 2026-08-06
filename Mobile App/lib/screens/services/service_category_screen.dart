import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../data/services_catalog.dart';
import '../../theme/app_theme.dart';

class ServiceCategoryScreen extends StatelessWidget {
  const ServiceCategoryScreen({super.key, required this.categoryId});

  final String categoryId;

  @override
  Widget build(BuildContext context) {
    final cat = categoryById(categoryId);
    if (cat == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Service')),
        body: const Center(child: Text('Category not found')),
      );
    }

    final money = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(title: Text(cat.title)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          Text(cat.useWhen, style: AppTheme.host(color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          ...cat.services.map((s) {
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                title: Text(s.name, style: AppTheme.host(fontWeight: FontWeight.w600)),
                subtitle: Text('From ${money.format(s.defaultPriceUgx)}'),
                trailing: const Icon(Icons.arrow_forward),
                onTap: () => context.push(
                  '/service/$categoryId/location?service=${Uri.encodeComponent(s.name)}',
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
