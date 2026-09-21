import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_controller.dart';
import '../../providers/dispatch_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../widgets/connection_ui.dart';
import '../../widgets/incoming_job_card.dart';
import '../../widgets/ui.dart';

class JobsScreen extends StatefulWidget {
  const JobsScreen({super.key});

  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  String? _startedForVendor;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final dispatch = context.watch<DispatchController>();
    final vendor = auth.vendor;
    final vendorId = auth.vendorId;
    final active = dispatch.activeJob;
    final offer = dispatch.offer;
    final historyCount = dispatch.history.length;
    final idle = offer == null && active == null;

    if (vendorId != null && vendorId != _startedForVendor) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final id = context.read<AuthController>().vendorId;
        if (id == null) return;
        _startedForVendor = id;
        context.read<DispatchController>().start(id);
      });
    }

    if (auth.status == AuthStatus.unknown) {
      return const PageScaffold(
        title: 'Jobs',
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final greeting = vendor?.name.isNotEmpty == true ? vendor!.name.split(' ').first : 'Provider';
    final subtitle = idle
        ? (dispatch.offline ? 'Offline · reconnecting…' : 'Hi $greeting · listening for offers')
        : (offer != null ? 'New offer waiting' : 'Trip in progress');

    return PageScaffold(
      title: 'Jobs',
      subtitle: subtitle,
      actions: [
        SoftIconButton(
          icon: Icons.history_rounded,
          tooltip: 'History',
          onPressed: () => context.push('/jobs/history'),
        ),
        SoftIconButton(
          icon: Icons.refresh_rounded,
          tooltip: 'Refresh',
          onPressed: () => dispatch.refresh(),
        ),
        const SizedBox(width: 8),
      ],
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => dispatch.refresh(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
          children: [
            if (dispatch.offline) ...[
              OfflineBanner(onRetry: () => dispatch.refresh()),
              const SizedBox(height: 20),
            ] else if (dispatch.statusHint != null) ...[
              _SoftHint(text: dispatch.statusHint!),
              const SizedBox(height: 20),
            ],
            if (offer != null)
              IncomingJobCard(offer: offer)
                  .animate()
                  .fadeIn(duration: 380.ms)
                  .slideY(begin: 0.06)
                  .scale(begin: const Offset(0.98, 0.98), curve: Curves.easeOutCubic),
            if (offer != null && active != null) const SizedBox(height: 14),
            if (active != null)
              _ActiveTripCard(
                title: active.service,
                subtitle: active.location,
                meta: statusLabel(active.status),
                onTap: () => context.push('/trip/${active.id}'),
              ).animate().fadeIn(delay: 60.ms, duration: 380.ms).slideY(begin: 0.05),
            if (idle) ...[
              if (dispatch.loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 80),
                  child: Center(child: CircularProgressIndicator()),
                )
              else
                _ListeningHero(
                  offline: dispatch.offline,
                ).animate().fadeIn(duration: 420.ms).slideY(begin: 0.03),
              const SizedBox(height: 28),
              _HistoryEntry(
                count: historyCount,
                onTap: () => context.push('/jobs/history'),
              ).animate().fadeIn(delay: 120.ms, duration: 360.ms),
            ],
          ],
        ),
      ),
    );
  }
}

class _SoftHint extends StatelessWidget {
  const _SoftHint({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          const Icon(Icons.info_outline_rounded, size: 18, color: AppColors.textMuted),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: AppTheme.host(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

/// Primary idle composition — waiting for the next offer.
class _ListeningHero extends StatelessWidget {
  const _ListeningHero({required this.offline});

  final bool offline;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 28, 4, 8),
      child: Column(
        children: [
          SizedBox(
            width: 148,
            height: 148,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: 148,
                  height: 148,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.primary.withValues(alpha: 0.05),
                  ),
                )
                    .animate(onPlay: (c) => c.repeat(reverse: true))
                    .scale(
                      begin: const Offset(0.92, 0.92),
                      end: const Offset(1.06, 1.06),
                      duration: 2200.ms,
                      curve: Curves.easeInOut,
                    )
                    .fade(begin: 0.45, end: 0.9, duration: 2200.ms),
                Container(
                  width: 108,
                  height: 108,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.primarySoft,
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.16)),
                    boxShadow: AppTheme.softShadow,
                  ),
                ),
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.surface,
                    border: Border.all(color: AppColors.border),
                    boxShadow: AppTheme.cardShadow,
                  ),
                  child: Icon(
                    offline ? Icons.wifi_off_rounded : Icons.sensors_rounded,
                    size: 30,
                    color: offline ? AppColors.warning : AppColors.primary,
                  ),
                )
                    .animate(onPlay: (c) => c.repeat(reverse: true))
                    .scale(
                      begin: const Offset(0.97, 0.97),
                      end: const Offset(1.03, 1.03),
                      duration: 1600.ms,
                      curve: Curves.easeInOut,
                    ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          Text(
            offline ? 'Waiting to reconnect' : 'Waiting for orders',
            textAlign: TextAlign.center,
            style: AppTheme.host(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              letterSpacing: -0.45,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            offline
                ? 'Stay on this screen. Offers sync automatically when you are back online.'
                : 'New job offers will appear here the moment a buyer needs your service.',
            textAlign: TextAlign.center,
            style: AppTheme.host(
              fontSize: 14.5,
              color: AppColors.textMuted,
              height: 1.5,
            ),
          ),
          if (!offline) ...[
            const SizedBox(height: 26),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.successSoft,
                borderRadius: BorderRadius.circular(AppRadii.pill),
                border: Border.all(color: AppColors.success.withValues(alpha: 0.18)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                      color: AppColors.success,
                      shape: BoxShape.circle,
                    ),
                  )
                      .animate(onPlay: (c) => c.repeat(reverse: true))
                      .fade(begin: 0.4, end: 1, duration: 900.ms),
                  const SizedBox(width: 8),
                  Text(
                    'Listening',
                    style: AppTheme.host(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.success,
                      letterSpacing: 0.2,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _HistoryEntry extends StatelessWidget {
  const _HistoryEntry({required this.count, required this.onTap});

  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 16, 14, 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadii.xl),
          border: Border.all(color: AppColors.border.withValues(alpha: 0.95)),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.surfaceMuted,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: const Icon(Icons.history_rounded, color: AppColors.textSecondary, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'History',
                    style: AppTheme.host(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    count == 0 ? 'Past jobs will show here' : '$count recent job${count == 1 ? '' : 's'}',
                    style: AppTheme.host(fontSize: 13, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 22),
          ],
        ),
      ),
    );
  }
}

class _ActiveTripCard extends StatelessWidget {
  const _ActiveTripCard({
    required this.title,
    required this.onTap,
    this.subtitle,
    this.meta,
  });

  final String title;
  final String? subtitle;
  final String? meta;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.successSoft,
          borderRadius: BorderRadius.circular(AppRadii.xl),
          border: Border.all(color: AppColors.success.withValues(alpha: 0.22)),
          boxShadow: AppTheme.softShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.surface.withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(15),
                    border: Border.all(color: AppColors.success.withValues(alpha: 0.18)),
                    boxShadow: AppTheme.cardShadow,
                  ),
                  child: const Icon(Icons.near_me_rounded, color: AppColors.success, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const StatusPill(label: 'Active trip', color: AppColors.success),
                      if (meta != null && meta!.isNotEmpty) ...[
                        const SizedBox(height: 5),
                        Text(
                          meta!,
                          style: AppTheme.host(
                            fontSize: 12,
                            color: AppColors.textMuted,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.success.withValues(alpha: 0.1),
                  ),
                  child: const Icon(Icons.arrow_forward_rounded, color: AppColors.success, size: 18),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Text(
              title,
              style: AppTheme.host(
                fontSize: 21,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
                letterSpacing: -0.4,
              ),
            ),
            if (subtitle != null && subtitle!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.place_outlined, size: 16, color: AppColors.textMuted),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      subtitle!,
                      style: AppTheme.host(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 16),
            Text(
              'Open trip',
              style: AppTheme.host(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.success),
            ),
          ],
        ),
      ),
    );
  }
}
