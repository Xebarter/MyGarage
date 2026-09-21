import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';

bool shouldShowConciergeFab(String path) {
  if (path.startsWith('/concierge')) return false;
  if (path.startsWith('/checkout')) return false;
  if (path.startsWith('/service/requesting')) return false;
  if (path.startsWith('/service/track')) return false;
  return true;
}

class ConciergeFab extends StatelessWidget {
  const ConciergeFab({super.key});

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton.extended(
      onPressed: () => context.push('/concierge'),
      backgroundColor: AppColors.primary,
      foregroundColor: AppColors.onPrimary,
      elevation: 6,
      highlightElevation: 8,
      icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
      label: Text(
        'Concierge',
        style: AppTheme.host(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: AppColors.onPrimary,
          letterSpacing: -0.2,
        ),
      ),
    );
  }
}

class ConciergeAskCard extends StatelessWidget {
  const ConciergeAskCard({super.key, this.vehicleId});

  final String? vehicleId;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.primary,
      borderRadius: BorderRadius.circular(AppRadii.lg),
      elevation: 0,
      child: InkWell(
        onTap: () {
          final id = (vehicleId ?? '').trim();
          context.push(
            id.isEmpty ? '/concierge' : '/concierge?vehicleId=${Uri.encodeComponent(id)}',
          );
        },
        borderRadius: BorderRadius.circular(AppRadii.lg),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 14, 16),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.onPrimary.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.chat_bubble_outline_rounded,
                  color: AppColors.onPrimary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Ask Concierge',
                      style: AppTheme.host(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onPrimary,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Answers, parts quotes, booking',
                      style: AppTheme.host(
                        fontSize: 13,
                        color: AppColors.onPrimary.withValues(alpha: 0.82),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.arrow_forward_rounded,
                color: AppColors.onPrimary.withValues(alpha: 0.9),
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
