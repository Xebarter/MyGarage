import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../theme/app_theme.dart';

/// Animated offline / connection banner — no raw exception text.
class OfflineBanner extends StatelessWidget {
  const OfflineBanner({
    super.key,
    this.message = 'You are offline. Jobs will refresh when connection returns.',
    this.onRetry,
  });

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
      decoration: BoxDecoration(
        color: AppColors.warningSoft,
        borderRadius: BorderRadius.circular(AppRadii.lg),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.22)),
        boxShadow: [
          BoxShadow(
            color: AppColors.warning.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.surface.withValues(alpha: 0.7),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(Icons.wifi_off_rounded, color: AppColors.warning, size: 22),
          )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .fade(begin: 0.55, end: 1, duration: 1100.ms)
              .scale(begin: const Offset(0.96, 0.96), end: const Offset(1, 1), duration: 1100.ms),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "You're offline",
                  style: AppTheme.host(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.warning,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  message,
                  style: AppTheme.host(
                    fontSize: 12.5,
                    color: AppColors.textSecondary,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          if (onRetry != null) ...[
            const SizedBox(width: 8),
            TextButton(
              onPressed: onRetry,
              style: TextButton.styleFrom(
                foregroundColor: AppColors.warning,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              ),
              child: const Text('Retry'),
            ),
          ],
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 320.ms)
        .slideY(begin: -0.08, curve: Curves.easeOutCubic);
  }
}

/// Soft empty waiting state with a gentle pulse (used on Jobs).
class AnimatedWaitingState extends StatelessWidget {
  const AnimatedWaitingState({
    super.key,
    this.title = 'Waiting for jobs',
    this.subtitle = 'Offers appear here when buyers need your services.',
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 40),
      child: Column(
        children: [
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.primary.withValues(alpha: 0.14),
                  AppColors.primary.withValues(alpha: 0.04),
                ],
              ),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.14)),
              boxShadow: AppTheme.cardShadow,
            ),
            child: Icon(Icons.route_rounded, size: 38, color: AppColors.primary.withValues(alpha: 0.95)),
          )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scale(
                begin: const Offset(0.94, 0.94),
                end: const Offset(1.04, 1.04),
                duration: 1600.ms,
                curve: Curves.easeInOut,
              )
              .fade(begin: 0.8, end: 1, duration: 1600.ms),
          const SizedBox(height: 24),
          Text(
            title,
            textAlign: TextAlign.center,
            style: AppTheme.host(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              letterSpacing: -0.35,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: AppTheme.host(fontSize: 14, color: AppColors.textMuted, height: 1.5),
          ),
          const SizedBox(height: 22),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(3, (i) {
              return Container(
                width: 7,
                height: 7,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.9),
                  shape: BoxShape.circle,
                ),
              )
                  .animate(onPlay: (c) => c.repeat())
                  .fade(
                    begin: 0.25,
                    end: 1,
                    delay: (i * 180).ms,
                    duration: 700.ms,
                  )
                  .then()
                  .fade(begin: 1, end: 0.25, duration: 700.ms);
            }),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.04);
  }
}
