import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../models/service_request.dart';
import '../../providers/auth_controller.dart';
import '../../providers/dispatch_controller.dart';
import '../../theme/app_theme.dart';
import '../../theme/service_accents.dart';
import '../../utils/format.dart';
import '../../widgets/connection_ui.dart';
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
    final recent = dispatch.history.take(12).toList();

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

    return PageScaffold(
      title: 'Jobs',
      subtitle: 'Hi $greeting',
      actions: [
        IconButton(
          onPressed: () => dispatch.refresh(),
          icon: dispatch.loading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.refresh_rounded, size: 22),
          tooltip: 'Refresh',
        ),
      ],
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => dispatch.refresh(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 40),
          children: [
            if (dispatch.offline) ...[
              OfflineBanner(onRetry: () => dispatch.refresh()),
              const SizedBox(height: 16),
            ] else if (dispatch.statusHint != null) ...[
              _SoftHint(text: dispatch.statusHint!),
              const SizedBox(height: 16),
            ],
            _OverviewStrip(
              offerCount: offer != null ? 1 : 0,
              activeCount: active != null ? 1 : 0,
              recentCount: recent.length,
            ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.04),
            const SizedBox(height: 18),
            if (offer != null)
              _JobHeroCard(
                badge: 'New offer',
                badgeColor: AppColors.primary,
                title: offer.request?.service ?? 'Incoming request',
                subtitle: offer.request?.location,
                meta: offer.request?.category,
                cta: 'Review offer',
                icon: Icons.notifications_active_rounded,
                tint: const Color(0xFFEFF6FF),
                border: const Color(0xFFBFDBFE),
                onTap: () => dispatch.refresh(),
              ).animate().fadeIn(duration: 380.ms).slideY(begin: 0.06).scale(
                    begin: const Offset(0.98, 0.98),
                    curve: Curves.easeOutCubic,
                  ),
            if (offer != null && active != null) const SizedBox(height: 12),
            if (active != null)
              _JobHeroCard(
                badge: 'Active trip',
                badgeColor: AppColors.success,
                title: active.service,
                subtitle: active.location,
                meta: statusLabel(active.status),
                cta: 'Open trip',
                icon: Icons.near_me_rounded,
                tint: const Color(0xFFECFDF5),
                border: const Color(0xFFA7F3D0),
                onTap: () => context.push('/trip/${active.id}'),
              ).animate().fadeIn(delay: 60.ms, duration: 380.ms).slideY(begin: 0.05),
            if (offer == null && active == null && recent.isEmpty) ...[
              if (dispatch.loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 48),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (dispatch.offline)
                const AnimatedWaitingState(
                  title: 'Jobs will appear here',
                  subtitle: 'Stay on this screen. When you are back online, offers sync automatically.',
                )
              else
                const AnimatedWaitingState(),
            ],
            if (recent.isNotEmpty) ...[
              const SizedBox(height: 8),
              const SectionLabel('RECENT ACTIVITY'),
              ...List.generate(recent.length, (i) {
                final job = recent[i];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _RecentJobTile(job: job)
                      .animate()
                      .fadeIn(delay: (40 + i * 45).ms, duration: 320.ms)
                      .slideX(begin: 0.03, curve: Curves.easeOutCubic),
                );
              }),
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

class _OverviewStrip extends StatelessWidget {
  const _OverviewStrip({
    required this.offerCount,
    required this.activeCount,
    required this.recentCount,
  });

  final int offerCount;
  final int activeCount;
  final int recentCount;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatChip(
            label: 'Offers',
            value: '$offerCount',
            color: AppColors.primary,
            fill: const Color(0xFFEFF6FF),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatChip(
            label: 'Active',
            value: '$activeCount',
            color: AppColors.success,
            fill: const Color(0xFFECFDF5),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatChip(
            label: 'Recent',
            value: '$recentCount',
            color: const Color(0xFF7C3AED),
            fill: const Color(0xFFF5F3FF),
          ),
        ),
      ],
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.label,
    required this.value,
    required this.color,
    required this.fill,
  });

  final String label;
  final String value;
  final Color color;
  final Color fill;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: fill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: AppTheme.host(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: color,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTheme.host(fontSize: 12, fontWeight: FontWeight.w500, color: color.withOpacity(0.85)),
          ),
        ],
      ),
    );
  }
}

class _JobHeroCard extends StatelessWidget {
  const _JobHeroCard({
    required this.badge,
    required this.badgeColor,
    required this.title,
    required this.cta,
    required this.onTap,
    required this.icon,
    required this.tint,
    required this.border,
    this.subtitle,
    this.meta,
  });

  final String badge;
  final Color badgeColor;
  final String title;
  final String? subtitle;
  final String? meta;
  final String cta;
  final VoidCallback onTap;
  final IconData icon;
  final Color tint;
  final Color border;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: border),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [tint, AppColors.surface],
          ),
          boxShadow: AppTheme.softShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: badgeColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, color: badgeColor, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      StatusPill(label: badge, color: badgeColor),
                      if (meta != null && meta!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          meta!,
                          style: AppTheme.host(fontSize: 12, color: AppColors.textMuted),
                        ),
                      ],
                    ],
                  ),
                ),
                Icon(Icons.arrow_forward_rounded, color: badgeColor.withOpacity(0.8), size: 20),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: AppTheme.host(
                fontSize: 21,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
                letterSpacing: -0.35,
              ),
            ),
            if (subtitle != null && subtitle!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.place_outlined, size: 16, color: AppColors.textMuted),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      subtitle!,
                      style: AppTheme.host(fontSize: 14, color: AppColors.textSecondary, height: 1.35),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 16),
            Text(
              cta,
              style: AppTheme.host(fontSize: 14, fontWeight: FontWeight.w600, color: badgeColor),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecentJobTile extends StatelessWidget {
  const _RecentJobTile({required this.job});

  final ServiceRequest job;

  @override
  Widget build(BuildContext context) {
    final color = statusColor(job.status);
    final clickable = job.isActive;

    return PressableScale(
      onTap: clickable ? () => context.push('/trip/${job.id}') : () {},
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withOpacity(0.03),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    job.service,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTheme.host(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${statusLabel(job.status)} · ${formatDateTime(job.updatedAt ?? job.createdAt)}',
                    style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            if (clickable)
              const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20)
            else
              StatusPill(label: statusLabel(job.status), color: color),
          ],
        ),
      ),
    );
  }
}
