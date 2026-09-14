import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/service_request.dart';
import '../../providers/dispatch_controller.dart';
import '../../theme/app_theme.dart';
import '../../theme/service_accents.dart';
import '../../utils/format.dart';
import '../../widgets/ui.dart';

class JobHistoryScreen extends StatelessWidget {
  const JobHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final dispatch = context.watch<DispatchController>();
    final jobs = dispatch.history;
    final groups = _groupByDay(jobs);

    return AmbientBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          titleSpacing: 8,
          leading: SoftIconButton(
            icon: Icons.arrow_back_rounded,
            tooltip: 'Back',
            onPressed: () => context.pop(),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'History',
                style: AppTheme.host(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.55,
                ),
              ),
              Text(
                jobs.isEmpty ? 'Past jobs' : '${jobs.length} job${jobs.length == 1 ? '' : 's'}',
                style: AppTheme.host(
                  fontSize: 13,
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          actions: [
            SoftIconButton(
              icon: Icons.refresh_rounded,
              tooltip: 'Refresh',
              onPressed: () => dispatch.refresh(),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () => dispatch.refresh(),
          child: jobs.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    EmptyState(
                      title: 'No history yet',
                      subtitle: 'Completed and past jobs will appear here once you start taking offers.',
                      icon: Icons.history_rounded,
                    ),
                  ],
                )
              : ListView.builder(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                  itemCount: groups.length,
                  itemBuilder: (context, i) {
                    final group = groups[i];
                    return Padding(
                      padding: EdgeInsets.only(bottom: i == groups.length - 1 ? 0 : 22),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(left: 4, bottom: 12),
                            child: Text(
                              group.label,
                              style: AppTheme.host(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textMuted,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          Container(
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(AppRadii.xl),
                              border: Border.all(color: AppColors.border.withValues(alpha: 0.95)),
                              boxShadow: AppTheme.cardShadow,
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: Column(
                              children: [
                                for (var j = 0; j < group.jobs.length; j++) ...[
                                  _HistoryRow(job: group.jobs[j])
                                      .animate()
                                      .fadeIn(delay: (40 + j * 40).ms, duration: 320.ms),
                                  if (j < group.jobs.length - 1)
                                    const Divider(height: 1, indent: 72),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }

  static List<_DayGroup> _groupByDay(List<ServiceRequest> jobs) {
    final map = <String, List<ServiceRequest>>{};
    final order = <String>[];
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final yesterday = DateFormat('yyyy-MM-dd').format(
      DateTime.now().subtract(const Duration(days: 1)),
    );

    for (final job in jobs) {
      final when = (job.updatedAt ?? job.completedAt ?? job.createdAt)?.toLocal();
      final key = when == null ? 'unknown' : DateFormat('yyyy-MM-dd').format(when);
      if (!map.containsKey(key)) {
        map[key] = [];
        order.add(key);
      }
      map[key]!.add(job);
    }

    return order.map((key) {
      String label;
      if (key == 'unknown') {
        label = 'EARLIER';
      } else if (key == today) {
        label = 'TODAY';
      } else if (key == yesterday) {
        label = 'YESTERDAY';
      } else {
        label = DateFormat('EEE · d MMM').format(DateTime.parse(key)).toUpperCase();
      }
      return _DayGroup(label: label, jobs: map[key]!);
    }).toList();
  }
}

class _DayGroup {
  const _DayGroup({required this.label, required this.jobs});

  final String label;
  final List<ServiceRequest> jobs;
}

class _HistoryRow extends StatelessWidget {
  const _HistoryRow({required this.job});

  final ServiceRequest job;

  @override
  Widget build(BuildContext context) {
    final color = statusColor(job.status);
    final clickable = job.isActive;
    final when = job.updatedAt ?? job.completedAt ?? job.createdAt;
    final time = when == null ? '' : DateFormat('HH:mm').format(when.toLocal());

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: clickable ? () => context.push('/trip/${job.id}') : null,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 14, 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: color.withValues(alpha: 0.14)),
                ),
                child: Icon(
                  _iconForStatus(job.status),
                  size: 20,
                  color: color,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            job.service,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTheme.host(
                              fontSize: 15.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                              letterSpacing: -0.15,
                            ),
                          ),
                        ),
                        if (time.isNotEmpty)
                          Text(
                            time,
                            style: AppTheme.host(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textMuted,
                            ),
                          ),
                      ],
                    ),
                    if (job.location.trim().isNotEmpty) ...[
                      const SizedBox(height: 5),
                      Row(
                        children: [
                          const Icon(Icons.place_outlined, size: 14, color: AppColors.textMuted),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              job.location,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTheme.host(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 8),
                    StatusPill(label: statusLabel(job.status), color: color),
                  ],
                ),
              ),
              if (clickable) ...[
                const SizedBox(width: 6),
                const Padding(
                  padding: EdgeInsets.only(top: 10),
                  child: Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  IconData _iconForStatus(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return Icons.check_rounded;
      case 'in_progress':
      case 'matched':
        return Icons.near_me_rounded;
      case 'cancelled':
      case 'canceled':
        return Icons.close_rounded;
      default:
        return Icons.work_outline_rounded;
    }
  }
}
