import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../models/service_request.dart';
import '../../providers/auth_controller.dart';
import '../../providers/dispatch_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../widgets/ui.dart';
import 'offer_sheet.dart';

class JobsScreen extends StatefulWidget {
  const JobsScreen({super.key});

  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  String? _presentedOfferId;
  DispatchController? _dispatch;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final vendorId = context.read<AuthController>().vendorId;
      _dispatch = context.read<DispatchController>();
      _dispatch!.addListener(_onDispatchChanged);
      if (vendorId != null) _dispatch!.start(vendorId);
    });
  }

  @override
  void dispose() {
    _dispatch?.removeListener(_onDispatchChanged);
    super.dispose();
  }

  void _onDispatchChanged() {
    final offer = _dispatch?.offer;
    if (offer != null && offer.assignmentId != _presentedOfferId) {
      _presentedOfferId = offer.assignmentId;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _dispatch?.offer?.assignmentId == offer.assignmentId) {
          _showOffer(offer);
        }
      });
    }
    if (offer == null) _presentedOfferId = null;
  }

  Future<void> _showOffer(DispatchOffer offer) async {
    final action = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => OfferSheet(offer: offer),
    );
    if (action == null || !mounted) return;
    try {
      await context.read<DispatchController>().respondToOffer(action);
      if (!mounted) return;
      if (action == 'accept') {
        final job = context.read<DispatchController>().activeJob;
        if (job != null) context.push('/trip/${job.id}');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final dispatch = context.watch<DispatchController>();
    final vendor = context.watch<AuthController>().vendor;
    final active = dispatch.activeJob;
    final offer = dispatch.offer;
    final recent = dispatch.history.take(12).toList();

    return PageScaffold(
      title: 'Jobs',
      subtitle: vendor?.name.isNotEmpty == true ? vendor!.name : 'Provider',
      actions: [
        IconButton(
          onPressed: () => dispatch.refresh(),
          icon: const Icon(Icons.refresh_rounded, size: 22),
          tooltip: 'Refresh',
        ),
      ],
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => dispatch.refresh(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
          children: [
            if (dispatch.errorMessage != null) ...[
              GlassCard(
                padding: const EdgeInsets.all(14),
                child: Text(
                  dispatch.errorMessage!,
                  style: AppTheme.host(fontSize: 13, color: AppColors.danger, height: 1.4),
                ),
              ),
              const SizedBox(height: 16),
            ],
            if (offer != null)
              _HeroJobCard(
                label: 'New offer',
                title: offer.request?.service ?? 'Incoming request',
                subtitle: offer.request?.location,
                cta: 'Review offer',
                highlight: true,
                onTap: () => _showOffer(offer),
              ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.05),
            if (offer != null && active != null) const SizedBox(height: 14),
            if (active != null)
              _HeroJobCard(
                label: 'Active trip',
                title: active.service,
                subtitle: active.location,
                cta: 'Continue',
                onTap: () => context.push('/trip/${active.id}'),
              ).animate().fadeIn(delay: 60.ms, duration: 350.ms).slideY(begin: 0.05),
            if (offer == null && active == null && !dispatch.loading && recent.isEmpty)
              const EmptyState(
                title: 'Waiting for jobs',
                subtitle: 'When buyers request your services, offers appear here instantly.',
                icon: Icons.route_outlined,
              ),
            if (recent.isNotEmpty) ...[
              const SectionLabel('RECENT'),
              GlassCard(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Column(
                  children: [
                    for (var i = 0; i < recent.length; i++) ...[
                      QuietRow(
                        title: recent[i].service,
                        subtitle:
                            '${statusLabel(recent[i].status)} · ${formatDateTime(recent[i].updatedAt ?? recent[i].createdAt)}',
                        onTap: recent[i].isActive ? () => context.push('/trip/${recent[i].id}') : null,
                        trailing: recent[i].isActive
                            ? const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20)
                            : StatusPill(
                                label: statusLabel(recent[i].status),
                                color: recent[i].status == 'completed'
                                    ? AppColors.success
                                    : AppColors.textMuted,
                              ),
                      ),
                      if (i < recent.length - 1) const Divider(height: 1),
                    ],
                  ],
                ),
              ).animate().fadeIn(delay: 100.ms, duration: 400.ms),
            ],
          ],
        ),
      ),
    );
  }
}

class _HeroJobCard extends StatelessWidget {
  const _HeroJobCard({
    required this.label,
    required this.title,
    required this.cta,
    required this.onTap,
    this.subtitle,
    this.highlight = false,
  });

  final String label;
  final String title;
  final String? subtitle;
  final String cta;
  final VoidCallback onTap;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      highlight: highlight,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StatusPill(
                label: label,
                color: highlight ? AppColors.primary : AppColors.success,
              ),
              const Spacer(),
              Icon(
                Icons.arrow_outward_rounded,
                size: 18,
                color: highlight ? AppColors.primary : AppColors.textMuted,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: AppTheme.host(
              fontSize: 22,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
              letterSpacing: -0.3,
            ),
          ),
          if (subtitle != null && subtitle!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              subtitle!,
              style: AppTheme.host(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
            ),
          ],
          const SizedBox(height: 18),
          Text(
            cta,
            style: AppTheme.host(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.primary),
          ),
        ],
      ),
    );
  }
}
