import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../api/analytics_api.dart';
import '../../api/api_client.dart';
import '../../models/analytics.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/ui.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _api = AnalyticsApi(ApiClient());
  VendorAnalytics? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _api.getAnalytics(vendorId);
      if (!mounted) return;
      setState(() {
        _data = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = userFacingError(e, fallback: 'Could not load dashboard.');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    return PageScaffold(
      title: 'Dashboard',
      subtitle: 'Your shop at a glance',
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _load,
        child: _loading
            ? ListView(children: const [
                SizedBox(height: 120),
                Center(child: CircularProgressIndicator())
              ])
            : _error != null && data == null
                ? ListView(
                    children: [
                      EmptyState(
                        title: 'Could not load dashboard',
                        subtitle: _error,
                        icon: Icons.bar_chart_outlined,
                        action: OutlinedButton(
                            onPressed: _load, child: const Text('Retry')),
                      ),
                    ],
                  )
                : ListView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
                    children: [
                      _KpiGrid(data: data!),
                      const SectionLabel('REVENUE'),
                      GlassCard(
                          child: _RevenueChart(points: data.revenueTrend)),
                      const SectionLabel('ORDERS BY STATUS'),
                      GlassCard(
                          child: _StatusBreakdown(status: data.ordersByStatus)),
                      const SectionLabel('TOP PRODUCTS'),
                      if (data.topProducts.isEmpty)
                        Text('No sales yet',
                            style: AppTheme.host(
                                fontSize: 14, color: AppColors.textMuted))
                      else
                        GlassCard(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 4),
                          child: Column(
                            children: [
                              for (var i = 0;
                                  i < data.topProducts.length;
                                  i++) ...[
                                QuietRow(
                                  title: data.topProducts[i].name,
                                  subtitle:
                                      '${data.topProducts[i].sales} sold · ${formatUgx(data.topProducts[i].price)}',
                                ),
                                if (i < data.topProducts.length - 1)
                                  const Divider(height: 1),
                              ],
                            ],
                          ),
                        ),
                      const SectionLabel('QUICK ACTIONS'),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          _QuickAction(
                            icon: Icons.inventory_2_outlined,
                            label: 'Products',
                            onTap: () => context.go('/products'),
                          ),
                          _QuickAction(
                            icon: Icons.shopping_bag_outlined,
                            label: 'Orders',
                            onTap: () => context.go('/orders'),
                          ),
                          _QuickAction(
                            icon: Icons.account_balance_wallet_outlined,
                            label: 'Funds',
                            onTap: () => context.go('/funds'),
                          ),
                          _QuickAction(
                            icon: Icons.campaign_outlined,
                            label: 'Promotions',
                            onTap: () => context.go('/promotions'),
                          ),
                        ],
                      ),
                    ],
                  ),
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({required this.data});

  final VendorAnalytics data;

  @override
  Widget build(BuildContext context) {
    final tiles = [
      ('Revenue', formatUgx(data.totalRevenue), Icons.payments_outlined),
      ('Orders', '${data.totalOrders}', Icons.shopping_bag_outlined),
      ('Products', '${data.totalProducts}', Icons.inventory_2_outlined),
      (
        'Avg order',
        formatUgx(data.averageOrderValue),
        Icons.trending_up_rounded
      ),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.45,
      children: [
        for (final tile in tiles)
          GlassCard(
            highlight: tile.$1 == 'Revenue',
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(tile.$3, size: 18, color: AppColors.primary),
                const Spacer(),
                Text(tile.$1,
                    style: AppTheme.host(
                        fontSize: 12,
                        color: AppColors.textMuted,
                        fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(
                  tile.$2,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTheme.host(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.3),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 350.ms),
      ],
    );
  }
}

class _RevenueChart extends StatelessWidget {
  const _RevenueChart({required this.points});

  final List<TrendPoint> points;

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return Text('No revenue yet',
          style: AppTheme.host(fontSize: 14, color: AppColors.textMuted));
    }
    final maxY = points.fold<double>(0, (m, p) => p.value > m ? p.value : m);
    return SizedBox(
      height: 180,
      child: LineChart(
        LineChartData(
          minY: 0,
          maxY: maxY <= 0 ? 1 : maxY * 1.15,
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
          titlesData: FlTitlesData(
            topTitles:
                const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles:
                const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            leftTitles:
                const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 22,
                getTitlesWidget: (value, meta) {
                  final i = value.round();
                  if (i < 0 || i >= points.length)
                    return const SizedBox.shrink();
                  return Text(points[i].label,
                      style: AppTheme.host(
                          fontSize: 11, color: AppColors.textMuted));
                },
              ),
            ),
          ),
          lineBarsData: [
            LineChartBarData(
              spots: [
                for (var i = 0; i < points.length; i++)
                  FlSpot(i.toDouble(), points[i].value),
              ],
              isCurved: true,
              color: AppColors.primary,
              barWidth: 3,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(
                  show: true, color: AppColors.primary.withValues(alpha: 0.12)),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBreakdown extends StatelessWidget {
  const _StatusBreakdown({required this.status});

  final OrdersByStatus status;

  @override
  Widget build(BuildContext context) {
    final rows = [
      ('New', status.pending, AppColors.warning),
      ('Processing', status.processing, AppColors.primary),
      ('In transit', status.shipped, AppColors.textSecondary),
      ('Delivered', status.delivered, AppColors.success),
      ('Cancelled', status.cancelled, AppColors.danger),
    ];
    return Column(
      children: [
        for (final row in rows)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                Container(
                    width: 8,
                    height: 8,
                    decoration:
                        BoxDecoration(color: row.$3, shape: BoxShape.circle)),
                const SizedBox(width: 10),
                Expanded(
                    child: Text(row.$1,
                        style: AppTheme.host(
                            fontSize: 14, fontWeight: FontWeight.w600))),
                Text('${row.$2}',
                    style: AppTheme.host(
                        fontSize: 14, color: AppColors.textMuted)),
              ],
            ),
          ),
      ],
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction(
      {required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      onTap: onTap,
      child: Container(
        width: 88,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadii.lg),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary, size: 22),
            const SizedBox(height: 8),
            Text(label,
                style:
                    AppTheme.host(fontSize: 12, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
