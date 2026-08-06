import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../data/services_catalog.dart';
import '../../theme/app_theme.dart';

class ServicesScreen extends StatelessWidget {
  const ServicesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Services')),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        itemCount: userServiceCategories.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final cat = userServiceCategories[index];
          final urgent = cat.priority == 'urgent';
          return Material(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () => context.push('/service/${cat.id}'),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: urgent ? AppColors.danger.withValues(alpha: 0.25) : AppColors.border,
                  ),
                ),
                child: Row(
                  children: [
                    Text(cat.emoji, style: const TextStyle(fontSize: 28)),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            cat.title,
                            style: AppTheme.host(fontSize: 16, fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            cat.useWhen,
                            style: AppTheme.host(fontSize: 13, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.textMuted),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
